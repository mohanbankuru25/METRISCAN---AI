import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useLocation, Link, useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import {
  Layers,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Eye,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers2,
  FileSpreadsheet,
  History,
} from "lucide-react";
import {
  multiScanService,
  type MultiScanSessionResult,
  type MultiScanProduct,
} from "../services/multiScanService";
import { useLanguage } from "../i18n/LanguageContext";

export default function MultiScanProducts() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const isOfficerOrAdmin =
    location.pathname.startsWith("/inspector") || location.pathname.startsWith("/admin");

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<MultiScanSessionResult | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<MultiScanProduct | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore session from backend/Supabase if navigating directly or upon page refresh
  useEffect(() => {
    if (sessionId && !sessionResult) {
      setAnalyzing(true);
      multiScanService
        .getSession(sessionId)
        .then((data) => {
          if (data) {
            setSessionResult(data);
            setCurrentStep(4);
          }
        })
        .catch((err) => {
          console.error("Failed to restore session from Supabase:", err);
        })
        .finally(() => {
          setAnalyzing(false);
        });
    }
  }, [sessionId]);

  const handleFilesSelected = (newFilesList: FileList | File[]) => {
    setError(null);
    const newFiles = Array.from(newFilesList).filter((f) => f.type.startsWith("image/"));

    if (newFiles.length === 0) {
      setError(t("scanner.dragDropSubtitle", "Please select valid image files (JPG, PNG, WebP)."));
      return;
    }

    if (files.length + newFiles.length > 5) {
      setError(t("multiScan.maxImagesLimit", "Maximum 5 images can be analyzed at once."));
      return;
    }

    const updatedFiles = [...files, ...newFiles].slice(0, 5);
    setFiles(updatedFiles);

    // Create preview URLs
    const newPreviews = updatedFiles.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, idx) => idx !== index);
    const updatedPreviews = previews.filter((_, idx) => idx !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    setError(null);
  };

  const handleClearAll = () => {
    setFiles([]);
    setPreviews([]);
    setError(null);
    setSessionResult(null);
    setCurrentStep(0);
  };

  const handleStartAnalysis = async () => {
    if (files.length === 0) {
      setError("Please select between 1 and 5 product images to analyze.");
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      setSessionResult(null);

      setCurrentStep(1); // Preprocessing
      await new Promise((r) => setTimeout(r, 600));

      setCurrentStep(2); // Object Detection & Grouping
      await new Promise((r) => setTimeout(r, 800));

      setCurrentStep(3); // Sequential OCR & Compliance Processing
      const result = await multiScanService.uploadAndAnalyze(files, language);

      setSessionResult(result);
      setCurrentStep(4); // Complete
      if (result && result.id) {
        navigate(
          isOfficerOrAdmin
            ? `/inspector/multi-scan/${result.id}`
            : `/user/multi-scan/${result.id}`,
          { replace: true }
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze products. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadReport = async (product: MultiScanProduct) => {
    if (!sessionResult) return;
    try {
      setDownloadingReportId(product.product_id);
      const blob = await multiScanService.downloadReport(sessionResult.id, product.product_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MetriScan_${product.product_name.replace(/\s+/g, "_")}_Compliance_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download certified report.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  const pageContent = (
    <div style={{ maxWidth: "1120px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #a7f3d0",
              }}
            >
              <Layers size={24} color="#059669" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.55rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                {t("multiScan.title", "Multi-Scan Products")}
              </h1>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                {t("multiScan.subtitle", "Upload 1 to 5 packaged commodity images for batch detection, front+back pairing, and independent compliance reporting.")}
              </p>
            </div>
          </div>
        </div>

        {/* Action Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            to={isOfficerOrAdmin ? "/inspector/history" : "/user/scans"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <History size={15} color="#2563eb" />
            <span>
              {isOfficerOrAdmin
                ? t("officer.inspectionHistory", "View History")
                : t("nav.myScans", "Back to My Scans")}
            </span>
          </Link>

          <Link
            to={isOfficerOrAdmin ? "/inspector/scan" : "/user/scan"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <span>{t("nav.scanProduct", "Switch to Single Scan")}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "0.85rem 1.15rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#991b1b",
            fontSize: "0.86rem",
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. UPLOAD & DRAG-AND-DROP ZONE */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.75rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {t("multiScan.uploadTitle", "Upload Product Images")}
            </h2>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {t("multiScan.uploadSubtitle", "Upload between 1 and 5 package photos (Front, Back, or Multiple Products)")}
            </p>
          </div>

          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              padding: "0.25rem 0.65rem",
              borderRadius: "999px",
              backgroundColor: files.length === 5 ? "#fee2e2" : "#f1f5f9",
              color: files.length === 5 ? "#dc2626" : "#475569",
              border: `1px solid ${files.length === 5 ? "#fca5a5" : "#e2e8f0"}`,
            }}
          >
            {files.length} / 5 {t("multiScan.productCardTitle", "Images")}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) handleFilesSelected(e.target.files);
          }}
          style={{ display: "none" }}
        />

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => {
            if (files.length < 5) fileInputRef.current?.click();
          }}
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "12px",
            padding: "2rem 1.5rem",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            cursor: files.length >= 5 ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <Upload size={22} color="#059669" />
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
            {t("multiScan.dropzoneHint", "Drag and drop up to 5 product photos here, or click to browse")}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.3rem" }}>
            {t("scanner.dragDropSubtitle", "Supports JPG, PNG, WebP of packaged commodity labels")}
          </div>
        </div>

        {/* Thumbnails Preview Grid (1 to 5 items) */}
        {files.length > 0 && (
          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                Selected Images ({files.length}):
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <RotateCcw size={12} />
                <span>Clear All</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem" }}>
              {previews.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f1f5f9",
                    aspectRatio: "1/1",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <img src={url} alt={`Upload ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                  {/* Top Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      left: "6px",
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      color: "#ffffff",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(220, 38, 38, 0.9)",
                      color: "#ffffff",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    title="Remove Image"
                  >
                    <X size={14} />
                  </button>

                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: "rgba(15, 23, 42, 0.75)",
                      color: "#ffffff",
                      fontSize: "0.68rem",
                      padding: "0.3rem 0.5rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {files[idx]?.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Analyze Button */}
            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={analyzing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  padding: "0.8rem 2rem",
                  borderRadius: "10px",
                  backgroundColor: analyzing ? "#94a3b8" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: analyzing ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
                  transition: "all 0.15s ease",
                }}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                    <span>{t("multiScan.analyzingBtn", "Analyzing Products...")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>{t("multiScan.analyzeBtn", "ANALYZE PRODUCTS")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. PROGRESS STEPPER */}
      {analyzing && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <Loader2 size={20} className="spin" color="#059669" style={{ animation: "spin 1s linear infinite" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              {t("multiScan.progressTitle", "Analyzing Uploaded Products...")}
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.84rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: currentStep >= 1 ? "#059669" : "#94a3b8" }}>
              <CheckCircle2 size={16} color={currentStep >= 1 ? "#059669" : "#cbd5e1"} />
              <span>{t("multiScan.stepProcessing", "Image preprocessing completed")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: currentStep >= 2 ? "#059669" : "#94a3b8" }}>
              <CheckCircle2 size={16} color={currentStep >= 2 ? "#059669" : "#cbd5e1"} />
              <span>{t("multiScan.stepDetecting", "Product object detection & grouping completed")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: currentStep >= 3 ? "#059669" : "#94a3b8" }}>
              <CheckCircle2 size={16} color={currentStep >= 3 ? "#059669" : "#cbd5e1"} />
              <span>{t("multiScan.stepAnalyzing", "Executing legal metrology compliance evaluation...")}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MULTI-SCAN RESULTS */}
      {sessionResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Summary Header Banner */}
          <div
            style={{
              backgroundColor: "#065f46",
              color: "#ffffff",
              borderRadius: "14px",
              padding: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              boxShadow: "0 4px 14px rgba(6,95,70,0.25)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#a7f3d0", textTransform: "uppercase" }}>
                Session: {sessionResult.id}
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0.25rem 0 0" }}>
                {sessionResult.total_products} {t("multiScan.uniqueProductsDetected", "UNIQUE PRODUCTS DETECTED")}
              </h2>
              <div style={{ fontSize: "0.82rem", color: "#d1fae5", marginTop: "0.2rem" }}>
                {sessionResult.completed_products} successfully analyzed
                {sessionResult.failed_products > 0 && ` • ${sessionResult.failed_products} failed`}
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={14} />
              <span>Scan More Products</span>
            </button>
          </div>

          {/* SIDE-BY-SIDE PRODUCT COMPARISON TABLE */}
          {sessionResult.products.length > 1 && (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <FileSpreadsheet size={20} color="#059669" />
                <div>
                  <h3 style={{ fontSize: "1.08rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    {t("multiScan.sideBySideTitle", "Side-by-Side Product Comparison")}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {t("multiScan.sideBySideSubtitle", "Comparative matrix of all unique packaged commodities identified in this session")}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "0.65rem 0.85rem", textAlign: "left", color: "#475569", fontWeight: 700 }}>Parameter</th>
                      {sessionResult.products.map((p) => (
                        <th key={p.product_id} style={{ padding: "0.65rem 0.85rem", textAlign: "left", color: "#059669", fontWeight: 800 }}>
                          {p.display_title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Product Name</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem", fontWeight: 600, color: "#0f172a" }}>
                          {p.product_name}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Brand</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>{p.brand || "—"}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Barcode</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem", fontFamily: "monospace", fontWeight: 700 }}>
                          {p.barcode || "—"}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Batch / Lot</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>{p.batch_number || "—"}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>License No</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>{p.license_number || "—"}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>MRP</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#0f172a" }}>{p.mrp || "—"}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Net Quantity</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>{p.net_quantity || "—"}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Mfg Date</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>{p.mfg_date || "—"}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Expiry Date</td>
                      {sessionResult.products.map((p) => (
                        <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>{p.expiry_date || "—"}</td>
                      ))}
                    </tr>
                    {isOfficerOrAdmin && (
                      <tr style={{ backgroundColor: "#fafafa" }}>
                        <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#334155" }}>Compliance</td>
                        {sessionResult.products.map((p) => {
                          const isPass = p.overall_status === "COMPLIANT" || p.overall_status === "PASS";
                          return (
                            <td key={p.product_id} style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                  backgroundColor: isPass ? "#dcfce7" : "#fee2e2",
                                  color: isPass ? "#166534" : "#991b1b",
                                }}
                              >
                                {p.overall_status} ({p.compliance_score}%)
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUAL UNIQUE PRODUCT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
            {sessionResult.products.map((product) => {
              const isFailed = product.analysis_status === "FAILED";
              const isMerged = product.is_merged_sides;

              return (
                <div
                  key={product.product_id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: isFailed ? "1.5px solid #fca5a5" : "1px solid #e2e8f0",
                    padding: "1.35rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div>
                    {/* Card Header Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            backgroundColor: "#059669",
                            color: "#ffffff",
                          }}
                        >
                          {product.display_title}
                        </span>

                        {isMerged && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              backgroundColor: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                            }}
                          >
                            <Layers2 size={11} />
                            <span>{t("multiScan.mergedSidesBadge", "Front + Back Merged")}</span>
                          </span>
                        )}
                      </div>

                      {isOfficerOrAdmin && !isFailed && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor:
                              product.overall_status === "PASS" || product.overall_status === "COMPLIANT"
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              product.overall_status === "PASS" || product.overall_status === "COMPLIANT"
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {product.overall_status}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem" }}>
                      {product.product_name}
                    </h3>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.85rem" }}>
                      {t("multiScan.primaryIdentity", "Primary Identity")}:{" "}
                      <strong style={{ color: "#334155" }}>{product.primary_identity}</strong>
                    </div>

                    {/* Associated Images Thumbnails */}
                    <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
                      {product.images.map((im, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            fontSize: "0.7rem",
                            color: "#475569",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <span>{im.side === "front" ? t("multiScan.frontBadge", "Front") : im.side === "back" ? t("multiScan.backBadge", "Back") : "Image"} #{i+1}</span>
                        </div>
                      ))}
                    </div>

                    {/* Key Extracted Details */}
                    {!isFailed && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem", backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "8px" }}>
                        <div>
                          <span style={{ color: "#64748b" }}>MRP:</span>{" "}
                          <strong style={{ color: "#0f172a" }}>{product.mrp}</strong>
                        </div>
                        <div>
                          <span style={{ color: "#64748b" }}>Qty:</span>{" "}
                          <strong style={{ color: "#0f172a" }}>{product.net_quantity}</strong>
                        </div>
                        <div>
                          <span style={{ color: "#64748b" }}>Mfg:</span>{" "}
                          <span style={{ color: "#334155" }}>{product.mfg_date}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b" }}>Expiry:</span>{" "}
                          <span style={{ color: "#334155" }}>{product.expiry_date}</span>
                        </div>
                      </div>
                    )}

                    {isFailed && (
                      <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", borderRadius: "8px", fontSize: "0.78rem", color: "#991b1b" }}>
                        {product.error_message || "Product analysis could not be completed."}
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                    {!isFailed ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedProductForModal(product)}
                          style={{
                            flex: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.35rem",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={13} />
                          <span>{t("multiScan.viewAnalysisBtn", "View Analysis")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadReport(product)}
                          disabled={downloadingReportId === product.product_id}
                          style={{
                            flex: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.35rem",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "6px",
                            backgroundColor: "#059669",
                            border: "none",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "#ffffff",
                            cursor: downloadingReportId === product.product_id ? "not-allowed" : "pointer",
                          }}
                        >
                          {downloadingReportId === product.product_id ? (
                            <Loader2 size={13} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>{t("multiScan.downloadReportBtn", "Download Report")}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartAnalysis}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#991b1b",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {t("multiScan.retryFailedBtn", "Retry Analysis")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR A SELECTED PRODUCT */}
      {selectedProductForModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={() => setSelectedProductForModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "#059669", color: "#ffffff" }}>
                  {selectedProductForModal.display_title}
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  {selectedProductForModal.product_name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForModal(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem" }}>
              <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, color: "#059669", marginBottom: "0.4rem" }}>Identified Parameters:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", color: "#334155" }}>
                  <div><strong>Barcode:</strong> {selectedProductForModal.barcode || "Not Detected"}</div>
                  <div><strong>Batch:</strong> {selectedProductForModal.batch_number || "Not Detected"}</div>
                  <div><strong>License:</strong> {selectedProductForModal.license_number || "Not Detected"}</div>
                  <div><strong>MRP:</strong> {selectedProductForModal.mrp || "Not Detected"}</div>
                  <div><strong>Net Qty:</strong> {selectedProductForModal.net_quantity || "Not Detected"}</div>
                  <div><strong>Mfg Date:</strong> {selectedProductForModal.mfg_date || "Not Detected"}</div>
                  <div><strong>Expiry:</strong> {selectedProductForModal.expiry_date || "Not Detected"}</div>
                  <div><strong>Brand:</strong> {selectedProductForModal.brand || "Not Detected"}</div>
                </div>
              </div>

              {selectedProductForModal.compliance_result?.results && (
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>Legal Metrology Compliance Rule Checks:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {selectedProductForModal.compliance_result.results.map((r: any, idx: number) => {
                      const isPass = r.status === "PASS";
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "0.6rem 0.8rem",
                            borderRadius: "6px",
                            backgroundColor: isPass ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${isPass ? "#bbf7d0" : "#fecaca"}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{r.rule_name || r.name || r.rule_id}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.reason || r.evidence}</div>
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: isPass ? "#166534" : "#991b1b" }}>
                            {r.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isOfficerOrAdmin) {
    return <PageContainer>{pageContent}</PageContainer>;
  }

  return pageContent;
}
