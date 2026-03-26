import { del, list, put } from "@vercel/blob";
import type { RunSummary } from "@/lib/types";

export async function saveLatestRun(summary: RunSummary) {
  await put("perf/latest.json", JSON.stringify(summary, null, 2), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function saveHistoryRun(summary: RunSummary) {
  const safeRunId = summary.runId.replace(/[^a-zA-Z0-9-_:.]/g, "-");

  await put(`perf/history/${safeRunId}.json`, JSON.stringify(summary, null, 2), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function getLatestRun(): Promise<RunSummary | null> {
  const items = await list({ prefix: "perf/latest.json" });
  const latest = items.blobs.find((b) => b.pathname === "perf/latest.json");

  if (!latest?.url) return null;

  const res = await fetch(latest.url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!res.ok) return null;

  return (await res.json()) as RunSummary;
}

export async function pruneHistory(keep = 20) {
  const items = await list({ prefix: "perf/history/" });
  const sorted = [...items.blobs].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  const stale = sorted.slice(keep);
  if (stale.length === 0) return;

  await del(stale.map((item) => item.url));
}