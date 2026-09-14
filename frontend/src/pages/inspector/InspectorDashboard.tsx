import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { StatCard } from "../../components/dashboard/StatCard";
import { ComplianceOverview } from "../../components/dashboard/ComplianceOverview";
import { historyService } from "../../services/historyService";
import type { ScanHistoryItem, DashboardStats } from "../../types/history";
import {
  Camera,
  Upload,
  ScanLine,
  History,
  FileText,
  ShieldCheck,
  ArrowRight,
  Eye,
  PlusCircle
} from "lucide-react";

export function InspectorDashboard() {
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
    async function loadData() {
      try {
        const [loadedScans, loadedStats] = await Promise.all([
          historyService.getScans(),
          historyService.getStats(),
        ]);
        setScans(loadedScans);
        setStats(loadedStats);
      } catch (err) {
        console.error("Failed to load inspector dashboard data:", err);
      }
    }
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === "PASS") return <span className="badge badge-pass">✓ PASS</span>;
    if (s === "FAIL") return <span className="badge badge-fail">✕ FAIL</span>;
    return <span className="badge badge-review">⚠ REVIEW</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#059669";
    if (score >= 50) return "#d97706";
    return "#dc2626";
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* ====================================================================
            HEADER & PRIMARY CALL TO ACTION
           ==================================================================== */}
        <div
          style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
            backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "1px solid #1e293b"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60a5fa", fontSize: "0.775rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <ShieldCheck size={16} />
              <span>Inspector Portal • Legal Metrology Enforcement</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Authorized Field Officer Mode
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: "1.75rem", color: "#ffffff", margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
              Inspector Dashboard
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: "800px", margin: 0, lineHeight: 1.5 }}>
              Monitor and perform packaged commodity inspections under the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>

          {/* Prominent "Start New Inspection" Action Container */}
          <div
            style={{
              marginTop: "0.5rem",
              padding: "1.1rem 1.25rem",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <PlusCircle size={18} color="#60a5fa" />
                <span>Start New Inspection</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "0.15rem" }}>
                Select capture mode to run PaddleOCR & Gemini statutory compliance analysis:
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/inspector/scan", { state: { mode: "camera" } })}
                className="btn btn-blue"
                style={{ padding: "0.65rem 1.25rem" }}
              >
                <Camera size={18} />
                <span>Camera Scanner</span>
              </button>

              <button
                onClick={() => navigate("/inspector/scan", { state: { mode: "upload" } })}
                className="btn btn-secondary"
                style={{
                  padding: "0.65rem 1.25rem",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  borderColor: "#e2e8f0"
                }}
              >
                <Upload size={18} />
                <span>Upload Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================================
            DASHBOARD STATS CARDS (Total, Passed, Failed, Under Review)
           ==================================================================== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <StatCard
            title="Total Inspections"
            value={stats.totalScans}
            type="total"
            subtitle="Analyzed package labels"
          />
          <StatCard
            title="Passed (Compliant)"
            value={stats.passCount}
            type="pass"
            subtitle="Full regulatory compliance"
          />
          <StatCard
            title="Under Review"
            value={stats.reviewCount}
            type="review"
            subtitle="Requires officer inspection"
          />
          <StatCard
            title="Failed (Violations)"
            value={stats.failCount}
            type="fail"
            subtitle="Non-compliance detected"
          />
        </div>

        {/* ====================================================================
            COMPLIANCE OVERVIEW & QUICK ACTIONS
           ==================================================================== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {/* Compliance Overview */}
          <ComplianceOverview stats={stats} />

          {/* Quick Actions Panel */}
          <div className="panel-card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-card-header">
              <div className="panel-card-title">
                <ScanLine size={18} color="#2563eb" />
                <span>Quick Actions</span>
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem 0" }}>
              Fast shortcuts for routine enforcement and report generation operations.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", flex: 1 }}>
              <button
                onClick={() => navigate("/inspector/scan")}
                className="btn btn-secondary"
                style={{
                  height: "auto",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  textAlign: "center"
                }}
              >
                <Camera size={22} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Scan Product</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Capture live package</span>
              </button>

              <button
                onClick={() => navigate("/inspector/scan", { state: { mode: "upload" } })}
                className="btn btn-secondary"
                style={{
                  height: "auto",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  textAlign: "center"
                }}
              >
                <Upload size={22} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Upload Label</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>PNG, JPG or PDF</span>
              </button>

              <button
                onClick={() => navigate("/inspector/history")}
                className="btn btn-secondary"
                style={{
                  height: "auto",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  textAlign: "center"
                }}
              >
                <History size={22} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Inspection History</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Browse past logs</span>
              </button>

              <button
                onClick={() => navigate("/inspector/reports")}
                className="btn btn-secondary"
                style={{
                  height: "auto",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  textAlign: "center"
                }}
              >
                <FileText size={22} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Generate Report</span>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>PDF / DOCX certificates</span>
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RECENT INSPECTIONS TABLE
           ==================================================================== */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <History size={18} color="#2563eb" />
              <span>Recent Inspections</span>
            </div>
            <button
              onClick={() => navigate("/inspector/history")}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span>View All Records</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {scans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <ScanLine size={36} color="#cbd5e1" style={{ margin: "0 auto 0.75rem" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No inspection scans recorded yet.</p>
              <p style={{ fontSize: "0.8rem", margin: "0.25rem 0 1rem" }}>
                Launch the camera or upload a package label to start verifying compliance.
              </p>
              <button onClick={() => navigate("/inspector/scan")} className="btn btn-blue btn-sm">
                Start First Inspection
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Inspection ID</th>
                    <th>Product</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.slice(0, 5).map((scan, idx) => {
                    const dateObj = new Date(scan.timestamp);
                    const formattedDate = dateObj.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const displayId = `INS-${String(idx + 1).padStart(3, "0")}`;

                    return (
                      <tr key={scan.id}>
                        <td className="mono" style={{ fontWeight: 700, color: "#2563eb" }}>
                          {displayId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{scan.productName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{scan.category}</div>
                        </td>
                        <td style={{ color: "#475569", fontSize: "0.825rem" }}>
                          {formattedDate}
                        </td>
                        <td>{getStatusBadge(scan.status)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: getScoreColor(scan.score) }}>
                            {scan.score}%
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => navigate(`/history/${scan.id}`)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
