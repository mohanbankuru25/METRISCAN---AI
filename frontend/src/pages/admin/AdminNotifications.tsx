import { useState, useEffect } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import type { RuleRequest } from "../../types/platform";
import {
  Bell,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Eye,
  Clock,
  User,
  ExternalLink,
  Check,
  Ban
} from "lucide-react";

export function AdminNotifications() {
  const [requests, setRequests] = useState<RuleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Review Modal
  const [selectedRequest, setSelectedRequest] = useState<RuleRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getRuleRequests(statusFilter !== "ALL" ? statusFilter : undefined);
      setRequests(data);
    } catch (err: any) {
      console.error("Failed to load rule requests:", err);
      setError(err?.message || "Failed to load notifications from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const openReviewModal = (req: RuleRequest) => {
    setSelectedRequest(req);
    setAdminResponse(req.admin_response || "");
    setUpdateSuccess(null);
  };

  const handleUpdateStatus = async (newStatus: "UNDER_REVIEW" | "RESOLVED" | "REJECTED") => {
    if (!selectedRequest) return;
    setUpdating(true);
    try {
      const updated = await adminService.updateRuleRequest(
        selectedRequest.id,
        newStatus,
        adminResponse.trim()
      );
      setRequests((prev) => prev.map((r) => (r.id === selectedRequest.id ? updated : r)));
      setSelectedRequest(updated);
      setUpdateSuccess(`Request marked as ${newStatus.replace("_", " ")}.`);
      setTimeout(() => {
        setSelectedRequest(null);
        setUpdateSuccess(null);
      }, 1200);
    } catch (err: any) {
      alert("Failed to update request: " + (err?.message || "Error"));
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { label: "RESOLVED", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
      case "UNDER_REVIEW":
        return { label: "UNDER REVIEW", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "REJECTED":
        return { label: "DISMISSED", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
      default:
        return { label: "PENDING", bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = search.toLowerCase();
    const inspectorName = (r.profiles?.full_name || "").toLowerCase();
    const inspectorUsername = (r.profiles?.username || "").toLowerCase();
    const subject = (r.subject || "").toLowerCase();
    const desc = (r.description || "").toLowerCase();
    const ruleCode = (r.rule_code || "").toLowerCase();
    const type = (r.request_type || "").toLowerCase();

    return (
      !search ||
      inspectorName.includes(q) ||
      inspectorUsername.includes(q) ||
      subject.includes(q) ||
      desc.includes(q) ||
      ruleCode.includes(q) ||
      type.includes(q)
    );
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Bell size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Notifications &amp; Rule Requests
                </h1>
                {pendingCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "9999px",
                      backgroundColor: "#fee2e2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca"
                    }}
                  >
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Review statutory rule modification suggestions, discrepancies, and inquiries submitted by field enforcement officers.
              </p>
            </div>

            <button
              onClick={fetchRequests}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Refresh requests"
            >
              <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
              <span>Sync Live Requests</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", flexWrap: "wrap" }}>
            {["ALL", "PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className="btn btn-sm"
                style={{
                  backgroundColor: statusFilter === st ? "#eff6ff" : "transparent",
                  color: statusFilter === st ? "#1d4ed8" : "#64748b",
                  border: statusFilter === st ? "1px solid #bfdbfe" : "none",
                  fontWeight: statusFilter === st ? 700 : 500,
                  textTransform: "uppercase",
                  fontSize: "0.78rem"
                }}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="panel-card" style={{ padding: "0.85rem 1.25rem" }}>
          <div style={{ position: "relative", maxWidth: "420px" }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search by officer, subject, rule code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "2.25rem", width: "100%", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
            <button onClick={fetchRequests} className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
              Retry
            </button>
          </div>
        )}

        {/* Notifications Grid / List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", gap: "0.75rem" }}>
            <Loader2 size={32} className="spin-animate" color="#1e3a8a" />
            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading rule requests from Supabase...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="panel-card" style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
            <Bell size={40} color="#cbd5e1" style={{ margin: "0 auto 0.75rem", display: "block" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No rule requests found.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              When inspectors submit rule suggestions or inquiries, they will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filteredRequests.map((req) => {
              const badge = getStatusBadge(req.status);
              const inspectorName = req.profiles?.full_name || "Enforcement Officer";
              const inspectorUsername = req.profiles?.username || req.profiles?.email || req.inspector_id.substring(0, 8);

              return (
                <div
                  key={req.id}
                  className="panel-card"
                  style={{
                    padding: "1.25rem",
                    borderLeft: `4px solid ${req.status === "PENDING" ? "#f59e0b" : req.status === "UNDER_REVIEW" ? "#2563eb" : req.status === "RESOLVED" ? "#16a34a" : "#cbd5e1"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        NEW RULE REQUEST
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.55rem", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#334155" }}>
                          {req.request_type}
                        </span>
                        {req.rule_code && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.2rem 0.55rem", backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: "4px", fontFamily: "var(--font-mono)" }}>
                            {req.rule_code}
                          </span>
                        )}
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: 700 }}>
                          {req.subject}
                        </h3>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <button
                        onClick={() => openReviewModal(req)}
                        className="btn btn-primary btn-sm"
                        style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                      >
                        <Eye size={13} />
                        <span>View Request</span>
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#334155", lineHeight: 1.5 }}>
                    {req.description}
                  </p>

                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem", color: "#64748b", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #f1f5f9", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <User size={13} color="#2563eb" />
                      <span><strong>Inspector:</strong> {inspectorName} (<code style={{ color: "#2563eb" }}>{inspectorUsername}</code>)</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Clock size={13} />
                      <span>Submitted: {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {req.admin_response && (
                      <div style={{ color: "#047857", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <CheckCircle size={13} />
                        <span>Response Recorded</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADMIN REVIEW REQUEST MODAL */}
      {selectedRequest && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.85rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  STATUTORY RULE REQUEST DOSSIER
                </div>
                <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.25rem", color: "#0f172a", fontWeight: 700 }}>
                  {selectedRequest.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.35rem" }}
              >
                <X size={16} />
              </button>
            </div>

            {updateSuccess && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: "1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle size={16} />
                <span>{updateSuccess}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
              {/* Officer & Request Type metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Submitting Officer</span>
                  <strong style={{ color: "#0f172a" }}>{selectedRequest.profiles?.full_name || "Enforcement Inspector"}</strong>
                  <div style={{ fontSize: "0.72rem", color: "#2563eb", fontFamily: "var(--font-mono)" }}>
                    {selectedRequest.profiles?.username || selectedRequest.profiles?.email || selectedRequest.inspector_id}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Request Classification</span>
                  <strong style={{ color: "#0f172a" }}>{selectedRequest.request_type}</strong>
                  {selectedRequest.rule_code && (
                    <div style={{ fontSize: "0.75rem", color: "#1d4ed8", fontWeight: 700 }}>
                      Target: {selectedRequest.rule_code}
                    </div>
                  )}
                </div>

                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Current Status</span>
                  {(() => {
                    const badge = getStatusBadge(selectedRequest.status);
                    return (
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, display: "inline-block", marginTop: "0.2rem" }}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Description */}
              <div>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.35rem" }}>
                  Officer's Description &amp; Proposed Change:
                </strong>
                <p style={{ margin: 0, backgroundColor: "#f8fafc", padding: "0.85rem", borderRadius: "6px", border: "1px solid #f1f5f9", color: "#334155", lineHeight: 1.5 }}>
                  {selectedRequest.description}
                </p>
              </div>

              {/* Supporting Evidence link if present */}
              {selectedRequest.evidence_url && (
                <div>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.35rem" }}>
                    Supporting Document / Evidence:
                  </strong>
                  <a
                    href={selectedRequest.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#1d4ed8" }}
                  >
                    <ExternalLink size={13} />
                    <span>Open Attached Evidence File</span>
                  </a>
                </div>
              )}

              {/* Admin Response Textarea */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  Directorate Administrator Response / Resolution Notes:
                </label>
                <textarea
                  rows={3}
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Enter resolution notes, regulatory rationale, or actions taken for the inspector..."
                  className="form-input"
                  style={{ width: "100%", fontSize: "0.85rem", resize: "vertical" }}
                />
                <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                  * This response will be visible to the submitting officer in their "My Requests" view.
                </span>
              </div>
            </div>

            {/* Modal Action Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="btn btn-secondary btn-sm"
                disabled={updating}
              >
                Close
              </button>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("UNDER_REVIEW")}
                  className="btn btn-secondary btn-sm"
                  style={{ color: "#1d4ed8", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
                  disabled={updating}
                >
                  Mark Under Review
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus("REJECTED")}
                  className="btn btn-secondary btn-sm"
                  style={{ color: "#dc2626", borderColor: "#fecaca" }}
                  disabled={updating}
                >
                  <Ban size={13} />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus("RESOLVED")}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: "#166534", borderColor: "#166534", display: "flex", alignItems: "center", gap: "0.35rem" }}
                  disabled={updating}
                >
                  {updating ? <Loader2 size={13} className="spin-animate" /> : <Check size={13} />}
                  <span>Resolve Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
