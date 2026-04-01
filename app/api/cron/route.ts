import urls from "@/config/urls.json";
import { createAsanaTask } from "@/lib/asana";
import { saveHistoryRun, saveLatestRun, pruneHistory } from "@/lib/blob";
import { pushMetricsToGrafana } from "@/lib/grafana";
import { getPsiMetrics } from "@/lib/psi";
import { findIssues } from "@/lib/thresholds";
import type { CheckResult, RunSummary, Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  return bearer && bearer === process.env.CRON_SECRET;
}

async function runChecks(): Promise<RunSummary> {
  const strategies: Strategy[] = ["mobile", "desktop"];
  const generatedAt = new Date().toISOString();
  const runId = `vercel-${generatedAt}`;

  const pairs = urls.flatMap((url) => strategies.map((strategy) => ({ url, strategy })));

  const settled = await Promise.allSettled(
    pairs.map(async ({ url, strategy }) => {
      const baseMetrics = await getPsiMetrics(url, strategy);
      const issues = findIssues(baseMetrics);
      const status = issues.length > 0 ? "fail" : "pass";
      return { ...baseMetrics, status, issues, checkedAt: generatedAt } as CheckResult;
    })
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

  try {
    const summary = await runChecks();
    const warnings: string[] = [];

    try {
      await saveLatestRun(summary);
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