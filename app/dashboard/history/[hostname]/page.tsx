import { getHistoryForHostname } from "@/lib/blob";
import Link from "next/link";

export const dynamic = "force-dynamic";

function scoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export default async function HostnameHistoryPage({
  params,
}: {
  params: Promise<{ hostname: string }>;
}) {
  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);
  const entries = await getHistoryForHostname(decoded);

  const strategies = ["mobile", "desktop"] as const;

  return (
    <main style={{ maxWidth: 1200, margin: "40px auto", padding: "0 24px", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard"
          style={{ fontSize: 13, color: "var(--link)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}
        >
          ← Back to dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
          {decoded}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
          Performance history — {entries.length === 0 ? "no runs yet" : `${new Set(entries.map((e) => e.generatedAt)).size} runs`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          No history found for this hostname yet.
        </div>
      ) : (
        strategies.map((strategy) => {
          const strategyEntries = entries.filter((e) => e.result.strategy === strategy);
          if (strategyEntries.length === 0) return null;

          return (
            <div key={strategy} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
                {strategy === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
              </h2>

              {/* Sparkline bar chart for performance score */}
              <div
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "var(--shadow)",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Performance Score over time
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                  {strategyEntries.map((entry, i) => {
                    const score = entry.result.performanceScore;
                    const height = Math.max(4, (score / 100) * 60);
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: scoreColor(score), fontWeight: 700, marginBottom: 2 }}>
                          {score}
                        </div>
                        <div
                          title={`${new Date(entry.generatedAt).toLocaleDateString()} — Score: ${score}`}
                          style={{
                            width: "100%",
                            height,
                            background: scoreColor(score),
                            borderRadius: 3,
                            opacity: 0.85,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{new Date(strategyEntries[0].generatedAt).toLocaleDateString()}</span>
                  <span>{new Date(strategyEntries[strategyEntries.length - 1].generatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* History table */}
              <div style={{ background: "var(--bg-card)", borderRadius: 16, boxShadow: "var(--shadow)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-thead)" }}>
                      <th style={th}>Date</th>
                      <th style={{ ...th, textAlign: "center" }}>Score</th>
                      <th style={th}>LCP</th>
                      <th style={th}>CLS</th>
                      <th style={th}>TBT</th>
                      <th style={{ ...th, textAlign: "center" }}>Status</th>
                      <th style={th}>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...strategyEntries].reverse().map((entry, i) => {
                      const r = entry.result;
                      const pass = r.status === "pass";
                      return (
                        <tr
                          key={i}
                          style={{
                            borderTop: "1px solid var(--border)",
                            background: pass ? "var(--bg-card)" : "var(--bg-fail-row)",
                          }}
                        >
                          <td style={td}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {new Date(entry.generatedAt).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {new Date(entry.generatedAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(r.performanceScore) }}>
                              {r.performanceScore}
                            </span>
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
                          <td style={{ ...td, textAlign: "center" }}>
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
                          </td>
                          <td style={td}>
                            {r.issues.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#dc2626" }}>
                                {r.issues.map((issue, j) => (
                                  <li key={j} style={{ marginBottom: 2 }}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}

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
