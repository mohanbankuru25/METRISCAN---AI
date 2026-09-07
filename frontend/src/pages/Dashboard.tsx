import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { StatCard } from "../components/dashboard/StatCard";
import { ComplianceOverview } from "../components/dashboard/ComplianceOverview";
import { RecentScans } from "../components/dashboard/RecentScans";
import { QuickActions } from "../components/dashboard/QuickActions";
import { PipelineOverview } from "../components/dashboard/PipelineOverview";
import { historyService } from "../services/historyService";
import type { ScanHistoryItem, DashboardStats } from "../types/history";
import { ScanLine, History, ShieldAlert } from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    passCount: 0,
    failCount: 0,
    reviewCount: 0,
    averageScore: 0,
  });
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    const loadedScans = historyService.getScans();
    const loadedStats = historyService.getStats();
    setScans(loadedScans);
    setStats(loadedStats);
  }, []);

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Welcome / System Overview Banner */}
        <div
          style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            backgroundImage: "linear-gradient(to right, #0f172a, #1e293b)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60a5fa", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <ShieldAlert size={16} />
            <span>Official Inspection System</span>
          </div>

          <div>
            <h1 style={{ fontSize: "1.65rem", color: "#ffffff", margin: "0 0 0.35rem 0" }}>
              Legal Metrology Compliance Dashboard
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: "800px", margin: 0 }}>
              AI-powered inspection of packaged commodity declarations under the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.85rem", marginTop: "0.5rem" }}>
            <button
              onClick={() => navigate("/scanner")}
              className="btn btn-blue"
              style={{ padding: "0.65rem 1.35rem" }}
            >
              <ScanLine size={18} />
              <span>Scan Product</span>
            </button>
            <button
              onClick={() => navigate("/history")}
              className="btn btn-secondary"
              style={{ padding: "0.65rem 1.35rem", backgroundColor: "rgba(255,255,255,0.1)", color: "#ffffff", borderColor: "rgba(255,255,255,0.2)" }}
            >
              <History size={18} />
              <span>View History</span>
            </button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <StatCard
            title="Total Scans"
            value={stats.totalScans}
            type="total"
            subtitle="Analyzed package labels"
          />
          <StatCard
            title="Compliant (PASS)"
            value={stats.passCount}
            type="pass"
            subtitle="Full regulatory compliance"
          />
          <StatCard
            title="Needs Review"
            value={stats.reviewCount}
            type="review"
            subtitle="Requires officer inspection"
          />
          <StatCard
            title="Non-Compliant (FAIL)"
            value={stats.failCount}
            type="fail"
            subtitle="Violations detected"
          />
        </div>

        {/* Compliance Distribution & Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
          <ComplianceOverview stats={stats} />
          <QuickActions />
        </div>

        {/* System Pipeline Visualization */}
        <PipelineOverview />

        {/* Recent Scans Table */}
        <RecentScans scans={scans} />
      </div>
    </PageContainer>
  );
}
