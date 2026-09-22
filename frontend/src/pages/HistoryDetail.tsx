import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { ComplianceSummary } from "../components/compliance/ComplianceSummary";
import { ProductInformation } from "../components/product/ProductInformation";
import { EvidenceViewer } from "../components/compliance/EvidenceViewer";
import { RuleList } from "../components/compliance/RuleList";
import { AIStatus } from "../components/scanner/AIStatus";
import { historyService } from "../services/historyService";
import type { ScanHistoryItem } from "../types/history";
import type { ComplianceRuleResult } from "../types/compliance";
import { ArrowLeft, Printer, Download, Calendar, Scale, Cpu, ChevronDown, ChevronUp, FileText, Loader2, Eye } from "lucide-react";
import { downloadReportPdf, downloadReportDocx, viewReportPdf } from "../services/reportService";
import { useLanguage } from "../i18n";

export function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [scan, setScan] = useState<ScanHistoryItem | null>(null);
  const [selectedRule, setSelectedRule] = useState<ComplianceRuleResult | null>(null);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadingDocx, setDownloadingDocx] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      setLoading(true);
      try {
        const item = await historyService.getScanById(id);
        setScan(item);
      } catch (err) {
        console.error("Failed to load inspection by ID:", err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1rem", gap: "1rem" }}>
          <Loader2 size={36} className="spin-animate" color="#1e3a8a" />
          <span style={{ fontSize: "0.9rem", color: "#64748b" }}>Loading inspection dossier from Supabase...</span>
        </div>
      </PageContainer>
    );
  }

  if (!scan) {
    return (
      <PageContainer>
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <Scale size={48} color="#94a3b8" style={{ margin: "0 auto 1rem" }} />
          <h3>Inspection Report Not Found</h3>
          <p style={{ color: "#64748b", margin: "0.5rem 0 1.5rem" }}>
            The requested scan report could not be found in Supabase or you do not have permission to view it.
          </p>
          <button onClick={() => navigate("/history")} className="btn btn-primary btn-sm">
            Return to Inspection History
          </button>
        </div>
      </PageContainer>
    );
  }

  const fullData = scan.fullData || {};
  const productData = fullData.product_data || fullData.paddle_data || fullData.gemini_data || null;
  const compliance = fullData.compliance || {
    overall_status: scan.status,
    score: scan.score,
    results: []
  };

  const rules = compliance.results || [];

  const processedUrl = fullData.processed_image
    ? `http://127.0.0.1:8000/${fullData.processed_image.replace(/\\/g, "/")}`
    : undefined;

  const imageUrl = scan.previewUrl || processedUrl || "https://placehold.co/600x400?text=Product+Package";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!scan) return;
    try {
      setDownloadingPdf(true);
      await downloadReportPdf(scan, `Compliance_Report_${scan.id || "inspection"}_${language}.pdf`, language);
    } catch (err: any) {
      alert(err.message || "Failed to download PDF report");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!scan) return;
    try {
      setDownloadingDocx(true);
      await downloadReportDocx(scan, `Compliance_Report_${scan.id || "inspection"}_${language}.docx`, language);
    } catch (err: any) {
      alert(err.message || "Failed to download DOCX report");
    } finally {
      setDownloadingDocx(false);
    }
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Navigation & Report Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <button onClick={() => navigate("/history")} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
            <span>Back to History</span>
          </button>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={async () => {
                if (!scan) return;
                try {
                  await viewReportPdf(scan.id, language);
                } catch (err: any) {
                  alert(err.message || "Failed to open PDF report.");
                }
              }}
              className="btn btn-secondary btn-sm"
              title="Open certified PDF compliance report directly in browser tab"
            >
              <Eye size={15} color="#2563eb" />
              <span>View Official PDF</span>
            </button>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm" title="Print browser view">
              <Printer size={15} />
              <span>Print View</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn btn-blue btn-sm"
              style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
              title="Download official print-ready PDF compliance report"
            >
              {downloadingPdf ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              <span>{downloadingPdf ? "Generating PDF..." : "Export PDF Report"}</span>
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={downloadingDocx}
              className="btn btn-secondary btn-sm"
              style={{ backgroundColor: "#0284c7", color: "#ffffff", borderColor: "#0284c7" }}
              title="Download editable Microsoft Word inspection report"
            >
              {downloadingDocx ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
              <span>{downloadingDocx ? "Generating DOCX..." : "Export Editable DOCX"}</span>
            </button>
          </div>
        </div>

        {/* Report Official Banner */}
        <div
          className="panel-card"
          style={{
            backgroundColor: "#ffffff",
            borderLeft: "5px solid #2563eb",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.725rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Official Inspection Report — Legal Metrology (Packaged Commodities) Rules, 2011
              </div>
              <h1 style={{ fontSize: "1.5rem", margin: "0.2rem 0 0", color: "#0f172a" }}>
                {scan.productName}
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#64748b", backgroundColor: "#f8fafc", padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Calendar size={14} color="#2563eb" />
              <span>
                Inspected: {new Date(scan.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* Compliance Verdict Summary */}
        <ComplianceSummary compliance={compliance} />

        {/* Technical AI Details Expandable Accordion */}
        <div className="panel-card" style={{ padding: "0.85rem 1.25rem" }}>
          <div
            onClick={() => setShowTechDetails(!showTechDetails)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
              <Cpu size={16} color="#2563eb" />
              <span>AI Processing Details & Raw OCR Extraction Logs</span>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ padding: "0.2rem", border: "none" }}>
              {showTechDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {showTechDetails && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
              <AIStatus
                paddleCompleted={true}
                geminiError={fullData.gemini_error}
                recoveredFieldsCount={fullData.recovered_fields?.length || 0}
              />

              <div style={{ marginTop: "1rem", backgroundColor: "#0f172a", color: "#38bdf8", padding: "1rem", borderRadius: "8px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", overflowX: "auto" }}>
                <div style={{ fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>Extracted Text Streams ({fullData.text?.length || 0} lines):</div>
                {fullData.text?.map((txt, idx) => (
                  <div key={idx} style={{ padding: "2px 0" }}>
                    [{idx + 1}] {txt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Two Column Section: Image Evidence + Product Information */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
          <EvidenceViewer
            imageUrl={imageUrl}
            fallbackUrl={processedUrl}
            ocrDetails={fullData.ocr_details}
            selectedRule={selectedRule}
          />
          <ProductInformation data={productData} />
        </div>

        {/* Rule Evaluations List */}
        <RuleList
          rules={rules}
          onHighlightEvidence={(r) => setSelectedRule(r)}
          selectedRuleId={selectedRule?.rule_id || selectedRule?.rule_number}
        />
      </div>
    </PageContainer>
  );
}
