import { PieChart } from "lucide-react";
import type { DashboardStats } from "../../types/history";

interface ComplianceOverviewProps {
  stats: DashboardStats;
}

export function ComplianceOverview({ stats }: ComplianceOverviewProps) {
  const { totalScans, passCount, failCount, reviewCount, averageScore } = stats;

  const passPct = totalScans > 0 ? Math.round((passCount / totalScans) * 100) : 0;
  const failPct = totalScans > 0 ? Math.round((failCount / totalScans) * 100) : 0;
  const reviewPct = totalScans > 0 ? Math.round((reviewCount / totalScans) * 100) : 0;

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <PieChart size={18} color="#2563eb" />
          <span>Compliance Distribution</span>
        </div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
          Avg Compliance Score: <span style={{ color: "#2563eb", fontSize: "0.95rem" }}>{averageScore}%</span>
        </div>
      </div>

      {/* Progress bar breakdown */}
      <div style={{ margin: "1rem 0 1.25rem" }}>
        <div
          style={{
            height: "16px",
            width: "100%",
            borderRadius: "9999px",
            overflow: "hidden",
            display: "flex",
            backgroundColor: "#e2e8f0"
          }}
        >
          {passPct > 0 && (
            <div
              style={{ width: `${passPct}%`, backgroundColor: "#059669" }}
              title={`PASS: ${passPct}% (${passCount})`}
            />
          )}
          {reviewPct > 0 && (
            <div
              style={{ width: `${reviewPct}%`, backgroundColor: "#d97706" }}
              title={`REVIEW: ${reviewPct}% (${reviewCount})`}
            />
          )}
          {failPct > 0 && (
            <div
              style={{ width: `${failPct}%`, backgroundColor: "#dc2626" }}
              title={`FAIL: ${failPct}% (${failCount})`}
            />
          )}
        </div>
      </div>

      {/* Legends */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", textAlign: "center" }}>
        <div style={{ padding: "0.75rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46" }}>PASS</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669" }}>{passCount}</div>
          <div style={{ fontSize: "0.7rem", color: "#047857" }}>{passPct}% of total</div>
        </div>

        <div style={{ padding: "0.75rem", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e" }}>REVIEW</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#d97706" }}>{reviewCount}</div>
          <div style={{ fontSize: "0.7rem", color: "#b45309" }}>{reviewPct}% of total</div>
        </div>

        <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#991b1b" }}>FAIL</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626" }}>{failCount}</div>
          <div style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{failPct}% of total</div>
        </div>
      </div>
    </div>
  );
}
