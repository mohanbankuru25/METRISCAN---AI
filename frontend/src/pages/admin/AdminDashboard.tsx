import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import type { AdminAnalytics, InspectionRecord } from "../../types/platform";
import {
  Building2,
  Users,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  AlertCircle,
  BookOpen,
  Scale,
  Loader2,
  RefreshCw
} from "lucide-react";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, recentInspections] = await Promise.all([
        adminService.getAdminAnalytics(),
        adminService.getRecentInspections(6),
      ]);
      setAnalytics(analyticsData);
      setInspections(recentInspections);
    } catch (err: any) {
      console.error("Failed to load admin dashboard:", err);
      setError(err?.message || "Unable to connect to Legal Metrology data services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === "PASS") return <span className="badge badge-pass">✓ PASS</span>;
    if (s === "FAIL") return <span className="badge badge-fail">✕ FAIL</span>;
    return <span className="badge badge-review">⚠ REVIEW</span>;
  };

  const totalInspections = analytics?.total_inspections || 0;
  const passCount = analytics?.pass_count || 0;
  const failCount = analytics?.fail_count || 0;

  const passPct = totalInspections > 0 ? Math.round((passCount / totalInspections) * 100) : 0;
  const failPct = totalInspections > 0 ? Math.round((failCount / totalInspections) * 100) : 0;
  const reviewPct = totalInspections > 0 ? 100 - passPct - failPct : 0;

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Hero Header */}
        <div
          style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
            backgroundImage: "linear-gradient(135deg, #0b1329 0%, #1e293b 100%)",
            border: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60a5fa", fontSize: "0.775rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <Building2 size={16} />
              <span>Directorate Oversight • Central Administration Portal</span>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
              title="Refresh live data from Supabase"
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              <span>{loading ? "Refreshing..." : "Sync Database"}</span>
            </button>
          </div>

          <div>
            <h1 style={{ fontSize: "1.75rem", color: "#ffffff", margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
              Administrator Command Center
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: "800px", margin: 0 }}>
              Live statutory enforcement oversight, field officer registry, dynamic Legal Metrology rule enforcement, and package compliance analytics.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
            <button onClick={() => navigate("/admin/inspectors")} className="btn btn-primary btn-sm">
              <Users size={15} />
              <span>Manage Field Officers</span>
            </button>
            <button onClick={() => navigate("/admin/rules")} className="btn btn-secondary btn-sm">
              <BookOpen size={15} />
              <span>Configure Compliance Rules</span>
            </button>
            <button onClick={() => navigate("/admin/inspections")} className="btn btn-secondary btn-sm">
              <ScanLine size={15} />
              <span>View All Inspections</span>
            </button>
            <button onClick={() => navigate("/admin/reports")} className="btn btn-secondary btn-sm">
              <FileText size={15} />
              <span>Official Reports Archive</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "1rem 1.25rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={loadDashboardData} className="btn btn-secondary btn-sm">
              Retry Sync
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !analytics && (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b" }}>
            <Loader2 size={32} className="spin" style={{ margin: "0 auto 1rem" }} />
            <div style={{ fontWeight: 600 }}>Loading live enforcement statistics from Supabase...</div>
          </div>
        )}

        {/* Real Statistics Cards */}
        {analytics && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="panel-card" style={{ cursor: "pointer" }} onClick={() => navigate("/admin/inspectors")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Registered Officers</span>
                  <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#2563eb" }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginTop: "0.4rem" }}>
                  {analytics.total_inspectors}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "0.3rem", fontWeight: 600 }}>
                  ● {analytics.active_inspectors} Active Field Officers
                </div>
              </div>

              <div className="panel-card" style={{ cursor: "pointer" }} onClick={() => navigate("/admin/inspections")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Inspections</span>
                  <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#2563eb" }}>
                    <ScanLine size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginTop: "0.4rem" }}>
                  {analytics.total_inspections}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Avg Score: <strong style={{ color: "#2563eb" }}>{analytics.average_compliance_score}%</strong>
                </div>
              </div>

              <div className="panel-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Passed Declarations</span>
                  <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669" }}>
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#059669", marginTop: "0.4rem" }}>
                  {analytics.pass_count}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "0.3rem", fontWeight: 600 }}>
                  {passPct}% of total scans
                </div>
              </div>

              <div className="panel-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Flagged Violations</span>
                  <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#dc2626" }}>
                    <XCircle size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#dc2626", marginTop: "0.4rem" }}>
                  {analytics.fail_count}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.3rem", fontWeight: 600 }}>
                  {failPct}% non-compliant cases
                </div>
              </div>

              <div className="panel-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Under Review</span>
                  <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: "#fffbeb", color: "#d97706" }}>
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d97706", marginTop: "0.4rem" }}>
                  {analytics.review_count}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#d97706", marginTop: "0.3rem", fontWeight: 600 }}>
                  {reviewPct}% requires manual check
                </div>
              </div>
            </div>

            {/* Middle Section: Recent Inspections & Regulatory Rules */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
              {/* Recent Inspections Table */}
              <div className="panel-card">
                <div className="panel-card-header">
                  <div className="panel-card-title">
                    <ScanLine size={18} color="#2563eb" />
                    <span>Live Enforcement Inspections</span>
                  </div>
                  <button onClick={() => navigate("/admin/inspections")} className="btn btn-secondary btn-sm">
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {inspections.length === 0 ? (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#94a3b8" }}>
                    <Scale size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>No inspection records registered yet in Supabase.</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                      Scans conducted by field inspectors will appear here in real time.
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="gov-table">
                      <thead>
                        <tr>
                          <th>Inspection No</th>
                          <th>Product</th>
                          <th>Status</th>
                          <th>Score</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspections.map((item) => (
                          <tr key={item.id}>
                            <td className="mono" style={{ fontWeight: 700, color: "#2563eb" }}>
                              {item.inspection_number}
                            </td>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>
                              {item.products?.product_name || "Packaged Product"}
                            </td>
                            <td>{getStatusBadge(item.status)}</td>
                            <td className="mono" style={{ fontWeight: 700 }}>
                              {item.compliance_score != null ? `${item.compliance_score}%` : "—"}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => navigate(`/inspector/history/${item.id}`)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                              >
                                View Dossier
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dynamic Rules Status & Violation Frequency */}
              <div className="panel-card">
                <div className="panel-card-header">
                  <div className="panel-card-title">
                    <BookOpen size={18} color="#2563eb" />
                    <span>Dynamic Rules Engine Status</span>
                  </div>
                  <button onClick={() => navigate("/admin/rules")} className="btn btn-secondary btn-sm">
                    <span>Manage Rules</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Active Dynamic Rules</div>
                      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
                        {analytics.active_rules} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>of {analytics.total_rules}</span>
                      </div>
                    </div>
                    <div style={{ alignSelf: "center" }}>
                      <span className="badge badge-pass">Active in Scanner</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
                      Most Frequent Statutory Violations
                    </div>

                    {analytics.violation_frequency && analytics.violation_frequency.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {analytics.violation_frequency.map((v, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.6rem", borderRadius: "6px", backgroundColor: "#fef2f2", fontSize: "0.8rem" }}>
                            <span style={{ color: "#991b1b", fontWeight: 600 }}>{v.name}</span>
                            <span style={{ color: "#dc2626", fontWeight: 800 }}>{v.count} violations</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                        No statutory violation events recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
