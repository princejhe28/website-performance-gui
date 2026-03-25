import urls from "@/config/urls.json";
import { createAsanaTask } from "@/lib/asana";
import { saveHistoryRun, saveLatestRun, pruneHistory } from "@/lib/blob";
import { pushMetricsToGrafana } from "@/lib/grafana";
import { getPsiMetrics } from "@/lib/psi";
import { findIssues } from "@/lib/thresholds";
import type { CheckResult, RunSummary, Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  return bearer && bearer === process.env.CRON_SECRET;
}

async function runChecks(): Promise<RunSummary> {
  const strategies: Strategy[] = ["mobile", "desktop"];
  const generatedAt = new Date().toISOString();
  const runId = `vercel-${generatedAt}`;

  const results: CheckResult[] = [];
  let asanaTasksCreated = 0;

  for (const url of urls) {
    for (const strategy of strategies) {
      try {
        const baseMetrics = await getPsiMetrics(url, strategy);
        const issues = findIssues(baseMetrics);
        const status = issues.length > 0 ? "fail" : "pass";

        const result: CheckResult = {
          ...baseMetrics,
          status,
          issues,
          checkedAt: generatedAt,
        };

        results.push(result);

        if (status === "fail") {
          const created = await createAsanaTask(result);
          if (created) asanaTasksCreated += 1;
        }
      } catch (error) {
        const parsed = new URL(url);

        const fallback: CheckResult = {
          url,
          hostname: parsed.hostname,
          path: parsed.pathname || "/",
          strategy,
          performanceScore: 0,
          lcpMs: 0,
          cls: 0,
          tbtMs: 0,
          status: "fail",
          issues: [error instanceof Error ? error.message : "Unknown PSI check error"],
          checkedAt: generatedAt,
        };

        results.push(fallback);

        const created = await createAsanaTask(fallback);
        if (created) asanaTasksCreated += 1;
      }
    }
  }

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
    await saveLatestRun(summary);
    await saveHistoryRun(summary);
    await pruneHistory(20);
    await pushMetricsToGrafana(summary);

    return Response.json({ ok: true, summary });
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