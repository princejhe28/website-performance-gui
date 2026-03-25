import thresholds from "@/config/thresholds.json";
import type { CheckResult, Thresholds } from "@/lib/types";

export const PERF_THRESHOLDS = thresholds as Thresholds;

export function findIssues(
  metrics: Pick<CheckResult, "performanceScore" | "lcpMs" | "cls" | "tbtMs">
): string[] {
  const issues: string[] = [];

  if (metrics.performanceScore < PERF_THRESHOLDS.performanceScore) {
    issues.push(
      `Performance score below threshold: ${metrics.performanceScore} < ${PERF_THRESHOLDS.performanceScore}`
    );
  }

  if (metrics.lcpMs > PERF_THRESHOLDS.lcpMs) {
    issues.push(`LCP above threshold: ${Math.round(metrics.lcpMs)}ms > ${PERF_THRESHOLDS.lcpMs}ms`);
  }

  if (metrics.cls > PERF_THRESHOLDS.cls) {
    issues.push(`CLS above threshold: ${metrics.cls} > ${PERF_THRESHOLDS.cls}`);
  }

  if (metrics.tbtMs > PERF_THRESHOLDS.tbtMs) {
    issues.push(`TBT above threshold: ${Math.round(metrics.tbtMs)}ms > ${PERF_THRESHOLDS.tbtMs}ms`);
  }

  return issues;
}