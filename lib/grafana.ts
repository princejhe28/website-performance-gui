import type { RunSummary } from "@/lib/types";

type GraphiteMetric = {
  name: string;
  value: number;
  /** Interval in seconds for the metric resolution (matches your cron cadence). */
  interval: number;
  /** Unix timestamp in seconds. */
  time: number;
};

/** Replace any character that is not alphanumeric, underscore, or hyphen with an underscore. */
function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "");
}

function buildMetrics(summary: RunSummary): GraphiteMetric[] {
  const timestampSec = Math.floor(new Date(summary.generatedAt).getTime() / 1000);
  const metrics: GraphiteMetric[] = [];

  for (const result of summary.results) {
    const host = sanitize(result.hostname);
    const path = sanitize(result.path === "/" ? "root" : result.path);
    const prefix = `psi.${host}.${path}.${result.strategy}`;

    metrics.push(
      { name: `${prefix}.performance_score`, value: result.performanceScore, interval: 60, time: timestampSec },
      { name: `${prefix}.lcp_ms`, value: result.lcpMs, interval: 60, time: timestampSec },
      { name: `${prefix}.cls`, value: result.cls * 1000, interval: 60, time: timestampSec },
      { name: `${prefix}.tbt_ms`, value: result.tbtMs, interval: 60, time: timestampSec },
      { name: `${prefix}.pass`, value: result.status === "pass" ? 1 : 0, interval: 60, time: timestampSec }
    );
  }

  // Run-level summary metrics
  metrics.push(
    { name: "psi.summary.total_checks", value: summary.totalChecks, interval: 60, time: timestampSec },
    { name: "psi.summary.pass_count", value: summary.passCount, interval: 60, time: timestampSec },
    { name: "psi.summary.fail_count", value: summary.failCount, interval: 60, time: timestampSec }
  );

  return metrics;
}

/**
 * Pushes PSI metrics to Grafana Cloud using the Graphite-compatible HTTP API.
 *
 * Required env vars:
 *   GRAFANA_CLOUD_URL      – your Grafana Cloud stack base URL, e.g. https://mystack.grafana.net
 *   GRAFANA_CLOUD_USER     – numeric Grafana Cloud Metrics user ID (Grafana Cloud → Stack → Details)
 *   GRAFANA_CLOUD_API_KEY  – Grafana Cloud API key with MetricsPublisher role
 */
export async function pushMetricsToGrafana(summary: RunSummary): Promise<void> {
  const cloudUrl = process.env.GRAFANA_CLOUD_URL;
  const user = process.env.GRAFANA_CLOUD_USER;
  const apiKey = process.env.GRAFANA_CLOUD_API_KEY;

  if (!cloudUrl || !user || !apiKey) {
    console.warn(
      "Skipping Grafana push: GRAFANA_CLOUD_URL, GRAFANA_CLOUD_USER, or GRAFANA_CLOUD_API_KEY is missing."
    );
    return;
  }

  const metrics = buildMetrics(summary);
  const endpoint = `${cloudUrl.replace(/\/$/, "")}/graphite/metrics`;
  const auth = Buffer.from(`${user}:${apiKey}`).toString("base64");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(metrics),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grafana push failed (${res.status}): ${text}`);
  }
}
