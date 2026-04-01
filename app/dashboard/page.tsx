import { getLatestRun } from "@/lib/blob";
import type { CheckResult, RunSummary } from "@/lib/types";
import { Suspense, Fragment } from "react";
import Filters from "./filters";
import LogoutButton from "./logout-button";
import ThemeToggle from "./theme-toggle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

async function getLatestSummary(): Promise<RunSummary | null> {
  return getLatestRun();
}

function scoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreRingStyle(score: number): React.CSSProperties {
  return {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, var(--ring-track) 0deg)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: scoreColor(score),
    flexShrink: 0,
    position: "relative",
  };
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div style={scoreRingStyle(score)}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--score-ring-inner)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: scoreColor(score),
        }}
      >
        {score}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CheckResult["status"] }) {
  const pass = status === "pass";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: pass ? "#dcfce7" : "#fee2e2",
        color: pass ? "#16a34a" : "#dc2626",
      }}
    >
      {pass ? "✓ Pass" : "✕ Fail"}
    </span>
  );
}

function StrategyBadge({ strategy }: { strategy: CheckResult["strategy"] }) {
  const mobile = strategy === "mobile";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        minWidth: 90,
        background: mobile ? "#eff6ff" : "#f5f3ff",
        color: mobile ? "#2563eb" : "#7c3aed",
      }}
    >
      {mobile ? "📱 Mobile" : "🖥️ Desktop"}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: 16,
        padding: "20px 24px",
        boxShadow: "var(--shadow)",
        borderTop: `4px solid ${accent ?? "#6366f1"}`,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; strategy?: string; page?: string }>;
}) {
  const summary = await getLatestSummary();
  const params = await searchParams;

  if (!summary) {
    return (
      <main style={{ maxWidth: 1200, margin: "60px auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>Website Performance Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>No results yet. Run the cron endpoint once first.</p>
      </main>
    );
  }

  // Filtering
  const q = (params.q ?? "").toLowerCase();
  const statusFilter = params.status ?? "all";
  const strategyFilter = params.strategy ?? "all";

  const filtered = summary.results.filter((r) => {
    if (q && !r.hostname.toLowerCase().includes(q) && !r.url.toLowerCase().includes(q)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (strategyFilter !== "all" && r.strategy !== strategyFilter) return false;
    return true;
  });

  // Group filtered results by site (hostname + path)
  const groupedMap = new Map<string, CheckResult[]>();
  for (const r of filtered) {
    const key = `${r.hostname}${r.path !== "/" ? r.path : ""}`;
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key)!.push(r);
  }
  const groups = Array.from(groupedMap.values());

  // Paginate by site
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedGroups = groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const passRate = Math.round((summary.passCount / summary.totalChecks) * 100);

  return (
    <main style={{ maxWidth: 1200, margin: "40px auto", padding: "0 24px", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Website Performance Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: "4px 0 0", fontSize: 14 }}>
            Last run: {new Date(summary.generatedAt).toLocaleString()}
          </p>
        </div>
        <div
          style={{
            background: passRate === 100 ? "#dcfce7" : passRate >= 50 ? "#fef9c3" : "#fee2e2",
            color: passRate === 100 ? "#16a34a" : passRate >= 50 ? "#854d0e" : "#dc2626",
            borderRadius: 999,
            padding: "6px 16px",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {passRate}% Pass Rate
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <SummaryCard label="Total Checks" value={summary.totalChecks} accent="#6366f1" />
        <SummaryCard label="Passed" value={summary.passCount} accent="#22c55e" />
        <SummaryCard label="Failed" value={summary.failCount} accent="#ef4444" />
        <SummaryCard label="Asana Tasks Created" value={summary.asanaTasksCreated} accent="#f59e0b" />
      </div>

      {/* Filters */}
      <Suspense>
        <Filters total={filtered.length} />
      </Suspense>

      {/* Results table */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 16,
          boxShadow: "var(--shadow)",
          overflowX: "auto",
        }}
      >
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Check Results
            {filtered.length < summary.results.length && (
              <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                (showing {filtered.length} of {summary.results.length})
              </span>
            )}
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-thead)" }}>
              <th style={th}>URL</th>
              <th style={{ ...th, textAlign: "center" }}>Strategy</th>
              <th style={{ ...th, textAlign: "center" }}>Score</th>
              <th style={th}>LCP</th>
              <th style={th}>CLS</th>
              <th style={th}>TBT</th>
              <th style={{ ...th, textAlign: "center" }}>Status</th>
              <th style={th}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGroups.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                  No results match your filters.
                </td>
              </tr>
            ) : (
              paginatedGroups.map((group) => {
                const mobile = group.find((r) => r.strategy === "mobile");
                const desktop = group.find((r) => r.strategy === "desktop");
                const first = group[0];
                const rowCount = (mobile ? 1 : 0) + (desktop ? 1 : 0);
                const siteKey = `${first.hostname}${first.path !== "/" ? first.path : ""}`;
                const siteHref = `/dashboard/history/${encodeURIComponent(first.hostname)}`;
                const allIssues = group.flatMap((r) =>
                  r.issues.map((issue) => ({ strategy: r.strategy, issue }))
                );

                const renderRow = (r: CheckResult, isFirst: boolean) => (
                  <tr
                    key={`${r.url}-${r.strategy}`}
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: r.status === "fail" ? "var(--bg-fail-row)" : "var(--bg-card)",
                    }}
                  >
                    {isFirst && (
                      <td rowSpan={rowCount} style={{ ...td, verticalAlign: "middle", borderRight: "1px solid var(--border)" }}>
                        <a href={siteHref} style={{ color: "var(--link)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}>
                          {siteKey}
                        </a>
                      </td>
                    )}
                    <td style={{ ...td, textAlign: "center" }}><StrategyBadge strategy={r.strategy} /></td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <ScoreRing score={r.performanceScore} />
                      </div>
                    </td>
                    <td style={{ ...td, color: r.lcpMs > 2500 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                      {Math.round(r.lcpMs)} ms
                    </td>
                    <td style={{ ...td, color: r.cls > 0.1 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                      {r.cls.toFixed(3)}
                    </td>
                    <td style={{ ...td, color: r.tbtMs > 300 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                      {Math.round(r.tbtMs)} ms
                    </td>
                    <td style={{ ...td, textAlign: "center" }}><StatusBadge status={r.status} /></td>
                    {isFirst && (
                      <td rowSpan={rowCount} style={{ ...td, verticalAlign: "top" }}>
                        {allIssues.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#dc2626" }}>
                            {allIssues.map(({ strategy, issue }, i) => (
                              <li key={i} style={{ marginBottom: 2 }}>
                                <span style={{ fontWeight: 600 }}>{strategy === "mobile" ? "📱" : "🖥️"}</span> {issue}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );

                return (
                  <Fragment key={siteKey}>
                    {mobile && renderRow(mobile, true)}
                    {desktop && renderRow(desktop, !mobile)}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
              fontSize: 14,
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              Page {currentPage} of {totalPages} &mdash; {groups.length} sites
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <PageLink
                label="← Prev"
                page={currentPage - 1}
                disabled={currentPage <= 1}
                params={params}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PageLink
                  key={p}
                  label={String(p)}
                  page={p}
                  disabled={false}
                  active={p === currentPage}
                  params={params}
                />
              ))}
              <PageLink
                label="Next →"
                page={currentPage + 1}
                disabled={currentPage >= totalPages}
                params={params}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PageLink({
  label,
  page,
  disabled,
  active,
  params,
}: {
  label: string;
  page: number;
  disabled: boolean;
  active?: boolean;
  params: { q?: string; status?: string; strategy?: string; page?: string };
}) {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.status && params.status !== "all") p.set("status", params.status);
  if (params.strategy && params.strategy !== "all") p.set("strategy", params.strategy);
  p.set("page", String(page));

  if (disabled) {
    return (
      <span style={{ ...pageBtnStyle, opacity: 0.35, cursor: "not-allowed" }}>{label}</span>
    );
  }

  return (
    <a
      href={`/dashboard?${p.toString()}`}
      style={{
        ...pageBtnStyle,
        background: active ? "#6366f1" : "var(--page-btn-bg)",
        color: active ? "#fff" : "var(--page-btn-color)",
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </a>
  );
}

const pageBtnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 13,
  textDecoration: "none",
  background: "var(--page-btn-bg)",
  color: "var(--page-btn-color)",
};

const th: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  verticalAlign: "middle",
  fontSize: 14,
};