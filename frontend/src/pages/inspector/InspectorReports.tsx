import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { historyService } from "../../services/historyService";
import { downloadReportPdf, downloadReportDocx, downloadStoredReport, viewReportPdf } from "../../services/reportService";
import type { ScanHistoryItem } from "../../types/history";
import { FileText, Download, Eye, Loader2, Scale, ArrowLeft, AlertCircle } from "lucide-react";
import { useLanguage } from "../../i18n";

export function InspectorReports() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<"PDF" | "DOCX" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const loaded = await historyService.getScans();
        setScans(loaded);
      } catch (err) {
        console.error("Failed to load reports:", err);
      }
    }
    loadReports();
  }, []);

  const handleDownload = async (scan: ScanHistoryItem, format: "PDF" | "DOCX") => {
    setDownloadingId(scan.id);
    setDownloadType(format);
    setErrorMsg(null);

    try {
      await downloadStoredReport(scan.id, format.toLowerCase() as "pdf" | "docx", undefined, language);
    } catch (err: any) {
      console.warn("Direct storage download notice, trying generation fallback:", err);
      try {
        const safeName = (scan.productName || "Product").replace(/[^a-zA-Z0-9_-]/g, "_");
        const payload = {
          id: scan.id,
          inspection_id: scan.id,
          inspection_number: scan.filename,
          product_name: scan.productName,
          category: scan.category,
          product_data: scan.fullData?.product_data || {},
          ocr_details: scan.fullData?.ocr_details || [],
          ocr_data: scan.fullData,
          compliance_result: scan.fullData?.compliance,
          inspection_date: scan.timestamp,
          language: language,
        };
        if (format === "PDF") {
          await downloadReportPdf(payload, `Inspection_Report_${safeName}_${language}.pdf`, language);
        } else {
          await downloadReportDocx(payload, `Inspection_Report_${safeName}_${language}.docx`, language);
        }
      } catch (fallbackErr: any) {
        setErrorMsg(fallbackErr.message || "Failed to download report. Ensure backend server is running.");
      }
    } finally {
      setDownloadingId(null);
      setDownloadType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === "PASS") return <span className="badge badge-pass">✓ PASS</span>;
    if (s === "FAIL") return <span className="badge badge-fail">✕ FAIL</span>;
    return <span className="badge badge-review">⚠ REVIEW</span>;
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header Banner */}
        <div className="panel-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={24} color="#2563eb" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a" }}>
                  Inspection Reports & Dossiers
                </h1>
              </div>
              <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
                Official statutory inspection reports generated under Legal Metrology Rules, 2011.
              </p>
            </div>

            <button onClick={() => navigate("/inspector")} className="btn btn-secondary btn-sm">
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "0.85rem 1.15rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem"
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Reports Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Scale size={18} color="#2563eb" />
              <span>Available Inspection Dossiers ({scans.length})</span>
            </div>
          </div>

          {scans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <FileText size={36} color="#cbd5e1" style={{ margin: "0 auto 0.75rem" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No inspection reports recorded yet.</p>
              <button
                onClick={() => navigate("/inspector/scan")}
                className="btn btn-blue btn-sm"
                style={{ marginTop: "1rem" }}
              >
                Start New Inspection
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Report Code</th>
                    <th>Product Description</th>
                    <th>Category</th>
                    <th>Inspection Date</th>
                    <th>Status</th>
                    <th>Compliance Score</th>
                    <th style={{ textAlign: "right" }}>Export Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan, idx) => {
                    const code = `REP-2026-${String(idx + 101).padStart(4, "0")}`;
                    const dateObj = new Date(scan.timestamp);
                    const formattedDate = dateObj.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    const isDownloadingThis = downloadingId === scan.id;

                    return (
                      <tr key={scan.id}>
                        <td className="mono" style={{ fontWeight: 700, color: "#2563eb" }}>
                          {code}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{scan.productName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{scan.filename}</div>
                        </td>
                        <td style={{ fontSize: "0.825rem", color: "#475569" }}>{scan.category}</td>
                        <td style={{ fontSize: "0.825rem", color: "#475569" }}>{formattedDate}</td>
                        <td>{getStatusBadge(scan.status)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: scan.score >= 80 ? "#059669" : "#d97706" }}>
                            {scan.score}%
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                            <button
                              onClick={async () => {
                                try {
                                  await viewReportPdf(scan.id, language);
                                } catch (err: any) {
                                  alert("Failed to open report PDF: " + (err?.message || "File error"));
                                }
                              }}
                              className="btn btn-blue btn-sm"
                              title="Open official PDF report directly in browser tab"
                              style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }}
                            >
                              <Eye size={13} />
                              <span>View PDF</span>
                            </button>

                            <button
                              onClick={() => handleDownload(scan, "PDF")}
                              disabled={isDownloadingThis && downloadType === "PDF"}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
                              title="Download Official PDF Report"
                            >
                              {isDownloadingThis && downloadType === "PDF" ? (
                                <Loader2 size={13} className="spin-animate" />
                              ) : (
                                <Download size={13} />
                              )}
                              <span>PDF</span>
                            </button>

                            <button
                              onClick={() => handleDownload(scan, "DOCX")}
                              disabled={isDownloadingThis && downloadType === "DOCX"}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
                              title="Download Official DOCX Report"
                            >
                              {isDownloadingThis && downloadType === "DOCX" ? (
                                <Loader2 size={13} className="spin-animate" />
                              ) : (
                                <FileText size={13} />
                              )}
                              <span>DOCX</span>
                            </button>

                            <button
                              onClick={() => navigate(`/history/${scan.id}`)}
                              className="btn btn-secondary btn-sm"
                              title="View Full Inspection Dossier"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
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
    </PageContainer>
  );
}
