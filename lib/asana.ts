import type { CheckResult } from "@/lib/types";

function buildTaskNotes(result: CheckResult): string {
  const opportunityLines =
    result.opportunities.length > 0
      ? [
          "",
          "Opportunities:",
          ...result.opportunities.map(
            (o) => `- ${o.title} (~${Math.round(o.savingsMs / 100) / 10}s potential savings)`
          ),
        ]
      : [];

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
    ...opportunityLines,
    "",
    "Source: Automated PageSpeed Insights check via Vercel Cron.",
  ].join("\n");
}

async function hasOpenAsanaTask(
  taskName: string,
  accessToken: string,
  projectGid: string
): Promise<boolean> {
  // completed_since=now effectively returns only incomplete tasks
  let nextPage: string | null =
    `https://app.asana.com/api/1.0/tasks?project=${projectGid}&completed_since=now&opt_fields=name,completed&limit=100`;

  while (nextPage) {
    const res: Response = await fetch(nextPage, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return false;

    const json = await res.json() as { data: Array<{ name: string; completed: boolean }>; next_page: { uri: string } | null };
    const tasks: { name: string; completed: boolean }[] = json.data ?? [];

    if (tasks.some((t) => t.name === taskName && !t.completed)) return true;

    nextPage = json.next_page?.uri ?? null;
  }

  return false;
}

export async function createAsanaTask(result: CheckResult): Promise<boolean> {
  const accessToken = process.env.ASANA_ACCESS_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID;

  if (!accessToken || !projectGid) {
    console.warn("Skipping Asana task creation because ASANA_ACCESS_TOKEN or ASANA_PROJECT_GID is missing.");
    return false;
  }

  const taskName = `Website performance issue: ${result.url} (${result.strategy})`;

  // Skip if an open (incomplete) ticket already exists for this URL + strategy
  if (await hasOpenAsanaTask(taskName, accessToken, projectGid)) {
    console.log(`Skipping Asana task — open ticket already exists: ${taskName}`);
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
        name: taskName,
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