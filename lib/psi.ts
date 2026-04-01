import type { CheckResult, Strategy } from "@/lib/types";

function getHostname(url: string): string {
  return new URL(url).hostname;
}

function getPath(url: string): string {
  return new URL(url).pathname || "/";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPsi(url: string, strategy: Strategy): Promise<Response> {
  const apiKey = process.env.PSI_API_KEY!;
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
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
    throw err;
  }
}

export async function getPsiMetrics(
  url: string,
  strategy: Strategy,
  retries = 2
): Promise<Omit<CheckResult, "status" | "issues" | "checkedAt">> {
  const apiKey = process.env.PSI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing PSI_API_KEY");
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchPsi(url, strategy);

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
    } catch (err) {
      lastError = err;
      const isTimeout = err instanceof Error && err.name === "AbortError";
      if (attempt < retries) {
        // Wait before retrying — longer pause on timeout to let Google recover
        await delay(isTimeout ? 8_000 : 3_000);
        continue;
      }
    }
  }

  const isTimeout = lastError instanceof Error && lastError.name === "AbortError";
  const msg = isTimeout
    ? `PSI request timed out for ${url} (${strategy}) after ${retries} attempts`
    : `PSI request failed for ${url} (${strategy}): ${
        lastError instanceof Error ? lastError.message : lastError
      }`;
  throw new Error(msg);
}