import type { CheckResult } from "@/lib/types";

function buildTaskNotes(result: CheckResult): string {
  return [
    `URL: ${result.url}`,
    `Strategy: ${result.strategy}`,
    "",
    "Metrics:",
    `- Performance Score: ${result.performanceScore}`,
    `- LCP: ${Math.round(result.lcpMs)}ms`,
    `- CLS: ${result.cls}`,
    `- TBT: ${Math.round(result.tbtMs)}ms`,
    "",
    "Threshold breaches:",
    ...result.issues.map((issue) => `- ${issue}`),
    "",
    "Source: Automated PageSpeed Insights check via Vercel Cron.",
  ].join("\n");
}

export async function createAsanaTask(result: CheckResult): Promise<boolean> {
  const accessToken = process.env.ASANA_ACCESS_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID;

  if (!accessToken || !projectGid) {
    console.warn("Skipping Asana task creation because ASANA_ACCESS_TOKEN or ASANA_PROJECT_GID is missing.");
    return false;
  }

  const res = await fetch("https://app.asana.com/api/1.0/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        name: `Website performance issue: ${result.url} (${result.strategy})`,
        notes: buildTaskNotes(result),
        projects: [projectGid],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Asana task: ${res.status} ${text}`);
  }

  return true;
}