import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import type { AdminAnalytics as AdminAnalyticsType } from "../../types/platform";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  PieChart,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  ShieldCheck,
  Calendar
} from "lucide-react";

export function AdminAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load admin analytics:", err);
      setError(err?.message || "Failed to load analytics from Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalInspections = analytics?.total_inspections ?? 0;
  const passCount = analytics?.pass_count ?? 0;
  const failCount = analytics?.fail_count ?? 0;
  const reviewCount = analytics?.review_count ?? 0;
  const complianceRate = analytics?.compliance_rate ?? 0;
  const activeInspectors = analytics?.active_inspectors ?? 0;
  const totalInspectors = analytics?.total_inspectors ?? 0;

  const categoryDistribution = analytics?.category_distribution || {};
  const categoryEntries = Object.entries(categoryDistribution).sort((a, b) => b[1] - a[1]);

  const timeline = analytics?.timeline || [];

  const passPercentage = totalInspections > 0 ? ((passCount / totalInspections) * 100).toFixed(1) : "0.0";
  const failPercentage = totalInspections > 0 ? ((failCount / totalInspections) * 100).toFixed(1) : "0.0";
  const reviewPercentage = totalInspections > 0 ? ((reviewCount / totalInspections) * 100).toFixed(1) : "0.0";

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BarChart3 size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Statutory Intelligence &amp; Analytics
                </h1>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Live aggregated compliance metrics calculated dynamically from Supabase inspection records.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button onClick={() => navigate("/admin")} className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={fetchAnalytics}
                className="btn btn-secondary btn-sm"
                title="Refresh Analytics"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
            <button onClick={fetchAnalytics} className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: "0.75rem" }} className="panel-card">
            <Loader2 size={36} className="spin-animate" color="#1e3a8a" />
            <span style={{ fontSize: "0.9rem", color: "#64748b" }}>Aggregating statistical trends from Supabase...</span>
          </div>
        ) : (
          <>
            {/* High-Level KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="panel-card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Total Inspections
                  </span>
                  <ShieldCheck size={18} color="#1e3a8a" />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginTop: "0.3rem" }}>
                  {totalInspections}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Audited across all jurisdictions
                </div>
              </div>

              <div className="panel-card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Compliance Rate
                  </span>
                  <TrendingUp size={18} color="#166534" />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#166534", marginTop: "0.3rem" }}>
                  {complianceRate}%
                </div>
                <div style={{ fontSize: "0.75rem", color: "#15803d", marginTop: "0.3rem", fontWeight: 600 }}>
                  {passCount} compliant of {totalInspections} total
                </div>
              </div>

              <div className="panel-card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Statutory Violations
                  </span>
                  <XCircle size={18} color="#dc2626" />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#dc2626", marginTop: "0.3rem" }}>
                  {failCount}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#991b1b", marginTop: "0.3rem", fontWeight: 600 }}>
                  Non-compliant commodities flagged
                </div>
              </div>

              <div className="panel-card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Active Field Force
                  </span>
                  <Users size={18} color="#2563eb" />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#2563eb", marginTop: "0.3rem" }}>
                  {activeInspectors} / {totalInspectors}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Legal Metrology Officers active
                </div>
              </div>
            </div>

            {/* Finding Breakdown & Sector Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
              {/* Finding Distribution */}
              <div className="panel-card" style={{ padding: "1.5rem" }}>
                <div className="panel-card-header" style={{ marginBottom: "1.25rem" }}>
                  <div className="panel-card-title">
                    <PieChart size={18} color="#1e3a8a" />
                    <span>Statutory Finding Breakdown</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* PASS */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#166534" }}>
                        <CheckCircle size={14} /> Full Statutory Compliance (PASS)
                      </span>
                      <span style={{ fontWeight: 700, color: "#166534" }}>
                        {passPercentage}% ({passCount})
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${passPercentage}%`, height: "100%", background: "#10b981", borderRadius: "4px" }} />
                    </div>
                  </div>

                  {/* FAIL */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#991b1b" }}>
                        <XCircle size={14} /> Statutory Non-Compliance (FAIL)
                      </span>
                      <span style={{ fontWeight: 700, color: "#991b1b" }}>
                        {failPercentage}% ({failCount})
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${failPercentage}%`, height: "100%", background: "#ef4444", borderRadius: "4px" }} />
                    </div>
                  </div>

                  {/* REVIEW */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#92400e" }}>
                        <AlertTriangle size={14} /> Pending Secondary Officer Review
                      </span>
                      <span style={{ fontWeight: 700, color: "#92400e" }}>
                        {reviewPercentage}% ({reviewCount})
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${reviewPercentage}%`, height: "100%", background: "#f59e0b", borderRadius: "4px" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Commodity Category Distribution */}
              <div className="panel-card" style={{ padding: "1.5rem" }}>
                <div className="panel-card-header" style={{ marginBottom: "1.25rem" }}>
                  <div className="panel-card-title">
                    <BarChart3 size={18} color="#1e3a8a" />
                    <span>Scanned Commodity Categories</span>
                  </div>
                </div>

                {categoryEntries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#64748b" }}>
                    No commodity categories cataloged yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {categoryEntries.map(([category, count]) => {
                      const pct = totalInspections > 0 ? ((count / totalInspections) * 100).toFixed(0) : "0";
                      return (
                        <div key={category}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                            <span style={{ color: "#334155" }}>{category || "Unclassified Commodity"}</span>
                            <span style={{ color: "#1e3a8a" }}>
                              {pct}% ({count} scans)
                            </span>
                          </div>
                          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#2563eb", borderRadius: "3px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Inspection Activity Timeline */}
            <div className="panel-card">
              <div className="panel-card-header">
                <div className="panel-card-title">
                  <Calendar size={18} color="#1e3a8a" />
                  <span>Recent Inspection Volume Timeline</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                  Aggregated from Supabase
                </span>
              </div>

              {timeline.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#64748b" }}>
                  No timeline data recorded yet.
                </div>
              ) : (
                <div className="table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Total Inspected</th>
                        <th>Compliant (Pass)</th>
                        <th>Violations (Fail)</th>
                        <th>Compliance Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map((entry) => {
                        const tot = entry.total ?? entry.count ?? 0;
                        const p = entry.pass ?? 0;
                        const f = entry.fail ?? 0;
                        const ratio = tot > 0 ? ((p / tot) * 100).toFixed(0) : "0";
                        return (
                          <tr key={entry.date}>
                            <td className="mono" style={{ fontWeight: 600, color: "#0f172a" }}>
                              {entry.date}
                            </td>
                            <td style={{ fontWeight: 700 }}>{tot}</td>
                            <td style={{ color: "#15803d", fontWeight: 600 }}>{p}</td>
                            <td style={{ color: "#dc2626", fontWeight: 600 }}>{f}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: Number(ratio) >= 75 ? "#15803d" : "#dc2626" }}>
                                {ratio}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
