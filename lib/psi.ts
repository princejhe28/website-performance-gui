import type { CheckResult, Strategy } from "@/lib/types";

function getHostname(url: string): string {
  return new URL(url).hostname;
}

function getPath(url: string): string {
  return new URL(url).pathname || "/";
}

export async function getPsiMetrics(
  url: string,
  strategy: Strategy
): Promise<Omit<CheckResult, "status" | "issues" | "checkedAt">> {
  const apiKey = process.env.PSI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing PSI_API_KEY");
  }

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70_000);

  let res: Response;
  try {
    res = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error && err.name === "AbortError"
      ? `PSI request timed out for ${url} (${strategy})`
      : `PSI request failed for ${url} (${strategy}): ${err instanceof Error ? err.message : err}`;
    throw new Error(msg);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PSI request failed for ${url} (${strategy}): ${res.status} ${body}`);
  }

  const data = await res.json();
  const lighthouse = data?.lighthouseResult;
  const audits = lighthouse?.audits || {};

  return {
    url,
    hostname: getHostname(url),
    path: getPath(url),
    strategy,
    performanceScore: Math.round((lighthouse?.categories?.performance?.score ?? 0) * 100),
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? 0,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? 0,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? 0,
  };
}