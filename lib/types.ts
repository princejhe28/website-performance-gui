export type Strategy = "mobile" | "desktop";
export type Status = "pass" | "fail";

export type CheckResult = {
  url: string;
  hostname: string;
  path: string;
  strategy: Strategy;
  performanceScore: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  status: Status;
  issues: string[];
  checkedAt: string;
};

export type RunSummary = {
  runId: string;
  generatedAt: string;
  totalChecks: number;
  passCount: number;
  failCount: number;
  asanaTasksCreated: number;
  results: CheckResult[];
};

export type Thresholds = {
  performanceScore: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
};