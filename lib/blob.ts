import { del, list, put } from "@vercel/blob";
import type { CheckResult, RunSummary, Strategy } from "@/lib/types";

export type HistoryEntry = {
  runId: string;
  generatedAt: string;
  result: CheckResult;
};

export async function getHistoryForHostname(hostname: string): Promise<HistoryEntry[]> {
  const items = await list({ prefix: "perf/history/" });
  const sorted = [...items.blobs].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );

  const entries: HistoryEntry[] = [];

  await Promise.all(
    sorted.map(async (blob) => {
      const res = await fetch(blob.url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (!res.ok) return;

      const summary = (await res.json()) as RunSummary;
      const matching = summary.results.filter((r) => r.hostname === hostname);
      matching.forEach((result) =>
        entries.push({ runId: summary.runId, generatedAt: summary.generatedAt, result })
      );
    })
  );

  // Sort oldest → newest for the chart
  return entries.sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );
}

export async function saveLatestBatchRun(summary: RunSummary, strategy: Strategy, batch: number) {
  await put(`perf/latest-${strategy}-${batch}.json`, JSON.stringify(summary, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function saveLatestStrategyRun(summary: RunSummary, strategy: Strategy) {
  await put(`perf/latest-${strategy}.json`, JSON.stringify(summary, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function saveLatestRun(summary: RunSummary) {
  await put("perf/latest.json", JSON.stringify(summary, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function saveHistoryRun(summary: RunSummary) {
  const safeRunId = summary.runId.replace(/[^a-zA-Z0-9-_:.]/g, "-");

  await put(`perf/history/${safeRunId}.json`, JSON.stringify(summary, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getLatestRun(): Promise<RunSummary | null> {
  const items = await list({ prefix: "perf/latest" });

  // Batched format: merge mobile-0, mobile-1, desktop-0, desktop-1
  const batchBlobs = ["mobile-0", "mobile-1", "desktop-0", "desktop-1"]
    .map((key) => items.blobs.find((b) => b.pathname === `perf/latest-${key}.json`))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  if (batchBlobs.length > 0) {
    const parts = (await Promise.all(batchBlobs.map((b) => fetchBlobJson(b.url))))
      .filter((s): s is RunSummary => s !== null);
    if (parts.length === 0) return null;
    const allResults = parts.flatMap((s) => s.results);
    const base = parts[parts.length - 1];
    return {
      ...base,
      totalChecks: allResults.length,
      passCount: allResults.filter((r) => r.status === "pass").length,
      failCount: allResults.filter((r) => r.status === "fail").length,
      asanaTasksCreated: parts.reduce((sum, s) => sum + s.asanaTasksCreated, 0),
      results: allResults,
    };
  }

  // Legacy per-strategy format (mobile/desktop without batch)
  const mobileBlob = items.blobs.find((b) => b.pathname === "perf/latest-mobile.json");
  const desktopBlob = items.blobs.find((b) => b.pathname === "perf/latest-desktop.json");
  if (mobileBlob || desktopBlob) {
    const [mobile, desktop] = await Promise.all([
      mobileBlob ? fetchBlobJson(mobileBlob.url) : null,
      desktopBlob ? fetchBlobJson(desktopBlob.url) : null,
    ]);
    const parts = [mobile, desktop].filter((s): s is RunSummary => s !== null);
    if (parts.length === 0) return null;
    const allResults = parts.flatMap((s) => s.results);
    const base = parts[parts.length - 1];
    return {
      ...base,
      totalChecks: allResults.length,
      passCount: allResults.filter((r) => r.status === "pass").length,
      failCount: allResults.filter((r) => r.status === "fail").length,
      asanaTasksCreated: parts.reduce((sum, s) => sum + s.asanaTasksCreated, 0),
      results: allResults,
    };
  }

  // Legacy single-run format
  const legacyBlob = items.blobs.find((b) => b.pathname === "perf/latest.json");
  if (!legacyBlob?.url) return null;
  return fetchBlobJson(legacyBlob.url);
}

async function fetchBlobJson(url: string): Promise<RunSummary | null> {
  const res = await fetch(url, {
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