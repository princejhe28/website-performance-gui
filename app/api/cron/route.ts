import urls from "@/config/urls.json";
import { createAsanaTask } from "@/lib/asana";
import { saveLatestBatchRun, saveHistoryRun, pruneHistory } from "@/lib/blob";
import { pushMetricsToGrafana } from "@/lib/grafana";
import { getPsiMetrics } from "@/lib/psi";
import { findIssues } from "@/lib/thresholds";
import type { CheckResult, RunSummary, Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Run at most `concurrency` promises at a time, with a pause between batches
async function runWithConcurrency<T>(
  items: (() => Promise<T>)[],
  concurrency: number,
  batchDelayMs = 2_000
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }
  return results;
}

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  return bearer && bearer === process.env.CRON_SECRET;
}

async function runChecks(strategy: Strategy, batch: number): Promise<RunSummary> {
  const generatedAt = new Date().toISOString();
  const runId = `vercel-${strategy}-${batch}-${generatedAt}`;

  const batchSize = Math.ceil(urls.length / 2);
  const batchUrls = urls.slice(batch * batchSize, (batch + 1) * batchSize);
  const pairs = batchUrls.map((url) => ({ url, strategy }));

  const settled = await runWithConcurrency(
    pairs.map(({ url, strategy }) => async () => {
      const baseMetrics = await getPsiMetrics(url, strategy);
      const issues = findIssues(baseMetrics);
      const status = issues.length > 0 ? "fail" : "pass";
      return { ...baseMetrics, status, issues, checkedAt: generatedAt } as CheckResult;
    }),
    2
  );

  const results: CheckResult[] = settled.map((outcome, i) => {
    if (outcome.status === "fulfilled") return outcome.value;
    const { url, strategy } = pairs[i];
    const parsed = new URL(url);
    return {
      url,
      hostname: parsed.hostname,
      path: parsed.pathname || "/",
      strategy,
      performanceScore: 0,
      lcpMs: 0,
      cls: 0,
      tbtMs: 0,
      status: "fail",
      issues: [outcome.reason instanceof Error ? outcome.reason.message : "Unknown PSI check error"],
      checkedAt: generatedAt,
    } as CheckResult;
  });

  let asanaTasksCreated = 0;
  await Promise.allSettled(
    results
      .filter((r) => r.status === "fail")
      .map(async (result) => {
        try {
          const created = await createAsanaTask(result);
          if (created) asanaTasksCreated += 1;
        } catch (asanaError) {
          console.error("Asana task creation failed:", asanaError);
        }
      })
  );

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return {
    runId,
    generatedAt,
    totalChecks: results.length,
    passCount,
    failCount,
    asanaTasksCreated,
    results,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const strategyParam = searchParams.get("strategy");
  const strategy: Strategy = strategyParam === "desktop" ? "desktop" : "mobile";
  const batch = searchParams.get("batch") === "1" ? 1 : 0;

  try {
    const summary = await runChecks(strategy, batch);
    const warnings: string[] = [];

    try {
      await saveLatestBatchRun(summary, strategy, batch);
      await saveHistoryRun(summary);
      await pruneHistory(20);
    } catch (err) {
      warnings.push(`Blob: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await pushMetricsToGrafana(summary);
    } catch (err) {
      warnings.push(`Grafana: ${err instanceof Error ? err.message : String(err)}`);
    }

    return Response.json({ ok: true, summary, warnings });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown cron error",
      },
      { status: 500 }
    );
  }
}