import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import type { AuditLog } from "../../types/platform";
import {
  Activity,
  ArrowLeft,
  Search,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  X,
  ShieldCheck,
} from "lucide-react";

export function AdminLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getActivityLogs(100);
      setLogs(data);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
      setError(err?.message || "Failed to load audit logs from Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionsList = ["ALL", ...Array.from(new Set(logs.map((l) => l.action).filter(Boolean)))];

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(q)) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(q)) ||
      (l.ip_address && l.ip_address.toLowerCase().includes(q));

    const matchesAction = actionFilter === "ALL" || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("INSERT")) return { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" };
    if (action.includes("UPDATE") || action.includes("TOGGLE")) return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
    if (action.includes("DELETE") || action.includes("DEACTIVATE")) return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
    if (action.includes("LOGIN") || action.includes("AUTH")) return { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" };
    return { bg: "#f8fafc", text: "#334155", border: "#e2e8f0" };
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Activity size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Statutory System Audit Trail
                </h1>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Immutable legal audit register recording authentication, inspection scans, rule amendments, and report access in Supabase.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button onClick={() => navigate("/admin")} className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={fetchLogs}
                className="btn btn-secondary btn-sm"
                title="Refresh Audit Logs"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="panel-card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "relative", flex: "1 1 300px" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search audit trail by officer name, action, entity, or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.25rem", width: "100%", fontSize: "0.875rem" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Action Filter:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              >
                {actionsList.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
            <button onClick={fetchLogs} className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
              Retry
            </button>
          </div>
        )}

        {/* Logs Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <span>Verified Supabase Audit Entries ({filtered.length})</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
              Live Supabase table: <code>audit_logs</code>
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3.5rem", gap: "0.75rem" }}>
              <Loader2 size={32} className="spin-animate" color="#1e3a8a" />
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading audit records from Supabase PostgreSQL...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "#64748b" }}>
              <Activity size={48} color="#cbd5e1" style={{ margin: "0 auto 1rem", display: "block" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No audit logs found matching criteria.</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Actions taken across the platform are logged automatically.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Officer / User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th style={{ textAlign: "right" }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const badge = getActionBadgeColor(log.action || "");

                    return (
                      <tr key={log.id}>
                        <td className="mono" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })
                            : "N/A"}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {log.user_name || "System"}
                          </div>
                          {log.ip_address && (
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                              IP: {log.ip_address}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              backgroundColor: log.user_role === "ADMIN" ? "#eff6ff" : "#f1f5f9",
                              color: log.user_role === "ADMIN" ? "#1d4ed8" : "#475569",
                              border: `1px solid ${log.user_role === "ADMIN" ? "#bfdbfe" : "#cbd5e1"}`
                            }}
                          >
                            {log.user_role || "SERVICE"}
                          </span>
                        </td>
                        <td>
                          <span
                            className="mono"
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "4px",
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.825rem", color: "#475569" }}>
                          {log.entity_type || "N/A"}
                        </td>
                        <td className="mono" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {log.entity_id ? (log.entity_id.length > 14 ? log.entity_id.substring(0, 14) + "..." : log.entity_id) : "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => setViewingLog(log)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.25rem 0.5rem" }}
                            title="Inspect Details"
                          >
                            <Eye size={13} />
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

      {/* AUDIT DETAIL MODAL */}
      {viewingLog && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem"
          }}
        >
          <div
            className="panel-card"
            style={{
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "0.75rem",
                marginBottom: "1.25rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck size={20} color="#1e3a8a" />
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                  Audit Record Dossier
                </h3>
              </div>
              <button
                onClick={() => setViewingLog(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.25rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.875rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Action:</span>
                  <div style={{ fontWeight: 800, color: "#1e3a8a", fontFamily: "var(--font-mono)" }}>
                    {viewingLog.action}
                  </div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Timestamp:</span>
                  <div style={{ color: "#0f172a" }}>
                    {viewingLog.created_at ? new Date(viewingLog.created_at).toLocaleString("en-IN") : "N/A"}
                  </div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>User / Officer:</span>
                  <div>{viewingLog.user_name || "System"} ({viewingLog.user_role || "N/A"})</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>IP Address:</span>
                  <div style={{ fontFamily: "var(--font-mono)" }}>{viewingLog.ip_address || "127.0.0.1"}</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Entity Type:</span>
                  <div>{viewingLog.entity_type || "N/A"}</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Entity ID:</span>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", wordBreak: "break-all" }}>
                    {viewingLog.entity_id || "N/A"}
                  </div>
                </div>
              </div>

              {viewingLog.details && (
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Action Metadata / Payload:</span>
                  <pre
                    style={{
                      background: "#0f172a",
                      color: "#38bdf8",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      overflowX: "auto",
                      marginTop: "0.35rem",
                      maxHeight: "200px"
                    }}
                  >
                    {typeof viewingLog.details === "string"
                      ? viewingLog.details
                      : JSON.stringify(viewingLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewingLog(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
