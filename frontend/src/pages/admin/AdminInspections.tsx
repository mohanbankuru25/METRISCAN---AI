import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import { reportService } from "../../services/reportService";
import type { InspectionRecord } from "../../types/platform";
import {
  ScanLine,
  Search,
  Filter,
  Eye,
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  FileDown,
  Calendar,
  UserCheck,
  Package,
  ShieldCheck
} from "lucide-react";

export function AdminInspections() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Inspection Detail Modal
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getRecentInspections(100);
      setRecords(data);
    } catch (err: any) {
      console.error("Failed to load inspections:", err);
      setError(err?.message || "Failed to load inspections from Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (r.inspection_number && r.inspection_number.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.product?.product_name && r.product.product_name.toLowerCase().includes(q)) ||
      (r.inspector_name && r.inspector_name.toLowerCase().includes(q)) ||
      (r.product?.category && r.product.category.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PASS") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.2rem 0.55rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            background: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0"
          }}
        >
          <CheckCircle size={12} /> PASS
        </span>
      );
    }
    if (s === "FAIL") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.2rem 0.55rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca"
          }}
        >
          <XCircle size={12} /> FAIL
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.2rem 0.55rem",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: 700,
          background: "#fffbeb",
          color: "#b45309",
          border: "1px solid #fde68a"
        }}
      >
        <AlertTriangle size={12} /> REVIEW
      </span>
    );
  };

  const handleDownloadReport = async (inspection: InspectionRecord) => {
    setDownloadingReport(true);
    try {
      // Find report by inspection id
      const reports = await reportService.getReports();
      const match = reports.find((r: any) => r.inspection_id === inspection.id);
      if (match) {
        await reportService.downloadStoredReport(match.id, "pdf");
      } else {
        alert("Certified report PDF is being generated or was not stored for this record.");
      }
    } catch (err: any) {
      alert("Error downloading report: " + (err?.message || "Storage error"));
    } finally {
      setDownloadingReport(false);
    }
  };

  const totalCount = records.length;
  const passCount = records.filter((r) => r.status === "PASS").length;
  const failCount = records.filter((r) => r.status === "FAIL").length;
  const reviewCount = records.filter((r) => r.status === "REVIEW").length;

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ScanLine size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Statutory Inspection Registry
                </h1>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Centralized database of Legal Metrology packaged commodity compliance evaluations across all field jurisdictions.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button onClick={() => navigate("/admin")} className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={fetchRecords}
                className="btn btn-secondary btn-sm"
                title="Refresh Records"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "1rem",
              marginTop: "1.25rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid #e2e8f0"
            }}
          >
            <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Inspections</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>{totalCount}</div>
            </div>
            <div style={{ padding: "0.75rem 1rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Compliant (Pass)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#15803d", marginTop: "0.2rem" }}>{passCount}</div>
            </div>
            <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
              <div style={{ fontSize: "0.75rem", color: "#991b1b", fontWeight: 600, textTransform: "uppercase" }}>Violations (Fail)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: "0.2rem" }}>{failCount}</div>
            </div>
            <div style={{ padding: "0.75rem 1rem", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: "0.75rem", color: "#92400e", fontWeight: 600, textTransform: "uppercase" }}>Under Review</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", marginTop: "0.2rem" }}>{reviewCount}</div>
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
                placeholder="Search by Inspection ID, commodity name, brand, or officer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.25rem", width: "100%", fontSize: "0.875rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <Filter size={15} color="#64748b" />
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Filter Status:</span>
              {(["ALL", "PASS", "FAIL", "REVIEW"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn btn-sm ${statusFilter === st ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
            <button onClick={fetchRecords} className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
              Retry
            </button>
          </div>
        )}

        {/* Inspections Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <span>Verified Supabase Inspection Records ({filtered.length})</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
              Live statutory audit records
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3.5rem", gap: "0.75rem" }}>
              <Loader2 size={32} className="spin-animate" color="#1e3a8a" />
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading inspections from Supabase PostgreSQL...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "#64748b" }}>
              <ScanLine size={48} color="#cbd5e1" style={{ margin: "0 auto 1rem", display: "block" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No inspection records found.</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>No inspections match the search criteria in Supabase.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Inspection ID</th>
                    <th>Product / Commodity</th>
                    <th>Category</th>
                    <th>Officer</th>
                    <th>Timestamp</th>
                    <th>Statutory Status</th>
                    <th>Score</th>
                    <th style={{ textAlign: "right" }}>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const score = item.compliance_score ?? 0;
                    const scoreColor = score >= 85 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";

                    return (
                      <tr key={item.id}>
                        <td className="mono" style={{ fontWeight: 700, color: "#1e3a8a" }}>
                          {item.inspection_number || item.id.substring(0, 8)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {item.product?.product_name || "Packaged Commodity"}
                          </div>
                          {item.product?.brand_name && (
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              Brand: {item.product.brand_name}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "0.825rem", color: "#475569" }}>
                          {item.product?.category || "General Commodity"}
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                            {item.inspector_name || "Legal Metrology Officer"}
                          </div>
                          {item.inspector_badge && (
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                              {item.inspector_badge}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {item.inspection_date
                            ? new Date(item.inspection_date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "N/A"}
                        </td>
                        <td>{getStatusBadge(item.status)}</td>
                        <td>
                          <span style={{ fontWeight: 800, color: scoreColor, fontSize: "0.95rem" }}>
                            {score}%
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => setSelectedInspection(item)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.3rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <Eye size={13} />
                            <span>Dossier</span>
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

      {/* INSPECTION DOSSIER MODAL */}
      {selectedInspection && (
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
              maxWidth: "700px",
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
                <ShieldCheck size={22} color="#1e3a8a" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>
                    Inspection Dossier #{selectedInspection.inspection_number || selectedInspection.id.substring(0, 8)}
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Supabase Internal Record ID: {selectedInspection.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedInspection(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.25rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Product Info Strip */}
              <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Package size={16} color="#1e3a8a" />
                  <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>
                    {selectedInspection.product?.product_name || "Packaged Commodity"}
                  </strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.825rem", color: "#475569" }}>
                  <div>Brand: <strong>{selectedInspection.product?.brand_name || "N/A"}</strong></div>
                  <div>Category: <strong>{selectedInspection.product?.category || "General"}</strong></div>
                  <div>Declared MRP: <strong>{selectedInspection.product?.mrp ? `₹${selectedInspection.product.mrp}` : "N/A"}</strong></div>
                  <div>Declared Net Qty: <strong>{selectedInspection.product?.net_quantity || "N/A"}</strong></div>
                </div>
              </div>

              {/* Status and Score Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div style={{ padding: "0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Statutory Finding</div>
                  <div style={{ marginTop: "0.35rem" }}>{getStatusBadge(selectedInspection.status)}</div>
                </div>
                <div style={{ padding: "0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Compliance Score</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e3a8a", marginTop: "0.2rem" }}>
                    {selectedInspection.compliance_score ?? 0}%
                  </div>
                </div>
                <div style={{ padding: "0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Checks Passed</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d", marginTop: "0.2rem" }}>
                    {selectedInspection.passed_checks ?? 0} / {selectedInspection.total_checks ?? 0}
                  </div>
                </div>
              </div>

              {/* Image Evidence Preview if Available */}
              {selectedInspection.image_url && (
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Photographic Physical Evidence:
                  </div>
                  <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", maxHeight: "240px", display: "flex", justifyContent: "center", background: "#0f172a" }}>
                    <img
                      src={selectedInspection.image_url}
                      alt="Commodity Evidence"
                      style={{ maxHeight: "240px", width: "auto", objectFit: "contain" }}
                    />
                  </div>
                </div>
              )}

              {/* Inspector Details */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <UserCheck size={14} />
                  <span>Inspected by: <strong>{selectedInspection.inspector_name || "Official"}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Calendar size={14} />
                  <span>{new Date(selectedInspection.inspection_date).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <button
                  onClick={() => handleDownloadReport(selectedInspection)}
                  className="btn btn-primary btn-sm"
                  disabled={downloadingReport}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {downloadingReport ? <Loader2 size={14} className="spin-animate" /> : <FileDown size={14} />}
                  <span>Download Stored PDF Report</span>
                </button>

                <button onClick={() => setSelectedInspection(null)} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
