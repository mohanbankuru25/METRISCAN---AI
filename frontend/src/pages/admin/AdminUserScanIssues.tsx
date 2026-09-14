import { useState, useEffect } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { consumerService } from "../../services/consumerService";
import {
  Search,
  Eye,
  RefreshCw,
  X,
  Loader2,
  MapPin,
  ShieldAlert
} from "lucide-react";

export function AdminUserScanIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Review Modal
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [modalStatus, setModalStatus] = useState("NEW");
  const [modalNotes, setModalNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchScanIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await consumerService.getAdminScanIssues({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search || undefined,
        limit: 100,
      });
      setIssues(data.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to retrieve citizen scan issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanIssues();
  }, [statusFilter]);

  const handleOpenReview = (item: any) => {
    setSelectedIssue(item);
    setModalStatus(item.status || "NEW");
    setModalNotes(item.admin_notes || "");
  };

  const handleSaveReview = async () => {
    if (!selectedIssue) return;
    try {
      setUpdating(true);
      await consumerService.updateAdminScanIssue(selectedIssue.id, modalStatus, modalNotes);
      setSelectedIssue(null);
      await fetchScanIssues();
    } catch (err: any) {
      alert(err.message || "Failed to update review status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED_FOR_INSPECTION":
        return { label: "Assigned For Inspection", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "RESOLVED":
        return { label: "Resolved", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
      case "DISMISSED":
        return { label: "Dismissed", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
      case "ACKNOWLEDGED":
        return { label: "Acknowledged", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
      default:
        return { label: "New Alert", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    }
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            Citizen Scan Product Alerts
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Automated compliance alerts triggered when citizen scans detect non-compliant packaged commodities
          </p>
        </div>
        {/* Filters and Search Bar */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", backgroundColor: "#ffffff", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchScanIssues()}
              placeholder="Search product name, violation, brand..."
              style={{
                width: "100%",
                padding: "0.55rem 0.85rem 0.55rem 2.2rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#ffffff" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New Alerts</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="ASSIGNED_FOR_INSPECTION">Assigned for Inspection</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          <button
            onClick={fetchScanIssues}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ padding: "0.85rem 1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {/* Table of Scan Issues */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Loader2 size={20} className="spin" style={{ animation: "spin 1s linear infinite" }} />
              <span>Loading citizen scan alerts...</span>
            </div>
          ) : issues.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
              <ShieldAlert size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>No Non-Compliant Scan Alerts</div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
                Alerts are automatically triggered only when citizen scans evaluate to verified FAIL violations.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Product Details</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Violation Summary</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Risk / Priority</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Date Flagged</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((item, idx) => {
                    const statusBadge = getStatusBadge(item.status);
                    return (
                      <tr key={item.id} style={{ borderBottom: idx !== issues.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.product_name || "Packaged Product"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.brand || "Unspecified Brand"}</div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", maxWidth: "320px" }}>
                          <div style={{ color: "#334155", fontSize: "0.82rem", lineHeight: 1.4 }}>
                            {item.violation_summary || "Legal Metrology Rules Failure"}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              backgroundColor: item.priority === "HIGH" ? "#fee2e2" : "#fef3c7",
                              color: item.priority === "HIGH" ? "#b91c1c" : "#b45309",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontWeight: 700,
                            }}
                          >
                            {item.priority || "HIGH"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              border: `1px solid ${statusBadge.border}`,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "999px",
                              fontWeight: 700,
                            }}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", color: "#64748b" }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                          <button
                            onClick={() => handleOpenReview(item)}
                            style={{
                              padding: "0.4rem 0.75rem",
                              borderRadius: "6px",
                              backgroundColor: "#1e293b",
                              color: "#ffffff",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <Eye size={13} />
                            <span>Review</span>
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

      {/* Review Modal */}
      {selectedIssue && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldAlert size={20} color="#dc2626" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Enforcement Review
                </h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem" }}>
              <div>
                <strong style={{ color: "#475569" }}>Product:</strong> {selectedIssue.product_name} ({selectedIssue.brand || "N/A"})
              </div>

              <div>
                <strong style={{ color: "#475569" }}>Violation Summary:</strong>
                <div style={{ marginTop: "0.25rem", padding: "0.75rem", backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", color: "#991b1b" }}>
                  {selectedIssue.violation_summary}
                </div>
              </div>

              {selectedIssue.consumer_scans?.image_url && (
                <div>
                  <strong style={{ color: "#475569" }}>Scanned Label Image:</strong>
                  <div style={{ marginTop: "0.35rem" }}>
                    <img
                      src={selectedIssue.consumer_scans.image_url}
                      alt="Scanned Pack"
                      style={{ maxHeight: "180px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    />
                  </div>
                </div>
              )}

              {selectedIssue.location_latitude && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#059669", fontWeight: 600 }}>
                  <MapPin size={15} />
                  <span>GPS: {selectedIssue.location_latitude}, {selectedIssue.location_longitude}</span>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Update Oversight Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontWeight: 600,
                  }}
                >
                  <option value="NEW">NEW</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="ASSIGNED_FOR_INSPECTION">ASSIGNED FOR INSPECTION</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Directorate Notes / Officer Action Instructions
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Forwarded to Zonal Inspector for onsite audit under Rule 6..."
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  style={{ padding: "0.55rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReview}
                  disabled={updating}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: "8px",
                    backgroundColor: "#1e293b",
                    color: "#ffffff",
                    fontWeight: 700,
                    border: "none",
                    cursor: updating ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {updating && <Loader2 size={14} className="spin" />}
                  <span>Save Decision</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
