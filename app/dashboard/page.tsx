import { getLatestRun } from "@/lib/blob";
import type { RunSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getLatestSummary(): Promise<RunSummary | null> {
  return getLatestRun();
}

function metricCard(label: string, value: string | number) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const summary = await getLatestSummary();

  if (!summary) {
    return (
      <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}>
        <h1>Website Performance Dashboard</h1>
        <p>No results yet. Run the cron endpoint once first.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}>
      <h1>Website Performance Dashboard</h1>
      <p>Last run: {new Date(summary.generatedAt).toLocaleString()}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          margin: "24px 0",
        }}
      >
        {metricCard("Total checks", summary.totalChecks)}
        {metricCard("Passed", summary.passCount)}
        {metricCard("Failed", summary.failCount)}
        {metricCard("Asana tasks created", summary.asanaTasksCreated)}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f3f5" }}>
              <th style={th}>URL</th>
              <th style={th}>Strategy</th>
              <th style={th}>Score</th>
              <th style={th}>LCP</th>
              <th style={th}>CLS</th>
              <th style={th}>TBT</th>
              <th style={th}>Status</th>
              <th style={th}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {summary.results.map((result, index) => (
              <tr key={`${result.url}-${result.strategy}-${index}`} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}>{result.url}</td>
                <td style={td}>{result.strategy}</td>
                <td style={td}>{result.performanceScore}</td>
                <td style={td}>{Math.round(result.lcpMs)} ms</td>
                <td style={td}>{result.cls}</td>
                <td style={td}>{Math.round(result.tbtMs)} ms</td>
                <td style={td}>{result.status}</td>
                <td style={td}>
                  {result.issues.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {result.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  padding: 12,
  textAlign: "left",
  fontSize: 14,
};

const td: React.CSSProperties = {
  padding: 12,
  verticalAlign: "top",
  fontSize: 14,
};