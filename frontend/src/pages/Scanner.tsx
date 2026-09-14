import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { PageContainer } from "../components/layout/PageContainer";

import { CameraCapture } from "../components/scanner/CameraCapture";
import { ImageUploader } from "../components/scanner/ImageUploader";
import { ScanPreview } from "../components/scanner/ScanPreview";

import { AIStatus } from "../components/scanner/AIStatus";

import { ProductInformation } from "../components/product/ProductInformation";

import { ComplianceSummary } from "../components/compliance/ComplianceSummary";
import { EvidenceViewer } from "../components/compliance/EvidenceViewer";
import { RuleList } from "../components/compliance/RuleList";
import { VisualComplianceAnalysis } from "../components/compliance/VisualComplianceAnalysis";

import { processOCR } from "../services/api";
import { historyService } from "../services/historyService";

import type {
  OCRComplianceResponse,
  ComplianceRuleResult,
} from "../types/compliance";

import type { ProductData } from "../types/ocr";

import {
  Camera,
  Upload,
  ScanLine,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";


// =========================================================
// BACKEND URL
// =========================================================

const BACKEND_URL = "http://127.0.0.1:8000";


// =========================================================
// NORMALIZE PROCESSED IMAGE URL
// =========================================================

function getProcessedImageUrl(
  processedImage?: string | null
): string | null {

  if (!processedImage) {
    return null;
  }

  let path = processedImage
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!path) {
    return null;
  }

  // If backend somehow returns an absolute URL,
  // use it directly.
  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  // Encode each path component separately.
  //
  // Example:
  //
  // uploads/Free Food Packing Label Making Software.pdf_processed.png
  //
  // becomes a valid browser URL.
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${BACKEND_URL}/${encodedPath}`;
}


// =========================================================
// SCANNER COMPONENT
// =========================================================

export function Scanner() {

  const location = useLocation();


  // =======================================================
  // INPUT MODE
  // =======================================================

  const [inputMode, setInputMode] =
    useState<"camera" | "upload">(
      (location.state as {
        mode?: "camera" | "upload";
      })?.mode || "upload"
    );


  // =======================================================
  // FILE
  // =======================================================

  const [file, setFile] =
    useState<File | null>(null);


  // =======================================================
  // PREVIEW
  // =======================================================

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);


  // =======================================================
  // LOADING & COMPLETION
  // =======================================================

  const [loading, setLoading] =
    useState(false);

  const [isAnalysisComplete, setIsAnalysisComplete] =
    useState(false);

  const [isCachedResult, setIsCachedResult] =
    useState(false);


  // =======================================================
  // ERROR
  // =======================================================

  const [error, setError] =
    useState<string>("");


  // =======================================================
  // SCAN RESULT
  // =======================================================

  const [scanResult, setScanResult] =
    useState<OCRComplianceResponse | null>(null);


  // =======================================================
  // SELECTED RULE
  // =======================================================

  const [selectedRule, setSelectedRule] =
    useState<ComplianceRuleResult | null>(null);


  // =======================================================
  // CREATE LOCAL PREVIEW
  // =======================================================

  useEffect(() => {

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(file);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };

  }, [file]);


  // =======================================================
  // PROCESSED IMAGE URL
  // =======================================================

  const processedImageUrl = useMemo(() => {

    return getProcessedImageUrl(
      scanResult?.processed_image
    );

  }, [scanResult?.processed_image]);


  // =======================================================
  // START SCAN
  // =======================================================

  const handleStartScan = async () => {

    if (!file) {

      setError(
        "Please capture or upload a package label image first."
      );

      return;
    }


    setLoading(true);

    setIsAnalysisComplete(false);

    setIsCachedResult(false);

    setError("");

    setScanResult(null);

    setSelectedRule(null);


    try {

      console.log(
        "Starting OCR scan..."
      );


      const data =
        await processOCR(file);


      console.log(
        "OCR response received:",
        data
      );


      const complianceData =
        data as OCRComplianceResponse;

      const isCached = Boolean(
        complianceData?.cached
      );

      setIsCachedResult(isCached);

      // Mark visual analysis complete so progress reaches 100%
      setIsAnalysisComplete(true);


      // ==================================================
      // SAVE HISTORY
      // ==================================================

      if (previewUrl) {

        historyService.saveScan(
          complianceData,
          previewUrl
        );

      } else {

        historyService.saveScan(
          complianceData
        );

      }


      // Quick pause to display "Product Found" / completion state before transitioning to results
      const transitionDelay = isCached ? 350 : 650;
      await new Promise((resolve) => setTimeout(resolve, transitionDelay));


      setScanResult(
        complianceData
      );

    } catch (err) {

      console.error(
        "Scanner Error:",
        err
      );

      setIsAnalysisComplete(false);


      if (err instanceof Error) {

        setError(
          err.message
        );

      } else {

        setError(
          "An unexpected error occurred while processing package OCR."
        );

      }

    } finally {

      setLoading(false);

      setIsAnalysisComplete(false);

    }
  };


  // =======================================================
  // RESET
  // =======================================================

  const handleReset = () => {

    setFile(null);

    setPreviewUrl(null);

    setScanResult(null);

    setSelectedRule(null);

    setError("");

    setIsAnalysisComplete(false);

    setIsCachedResult(false);
  };


  // =======================================================
  // PRODUCT DATA
  // =======================================================

  const productData:
    ProductData | null =
    scanResult?.product_data ||
    scanResult?.paddle_data ||
    scanResult?.gemini_data ||
    null;


  // =======================================================
  // COMPLIANCE
  // =======================================================

  const compliance =
    scanResult?.compliance || null;


  // =======================================================
  // RULES
  // =======================================================

  const rules =
    Array.isArray(
      compliance?.results
    )
      ? compliance.results
      : [];


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <PageContainer>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >


        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="panel-card"
          style={{
            backgroundColor: "#ffffff",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >

            <div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >

                <ScanLine
                  size={24}
                  color="#2563eb"
                />

                <h1
                  style={{
                    fontSize: "1.5rem",
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  Product Compliance Scanner
                </h1>

              </div>


              <p
                style={{
                  margin: "0.25rem 0 0",
                  color: "#64748b",
                }}
              >
                Capture or upload a packaged commodity
                image to analyze its legal declarations
                under Legal Metrology rules.
              </p>

            </div>


            {/* INPUT BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
              }}
            >

              <button
                onClick={() => {

                  setInputMode("upload");

                  if (
                    !loading &&
                    !scanResult
                  ) {
                    setFile(null);
                  }

                }}
                className={
                  `btn ${
                    inputMode === "upload"
                      ? "btn-primary"
                      : "btn-secondary"
                  }`
                }
              >

                <Upload size={16} />

                <span>
                  Upload Image
                </span>

              </button>


              <button
                onClick={() => {

                  setInputMode("camera");

                  if (
                    !loading &&
                    !scanResult
                  ) {
                    setFile(null);
                  }

                }}
                className={
                  `btn ${
                    inputMode === "camera"
                      ? "btn-primary"
                      : "btn-secondary"
                  }`
                }
              >

                <Camera size={16} />

                <span>
                  Camera Scanner
                </span>

              </button>

            </div>

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div
            style={{
              padding: "1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >

            <AlertCircle
              size={20}
              color="#dc2626"
            />

            <div>

              <strong>
                Processing Error:
              </strong>{" "}

              {error}

            </div>

          </div>

        )}


        {/* =================================================
            IMAGE INPUT
        ================================================= */}

        {!scanResult && (

          <div>

            {/* CAMERA */}

            {inputMode === "camera" &&
              !file && (

                <CameraCapture
                  onCapture={(capturedFile) =>
                    setFile(capturedFile)
                  }
                  onClose={() =>
                    setInputMode("upload")
                  }
                />

              )}


            {/* UPLOAD */}

            {inputMode === "upload" &&
              !file && (

                <ImageUploader
                  onFileSelect={(selectedFile) =>
                    setFile(selectedFile)
                  }
                />

              )}


            {/* PREVIEW */}

            {file &&
              previewUrl && (

                <ScanPreview
                  file={file}
                  previewUrl={previewUrl}
                  onStartScan={
                    handleStartScan
                  }
                  onReset={
                    handleReset
                  }
                  loading={loading}
                  isComplete={
                    isAnalysisComplete
                  }
                  isCached={
                    isCachedResult
                  }
                />

              )}

          </div>

        )}


        {/* =================================================
            RESULTS
        ================================================= */}

        {scanResult && (

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >


            {/* =============================================
                COMPLETE HEADER
            ============================================= */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "1rem 1.25rem",
                borderRadius: "10px",
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#065f46",
                  fontWeight: 700,
                }}
              >

                <CheckCircle2
                  size={20}
                  color="#059669"
                />

                <span>
                  Inspection Complete —
                  Package Declarations Analyzed
                </span>

              </div>


              <button
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
              >
                Scan Another Package
              </button>

            </div>


            {/* =============================================
                AI STATUS
            ============================================= */}

            <AIStatus
              paddleCompleted={true}
              geminiError={
                scanResult.gemini_error
              }
              recoveredFieldsCount={
                scanResult.recovered_fields
                  ?.length || 0
              }
            />


            {/* =============================================
                COMPLIANCE SUMMARY
            ============================================= */}

            <ComplianceSummary
              compliance={
                scanResult.compliance
              }
            />


            {/* =============================================
                VISUAL COMPLIANCE
            ============================================= */}

            {scanResult.visual_analysis && (

              <VisualComplianceAnalysis
                analysis={
                  scanResult.visual_analysis
                }
              />

            )}


            {/* =============================================
                EVIDENCE VIEWER
            ============================================= */}

            <EvidenceViewer
              /*
               * IMPORTANT:
               *
               * processedImageUrl is used FIRST.
               *
               * The previous implementation used:
               *
               * previewUrl || processedImage
               *
               * which meant the processed backend image
               * was never selected while previewUrl existed.
               */

              imageUrl={
                processedImageUrl ||
                previewUrl ||
                ""
              }

              /*
               * If processed image fails, EvidenceViewer
               * automatically falls back to the original
               * uploaded browser image.
               */

              fallbackUrl={
                previewUrl ||
                undefined
              }

              ocrDetails={
                scanResult.ocr_details
              }

              selectedRule={
                selectedRule
              }
            />


            {/* =============================================
                PRODUCT INFORMATION
            ============================================= */}

            <ProductInformation
              data={productData}
            />


            {/* =============================================
                RULE LIST
            ============================================= */}

            <RuleList
              rules={rules}

              onHighlightEvidence={(rule) =>
                setSelectedRule(rule)
              }

              selectedRuleId={
                selectedRule?.rule_id ||
                selectedRule?.rule_number
              }
            />

          </div>

        )}

      </div>

    </PageContainer>
  );
}