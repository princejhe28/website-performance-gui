import type { CheckResult, Strategy } from "@/lib/types";

function getHostname(url: string): string {
  return new URL(url).hostname;
}

function getPath(url: string): string {
  return new URL(url).pathname || "/";
}

const RETRYABLE_CODES = new Set([500, 502, 503, 429]);
const MAX_ATTEMPTS = 3;

async function attemptPsiFetch(
  endpoint: URL,
  url: string,
  strategy: Strategy
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70_000);
  try {
    const res = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error && err.name === "AbortError"
      ? `PSI request timed out for ${url} (${strategy})`
      : `PSI request failed for ${url} (${strategy}): ${err instanceof Error ? err.message : err}`;
    throw new Error(msg);
  }
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

  let res: Response | undefined;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await attemptPsiFetch(endpoint, url, strategy);
    if (res.ok) break;

    const body = await res.text();
    lastError = `PSI request failed for ${url} (${strategy}): ${res.status} ${body}`;

    if (!RETRYABLE_CODES.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(lastError);
    }

    // Fixed 5s pause before retry — short enough to stay within budget
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  const data = await res!.json();
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