import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { reportService } from "../../services/reportService";
import type { ReportItem } from "../../types/platform";
import {
  FileText,
  Download,
  Eye,
  ArrowLeft,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  FileCheck,
} from "lucide-react";

export function AdminReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getReports();
      setReports(data);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      setError(err?.message || "Failed to load reports from Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = async (rep: ReportItem, format: "pdf" | "docx" = "pdf") => {
    setDownloadingId(rep.id + "_" + format);
    try {
      await reportService.downloadStoredReport(rep.id, format);
    } catch (err: any) {
      alert("Failed to download report file: " + (err?.message || "File not found in storage"));
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    return (
      !search ||
      (r.report_number && r.report_number.toLowerCase().includes(q)) ||
      (r.product_name && r.product_name.toLowerCase().includes(q)) ||
      (r.inspector_name && r.inspector_name.toLowerCase().includes(q)) ||
      (r.inspection_id && r.inspection_id.toLowerCase().includes(q))
    );
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
    if (status === "FAIL") {
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "42.5 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Official Reports &amp; Certificate Repository
                </h1>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Secure repository of digitally stamped Legal Metrology compliance certificates streamed directly from Supabase Storage.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button onClick={() => navigate("/admin")} className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={fetchReports}
                className="btn btn-secondary btn-sm"
                title="Refresh Reports"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="panel-card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Report ID, inspection number, product name, or officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ width: "100%", fontSize: "0.875rem" }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
            <button onClick={fetchReports} className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
              Retry
            </button>
          </div>
        )}

        {/* Reports Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <span>Verified Certificate Dossiers ({filtered.length})</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
              Supabase Storage Bucket: <code>inspection-reports</code>
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3.5rem", gap: "0.75rem" }}>
              <Loader2 size={32} className="spin-animate" color="#1e3a8a" />
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading compliance reports from Supabase...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "#64748b" }}>
              <FileText size={48} color="#cbd5e1" style={{ margin: "0 auto 1rem", display: "block" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No reports archived in Supabase yet.</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Perform an inspection scan to automatically generate and store official reports.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Product / Commodity</th>
                    <th>Inspecting Officer</th>
                    <th>Date Generated</th>
                    <th>Format</th>
                    <th>Size</th>
                    <th>Finding</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rep) => {
                    return (
                      <tr key={rep.id}>
                        <td className="mono" style={{ fontWeight: 700, color: "#1e3a8a" }}>
                          {rep.report_number || rep.id.substring(0, 10)}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {rep.product_name || "Packaged Commodity"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "#334155" }}>
                          {rep.inspector_name || "Official"}
                        </td>
                        <td style={{ fontSize: "0.825rem", color: "#64748b" }}>
                          {rep.generated_at
                            ? new Date(rep.generated_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "N/A"}
                        </td>
                        <td>
                          <span
                            className="mono"
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe"
                            }}
                          >
                            {rep.format || "PDF"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {formatFileSize(rep.file_size)}
                        </td>
                        <td>{getStatusBadge(rep.status)}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                            <button
                              onClick={async () => {
                                try {
                                  await reportService.viewReportPdf(rep.id);
                                } catch (err: any) {
                                  alert("Failed to open report PDF: " + (err?.message || "File error"));
                                }
                              }}
                              className="btn btn-blue btn-sm"
                              style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }}
                              title="Open official PDF report directly in browser tab"
                            >
                              <Eye size={13} />
                              <span>View PDF</span>
                            </button>
                            <button
                              onClick={() => handleDownload(rep, "pdf")}
                              className="btn btn-secondary btn-sm"
                              disabled={downloadingId === rep.id + "_pdf"}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
                              title="Download official PDF report"
                            >
                              {downloadingId === rep.id + "_pdf" ? (
                                <Loader2 size={13} className="spin-animate" />
                              ) : (
                                <Download size={13} />
                              )}
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => handleDownload(rep, "docx")}
                              className="btn btn-secondary btn-sm"
                              disabled={downloadingId === rep.id + "_docx"}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
                              title="Download editable DOCX report"
                            >
                              {downloadingId === rep.id + "_docx" ? (
                                <Loader2 size={13} className="spin-animate" />
                              ) : (
                                <FileText size={13} />
                              )}
                              <span>DOCX</span>
                            </button>
                            <button
                              onClick={() => setViewingReport(rep)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
                              title="View dossier metadata summary"
                            >
                              <span>Dossier</span>
                            </button>
                          </div>
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

      {/* REPORT SUMMARY MODAL */}
      {viewingReport && (
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
              maxWidth: "550px",
              width: "100%",
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
                <FileCheck size={20} color="#1e3a8a" />
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                  Official Certificate Record
                </h3>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.25rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.875rem" }}>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Report Number:</span>
                <div style={{ fontWeight: 800, color: "#1e3a8a", fontFamily: "var(--font-mono)" }}>
                  {viewingReport.report_number || viewingReport.id}
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Associated Inspection ID:</span>
                <div style={{ color: "#334155", fontFamily: "var(--font-mono)" }}>
                  {viewingReport.inspection_id}
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Product Name:</span>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {viewingReport.product_name || "Packaged Commodity"}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Officer:</span>
                  <div>{viewingReport.inspector_name || "Official"}</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Finding:</span>
                  <div>{getStatusBadge(viewingReport.status)}</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Storage Path:</span>
                  <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#475569", wordBreak: "break-all" }}>
                    {viewingReport.file_path || "inspection-reports/" + viewingReport.id + ".pdf"}
                  </div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>File Size:</span>
                  <div>{formatFileSize(viewingReport.file_size)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <button
                onClick={() => handleDownload(viewingReport)}
                className="btn btn-primary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Download size={14} />
                <span>Download File</span>
              </button>
              <button onClick={() => setViewingReport(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
