import { useState, useEffect } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { consumerService } from "../../services/consumerService";
import {
  FileSpreadsheet,
  Search,
  Eye,
  RefreshCw,
  X,
  Loader2,
  MapPin,
  Mic,
  ExternalLink
} from "lucide-react";

export function AdminUserIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Review Modal
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [modalStatus, setModalStatus] = useState("SUBMITTED");
  const [modalNotes, setModalNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchUserIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await consumerService.getAdminUserIssues({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        search: search || undefined,
        limit: 100,
      });
      setIssues(data.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to retrieve citizen grievances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserIssues();
  }, [statusFilter, categoryFilter]);

  const handleOpenReview = (item: any) => {
    setSelectedIssue(item);
    setModalStatus(item.status || "SUBMITTED");
    setModalNotes(item.admin_notes || "");
  };

  const handleSaveReview = async () => {
    if (!selectedIssue) return;
    try {
      setUpdating(true);
      await consumerService.updateAdminUserIssue(selectedIssue.id, modalStatus, modalNotes);
      setSelectedIssue(null);
      await fetchUserIssues();
    } catch (err: any) {
      alert(err.message || "Failed to update grievance status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { label: "Resolved", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
      case "UNDER_REVIEW":
        return { label: "Under Review", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "REJECTED":
        return { label: "Dismissed", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
      default:
        return { label: "Submitted", bg: "#fefce8", color: "#ca8a04", border: "#fef08a" };
    }
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            Citizen Grievances & Complaints
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Direct complaints submitted by consumers regarding packaged commodity violations, overcharging, and expired goods
          </p>
        </div>
        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", backgroundColor: "#ffffff", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchUserIssues()}
              placeholder="Search by product, retailer, or description..."
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
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Dismissed</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#ffffff" }}
            >
              <option value="ALL">All Categories</option>
              <option value="OVERCHARGING_ABOVE_MRP">Overcharging (Above MRP)</option>
              <option value="EXPIRED_PRODUCT">Expired Goods</option>
              <option value="MISSING_DECLARATIONS">Missing Declarations</option>
              <option value="DECEPTIVE_PACKAGING">Deceptive Packaging</option>
              <option value="INCORRECT_NET_QTY">Short Weight</option>
              <option value="ADULTERATION_SAFETY">Safety Hazard</option>
            </select>
          </div>

          <button
            onClick={fetchUserIssues}
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

        {/* Grievances Table */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Loader2 size={20} className="spin" style={{ animation: "spin 1s linear infinite" }} />
              <span>Loading citizen grievances...</span>
            </div>
          ) : issues.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
              <FileSpreadsheet size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>No Grievances Found</div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
                Consumer complaints will appear here when submitted via the citizen portal.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Category</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Product & Store</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Citizen User</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Evidence</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Date</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((item, idx) => {
                    const statusBadge = getStatusBadge(item.status);
                    return (
                      <tr key={item.id} style={{ borderBottom: idx !== issues.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", backgroundColor: "#f1f5f9", color: "#334155", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                            {item.category?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{item.product_name}</span>
                            {item.priority?.toUpperCase() === "HIGH" && (
                              <span style={{ fontSize: "0.68rem", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 800 }}>
                                ⚠ HIGH PRIORITY
                              </span>
                            )}
                            {item.priority?.toUpperCase() === "MEDIUM" && (
                              <span style={{ fontSize: "0.68rem", backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                                MEDIUM
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.15rem" }}>
                            {item.confirmations_count ? `${item.confirmations_count} citizen confirmations` : "1 report"}
                            {item.store_name ? ` • Shop: ${item.store_name}` : ""}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.82rem" }}>
                          <div style={{ fontWeight: 600, color: "#334155" }}>{item.consumer_users?.full_name || "Citizen"}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.consumer_users?.phone || item.consumer_users?.email}</div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            {item.image_url && <span style={{ fontSize: "0.7rem", backgroundColor: "#ecfdf5", color: "#059669", padding: "0.15rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>Photo</span>}
                            {item.audio_url && <span style={{ fontSize: "0.7rem", backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.15rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>Voice</span>}
                            {item.location_latitude && <span style={{ fontSize: "0.7rem", backgroundColor: "#fefce8", color: "#ca8a04", padding: "0.15rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>GPS</span>}
                          </div>
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
                            <span>Inspect</span>
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

      {/* Detail & Action Modal */}
      {selectedIssue && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", maxWidth: "640px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileSpreadsheet size={20} color="#2563eb" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Inspect Consumer Grievance
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", backgroundColor: "#f8fafc", padding: "0.85rem", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>PRODUCT NAME</div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedIssue.product_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>CATEGORY</div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedIssue.category?.replace(/_/g, " ")}</div>
                </div>
                {selectedIssue.store_name && (
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>RETAIL STORE</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{selectedIssue.store_name}</div>
                  </div>
                )}
                {selectedIssue.store_address && (
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>STORE ADDRESS</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{selectedIssue.store_address}</div>
                  </div>
                )}
              </div>

              <div>
                <strong style={{ color: "#475569" }}>Citizen's Statement:</strong>
                <div style={{ marginTop: "0.35rem", padding: "0.75rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#1e293b", lineHeight: 1.5 }}>
                  {selectedIssue.description}
                </div>
              </div>

              {/* Voice Note Player */}
              {selectedIssue.audio_url && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "#2563eb", marginBottom: "0.35rem" }}>
                    <Mic size={15} />
                    <span>Citizen Voice Recording</span>
                  </div>
                  <audio controls src={selectedIssue.audio_url} style={{ width: "100%", height: "36px" }} />
                </div>
              )}

              {/* Attached Photo */}
              {selectedIssue.image_url && (
                <div>
                  <strong style={{ color: "#475569" }}>Photo Evidence:</strong>
                  <div style={{ marginTop: "0.35rem" }}>
                    <a href={selectedIssue.image_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedIssue.image_url}
                        alt="Citizen Evidence"
                        style={{ maxHeight: "200px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "block" }}
                      />
                    </a>
                  </div>
                </div>
              )}

              {/* Geolocation with Google Maps link */}
              {selectedIssue.location_latitude && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MapPin size={16} color="#059669" />
                  <span>
                    GPS: {selectedIssue.location_latitude.toFixed(5)}, {selectedIssue.location_longitude?.toFixed(5)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${selectedIssue.location_latitude},${selectedIssue.location_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8rem" }}
                  >
                    <span>View Map</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Status Update */}
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Grievance Enforcement Status
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
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="RESOLVED">RESOLVED (Action Taken)</option>
                  <option value="REJECTED">REJECTED / DISMISSED</option>
                </select>
              </div>

              {/* Official Admin Feedback */}
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Official Directorate Feedback (Visible to Citizen)
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Complaint verified; notice issued to retailer under Sec. 36 of LM Act..."
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
                  <span>Update Grievance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
