import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { CameraCapture } from "../components/scanner/CameraCapture";
import { ImageUploader } from "../components/scanner/ImageUploader";
import { ScanPreview } from "../components/scanner/ScanPreview";
import { ProcessingPipeline, PIPELINE_STEPS } from "../components/scanner/ProcessingPipeline";
import { AIStatus } from "../components/scanner/AIStatus";
import { ProductInformation } from "../components/product/ProductInformation";
import { ComplianceSummary } from "../components/compliance/ComplianceSummary";
import { EvidenceViewer } from "../components/compliance/EvidenceViewer";
import { RuleList } from "../components/compliance/RuleList";
import { processOCR } from "../services/api";
import { historyService } from "../services/historyService";
import type { OCRComplianceResponse, ComplianceRuleResult } from "../types/compliance";
import type { ProductData } from "../types/ocr";
import { Camera, Upload, ScanLine, AlertCircle, CheckCircle2 } from "lucide-react";

export function Scanner() {
  const location = useLocation();

  const [inputMode, setInputMode] = useState<"camera" | "upload">(
    (location.state as { mode?: "camera" | "upload" })?.mode || "upload"
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [processingStep, setProcessingStep] = useState(0);
  const [scanResult, setScanResult] = useState<OCRComplianceResponse | null>(null);
  const [selectedRule, setSelectedRule] = useState<ComplianceRuleResult | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Stepper animation during active scan
  useEffect(() => {
    if (!loading) return;

    setProcessingStep(0);
    const interval = setInterval(() => {
      setProcessingStep((curr) => (curr < PIPELINE_STEPS.length - 2 ? curr + 1 : curr));
    }, 700);

    return () => clearInterval(interval);
  }, [loading]);

  const handleStartScan = async () => {
    if (!file) {
      setError("Please capture or upload a package label image first.");
      return;
    }

    setLoading(true);
    setError("");
    setScanResult(null);

    try {
      const data = await processOCR(file);
      const complianceData = data as OCRComplianceResponse;

      setScanResult(complianceData);
      setProcessingStep(PIPELINE_STEPS.length - 1);

      // Persist to historyService automatically
      if (previewUrl) {
        historyService.saveScan(complianceData, previewUrl);
      } else {
        historyService.saveScan(complianceData);
      }
    } catch (err) {
      console.error("Scanner Error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while processing package OCR.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setError("");
    setProcessingStep(0);
  };

  const productData: ProductData | null =
    scanResult?.product_data || scanResult?.paddle_data || scanResult?.gemini_data || null;

  const compliance = scanResult?.compliance || null;
  const rules = Array.isArray(compliance?.results) ? compliance.results : [];

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Page Header */}
        <div className="panel-card" style={{ backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ScanLine size={24} color="#2563eb" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a" }}>Product Compliance Scanner</h1>
              </div>
              <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
                Capture or upload a packaged commodity image to analyze its legal declarations under Rules, 2011.
              </p>
            </div>

            {/* Mode selection buttons */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => { setInputMode("upload"); if (!loading && !scanResult) setFile(null); }}
                className={`btn ${inputMode === "upload" ? "btn-primary" : "btn-secondary"}`}
              >
                <Upload size={16} />
                <span>Upload Image</span>
              </button>
              <button
                onClick={() => { setInputMode("camera"); if (!loading && !scanResult) setFile(null); }}
                className={`btn ${inputMode === "camera" ? "btn-primary" : "btn-secondary"}`}
              >
                <Camera size={16} />
                <span>Camera Scanner</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: "1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={20} color="#dc2626" />
            <div>
              <strong>Processing Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Scan Input Area if no active result */}
        {!scanResult && (
          <div>
            {inputMode === "camera" && !file && (
              <CameraCapture
                onCapture={(capturedFile) => setFile(capturedFile)}
                onClose={() => setInputMode("upload")}
              />
            )}

            {inputMode === "upload" && !file && (
              <ImageUploader onFileSelect={(selectedFile) => setFile(selectedFile)} />
            )}

            {file && previewUrl && (
              <ScanPreview
                file={file}
                previewUrl={previewUrl}
                onStartScan={handleStartScan}
                onReset={handleReset}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* Processing Timeline Stepper */}
        {loading && (
          <ProcessingPipeline currentStepIndex={processingStep} isComplete={false} />
        )}

        {/* Scan Results Display */}
        {scanResult && previewUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header Banner with Reset */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "1rem 1.25rem", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#065f46", fontWeight: 700 }}>
                <CheckCircle2 size={20} color="#059669" />
                <span>Inspection Complete — Package Declarations Analyzed</span>
              </div>
              <button onClick={handleReset} className="btn btn-secondary btn-sm">
                <span>Scan Another Package</span>
              </button>
            </div>

            {/* AI Engine Status */}
            <AIStatus
              paddleCompleted={true}
              geminiError={scanResult.gemini_error}
              recoveredFieldsCount={scanResult.recovered_fields?.length || 0}
            />

            {/* Compliance Verdict Summary */}
            <ComplianceSummary compliance={scanResult.compliance} />

            {/* Two column grid: Evidence Viewer + Extracted Information */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
              <EvidenceViewer
                imageUrl={scanResult.processed_image ? `http://127.0.0.1:8000/${scanResult.processed_image}` : previewUrl}
                ocrDetails={scanResult.ocr_details}
                selectedRule={selectedRule}
              />
              <ProductInformation data={productData} />
            </div>

            {/* Legal Metrology Rules List */}
            <RuleList
              rules={rules}
              onHighlightEvidence={(rule) => setSelectedRule(rule)}
              selectedRuleId={selectedRule?.rule_id || selectedRule?.rule_number}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
