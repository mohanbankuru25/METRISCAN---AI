import { useEffect, useMemo, useRef, useState } from "react";
import { processOCR } from "../services/api";
import type { OCRResponse, ProductData } from "../services/api";

type ProcessingStep = {
  id: string;
  title: string;
  description: string;
};

type ComplianceEvidence = {
  text?: string;
  confidence?: number | null;
  bbox?: number[] | null;
};

type ComplianceRuleResult = {
  rule_id?: string;
  rule_number?: string;
  rule_name?: string;
  status?: string;
  applicable?: boolean | null;
  expected?: string | null;
  extracted?: unknown;
  extracted_value?: unknown;
  evidence?: ComplianceEvidence[] | string[] | null;
  reason?: string | null;
  suggestion?: string | null;
  rule_reference?: string | null;
  source?: string | null;
};

type ComplianceSummary = {
  pass?: number;
  fail?: number;
  review?: number;
  not_applicable?: number;
  out_of_scope?: number;
};

type ComplianceResult = {
  overall_status?: string;
  summary?: ComplianceSummary;
  results?: ComplianceRuleResult[];
  score?: number;
  compliance_score?: number;
};

type OCRComplianceResponse = OCRResponse & {
  compliance?: ComplianceResult | null;
  applicability?: unknown;
};

const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: "upload",
    title: "Image uploaded",
    description: "Image received successfully",
  },
  {
    id: "preprocess",
    title: "Image preprocessing",
    description: "Enhancing image for OCR",
  },
  {
    id: "paddle",
    title: "PaddleOCR extraction",
    description: "Detecting and recognizing text",
  },
  {
    id: "gemini",
    title: "Gemini Vision analysis",
    description: "Understanding label fields and layout",
  },
  {
    id: "fusion",
    title: "Information fusion",
    description: "Combining and validating extracted data",
  },
  {
    id: "complete",
    title: "Processing complete",
    description: "Product information is ready",
  },
];

const FIELD_GROUPS = [
  {
    title: "Basic Product Information",
    fields: [
      ["Product Name", "product_name"],
      ["Product Category", "product_category"],
      ["Net Quantity", "net_quantity"],
      ["MRP", "mrp"],
    ],
  },
  {
    title: "Traceability & Dates",
    fields: [
      ["Batch Number", "batch_number"],
      ["Manufacturing Date", "date_of_manufacture"],
      ["Packed On", "packed_on"],
      ["Best Before", "best_before"],
      ["Use By", "use_by"],
      ["Expiry Date", "expiry_date"],
    ],
  },
  {
    title: "Manufacturer & Distribution",
    fields: [
      ["Manufacturer / Packer", "manufacturer_or_packer"],
      ["Marketed By", "marketed_by"],
      ["License Number", "license_number"],
      ["Country of Origin", "country_of_origin"],
    ],
  },
  {
    title: "Contact & Other Information",
    fields: [
      ["Address", "address"],
      ["Consumer Contact", "consumer_contact"],
      ["Ingredients", "ingredients"],
    ],
  },
] as const;

function OCRUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingFinished, setProcessingFinished] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ---------------------------------------------------------
  // File preview
  // ---------------------------------------------------------

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ---------------------------------------------------------
  // Processing animation
  // ---------------------------------------------------------

  useEffect(() => {
    if (!loading) return;

    setProcessingStep(1);
    setProcessingFinished(false);

    const timer = window.setInterval(() => {
      setProcessingStep((current) =>
        current < PROCESSING_STEPS.length - 1 ? current + 1 : current
      );
    }, 850);

    return () => window.clearInterval(timer);
  }, [loading]);

  // ---------------------------------------------------------
  // File Upload
  // ---------------------------------------------------------

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError("");
      setProcessingStep(0);
      setProcessingFinished(false);
    }
  };

  // ---------------------------------------------------------
  // Open Camera
  // ---------------------------------------------------------

  const openCamera = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to access camera. Please allow camera permission in your browser."
      );
    }
  };

  // ---------------------------------------------------------
  // Close Camera
  // ---------------------------------------------------------

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOpen(false);
  };

  // ---------------------------------------------------------
  // Capture Image
  // ---------------------------------------------------------

  const captureImage = () => {
    if (!videoRef.current) {
      setError("Camera is not ready.");
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture image.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture image.");
          return;
        }

        const capturedFile = new File(
          [blob],
          `camera_capture_${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);
        setResult(null);
        setError("");
        setProcessingStep(0);
        setProcessingFinished(false);
        closeCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  // ---------------------------------------------------------
  // Process Image
  // ---------------------------------------------------------

  const handleProcess = async () => {
    if (!file) {
      setError("Please capture or select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setProcessingStep(1);
    setProcessingFinished(false);

    try {
      const data = await processOCR(file);

      setResult(data);
      setProcessingStep(PROCESSING_STEPS.length - 1);
      setProcessingFinished(true);
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong while processing the image.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Cleanup Camera
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ---------------------------------------------------------
  // Get Final Product Data
  // ---------------------------------------------------------

  const productData = useMemo((): ProductData | null => {
    if (result?.product_data) return result.product_data;
    if (result?.paddle_data) return result.paddle_data;
    if (result?.gemini_data) return result.gemini_data;
    return null;
  }, [result]);

  // ---------------------------------------------------------
  // Legal Metrology Compliance
  // ---------------------------------------------------------

  const compliance =
    (result as OCRComplianceResponse | null)?.compliance ?? null;

  const complianceSummary: ComplianceSummary =
    compliance?.summary ?? {};

  const complianceRules: ComplianceRuleResult[] =
    Array.isArray(compliance?.results)
      ? compliance.results
      : [];

  const complianceStatus = String(
    compliance?.overall_status ?? "REVIEW"
  ).toUpperCase();

  const complianceScore =
    typeof compliance?.compliance_score === "number"
      ? compliance.compliance_score
      : typeof compliance?.score === "number"
        ? compliance.score
        : null;

  const statusClass = (status: unknown) => {
    const value = String(status ?? "REVIEW").toUpperCase();

    if (value === "PASS") return "rule-pass";
    if (value === "FAIL") return "rule-fail";
    if (value === "NOT_APPLICABLE") return "rule-na";
    if (value === "OUT_OF_SCOPE") return "rule-oos";

    return "rule-review";
  };

  const statusIcon = (status: unknown) => {
    const value = String(status ?? "REVIEW").toUpperCase();

    if (value === "PASS") return "✓";
    if (value === "FAIL") return "✕";
    if (value === "NOT_APPLICABLE") return "—";
    if (value === "OUT_OF_SCOPE") return "○";

    return "⚠";
  };

  const formatComplianceValue = (value: unknown) => {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return "Not detected";
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  const formatEvidence = (
    evidence: ComplianceRuleResult["evidence"]
  ) => {
    if (!evidence || evidence.length === 0) {
      return "No evidence provided.";
    }

    return evidence
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item.text ?? "Visual/OCR evidence";
      })
      .join(" • ");
  };

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const displayValue = (value: unknown) => {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return "Not detected";
    }

    return String(value);
  };

  const hasValue = (value: unknown) => {
    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    );
  };



  // ---------------------------------------------------------
  // Render OCR bounding boxes
  // ---------------------------------------------------------

  const renderBoundingBoxes = () => {
    if (!result?.ocr_details?.length) return null;

    return result.ocr_details.map((item, index) => {
      if (!item.bbox || item.bbox.length < 4) return null;

      const [x1, y1, x2, y2] = item.bbox;

      // The backend preprocessing scales small images to at least 1200px
      // wide. Use that same coordinate space when mapping boxes back
      // over the uploaded image.
      const originalWidth = 1200;
      const originalHeightRatio = 1;

      return (
        <div
          key={`${item.text}-${index}`}
          className="ocr-box"
          style={{
            left: `${(x1 / originalWidth) * 100}%`,
            top: `${(y1 / (originalWidth * originalHeightRatio)) * 100}%`,
            width: `${((x2 - x1) / originalWidth) * 100}%`,
            height: `${((y2 - y1) / (originalWidth * originalHeightRatio)) * 100}%`,
          }}
          title={item.text}
        >
          <span className="ocr-box-label">{item.text}</span>
        </div>
      );
    });
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="ocr-page">
      <style>{`
        .ocr-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 32px;
          box-sizing: border-box;
          color: #172033;
        }

        .ocr-hero {
          margin-bottom: 28px;
        }

        .ocr-hero h2 {
          margin: 0 0 8px;
          font-size: 30px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .ocr-subtitle {
          margin: 0;
          color: #667085;
          font-size: 15px;
        }

        .upload-panel {
          background: #ffffff;
          border: 1px solid #e4e7ec;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 8px 28px rgba(16, 24, 40, 0.06);
          margin-bottom: 24px;
        }

        .action-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .primary-button,
        .secondary-button,
        .process-button,
        .capture-button,
        .close-camera-button {
          border: 0;
          border-radius: 10px;
          padding: 11px 17px;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .primary-button,
        .process-button,
        .capture-button {
          background: #111827;
          color: white;
        }

        .primary-button:hover,
        .process-button:hover,
        .capture-button:hover {
          transform: translateY(-1px);
          opacity: 0.92;
        }

        .secondary-button,
        .close-camera-button {
          background: #f2f4f7;
          color: #344054;
        }

        .process-button {
          margin-top: 18px;
          min-width: 150px;
        }

        .process-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          transform: none;
        }

        .file-input {
          display: none;
        }

        .file-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 17px;
          border-radius: 10px;
          background: #f2f4f7;
          color: #344054;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
        }

        .selected-file {
          margin: 14px 0 0;
          color: #475467;
          font-size: 13px;
        }

        .preview-section {
          margin-top: 22px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 12px;
        }

        .preview-image {
          display: block;
          width: 100%;
          max-height: 520px;
          object-fit: contain;
          border-radius: 14px;
          border: 1px solid #e4e7ec;
          background: #f8fafc;
        }

        .camera-container {
          margin-top: 20px;
          background: #101828;
          border-radius: 16px;
          padding: 16px;
        }

        .camera-preview {
          display: block;
          width: 100%;
          max-height: 520px;
          object-fit: contain;
          border-radius: 12px;
          background: #000;
        }

        .camera-controls {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .error {
          margin: 16px 0;
          padding: 13px 15px;
          border-radius: 10px;
          background: #fef3f2;
          color: #b42318;
          border: 1px solid #fecdca;
          font-size: 14px;
        }

        .processing-card {
          background: #ffffff;
          border: 1px solid #e4e7ec;
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 28px rgba(16, 24, 40, 0.05);
        }

        .processing-card h3 {
          margin: 0 0 18px;
          font-size: 18px;
        }

        .processing-step {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          padding: 11px 0;
          border-bottom: 1px solid #f2f4f7;
        }

        .processing-step:last-child {
          border-bottom: 0;
        }

        .step-icon {
          width: 26px;
          height: 26px;
          min-width: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f2f4f7;
          color: #98a2b3;
          font-size: 13px;
          font-weight: 700;
        }

        .step-icon.active {
          background: #eef4ff;
          color: #175cd3;
        }

        .step-icon.done {
          background: #ecfdf3;
          color: #027a48;
        }

        .step-title {
          font-size: 14px;
          font-weight: 650;
          color: #344054;
        }

        .step-description {
          margin-top: 2px;
          font-size: 12px;
          color: #98a2b3;
        }

        .analysis-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
          gap: 24px;
          align-items: start;
        }

        .left-column,
        .right-column {
          min-width: 0;
        }

        .card {
          background: #ffffff;
          border: 1px solid #e4e7ec;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 22px;
          box-shadow: 0 8px 28px rgba(16, 24, 40, 0.05);
        }

        .card h3 {
          margin: 0 0 18px;
          font-size: 18px;
        }

        .image-frame {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e4e7ec;
          line-height: 0;
        }

        .processed-image {
          display: block;
          width: 100%;
          height: auto;
          max-height: 700px;
          object-fit: contain;
        }

        .ocr-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .ocr-box {
          position: absolute;
          border: 2px solid #175cd3;
          background: rgba(23, 92, 211, 0.08);
          box-sizing: border-box;
        }

        .ocr-box-label {
          position: absolute;
          left: -1px;
          top: -21px;
          max-width: 220px;
          padding: 2px 5px;
          border-radius: 4px;
          background: #175cd3;
          color: white;
          font-size: 9px;
          line-height: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .image-note {
          margin: 10px 0 0;
          color: #667085;
          font-size: 12px;
        }

        .product-group {
          margin-bottom: 22px;
        }

        .product-group:last-child {
          margin-bottom: 0;
        }

        .product-group-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #667085;
          font-weight: 750;
          margin: 0 0 10px;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .product-field {
          min-width: 0;
          border: 1px solid #eaecf0;
          background: #fcfcfd;
          border-radius: 11px;
          padding: 12px;
        }

        .product-field.full-width {
          grid-column: 1 / -1;
        }

        .product-field-label {
          display: block;
          font-size: 11px;
          color: #667085;
          margin-bottom: 5px;
          font-weight: 600;
        }

        .product-field-value {
          display: block;
          color: #101828;
          font-size: 14px;
          font-weight: 650;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .product-field-value.missing {
          color: #98a2b3;
          font-weight: 500;
        }

        .summary-strip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 12px;
          background: #f8fafc;
          margin-bottom: 16px;
        }

        .summary-number {
          font-size: 22px;
          font-weight: 800;
          color: #101828;
        }

        .summary-label {
          color: #667085;
          font-size: 13px;
        }

        .status-box {
          padding: 13px 15px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 650;
        }

        .status-review {
          background: #fffaeb;
          color: #b54708;
          border: 1px solid #fedf89;
        }

        .status-pass {
          background: #ecfdf3;
          color: #027a48;
          border: 1px solid #abefc6;
        }

        .source-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .source-item {
          border: 1px solid #eaecf0;
          border-radius: 11px;
          padding: 13px;
          background: #fcfcfd;
        }

        .source-item h4 {
          margin: 0 0 7px;
          font-size: 13px;
        }

        .source-success {
          color: #027a48;
          font-size: 12px;
          font-weight: 650;
        }

        .source-warning {
          color: #b54708;
          font-size: 12px;
          font-weight: 650;
        }

        .warning {
          margin: 14px 0 0;
          padding: 10px 12px;
          background: #fffaeb;
          border: 1px solid #fedf89;
          color: #b54708;
          border-radius: 9px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        details {
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #ffffff;
          margin-top: 12px;
        }

        summary {
          cursor: pointer;
          padding: 13px 15px;
          font-size: 13px;
          font-weight: 650;
          color: #344054;
        }

        .details-content {
          padding: 0 15px 15px;
        }

        .text-item {
          padding: 9px 0;
          border-bottom: 1px solid #f2f4f7;
          font-size: 12px;
          color: #475467;
          overflow-wrap: anywhere;
        }

        .text-item:last-child {
          border-bottom: 0;
        }

        .compliance-row {
          display: grid;
          grid-template-columns: 24px 145px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
          padding: 10px 0;
          border-bottom: 1px solid #f2f4f7;
          font-size: 12px;
        }

        .compliance-row:last-child {
          border-bottom: 0;
        }

        .compliance-value {
          overflow-wrap: anywhere;
          color: #475467;
        }

        .legal-engine-card {
          position: sticky;
          top: 18px;
        }

        .legal-status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          padding: 16px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #eaecf0;
        }

        .legal-status-title {
          margin: 0 0 4px;
          font-size: 12px;
          color: #667085;
          font-weight: 650;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .legal-status-value {
          font-size: 23px;
          font-weight: 800;
          line-height: 1.1;
        }

        .legal-status-value.pass {
          color: #027a48;
        }

        .legal-status-value.fail {
          color: #b42318;
        }

        .legal-status-value.review {
          color: #b54708;
        }

        .score-box {
          text-align: right;
        }

        .score-value {
          font-size: 24px;
          font-weight: 800;
          color: #101828;
        }

        .score-label {
          display: block;
          margin-top: 2px;
          color: #667085;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .rule-count-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 7px;
          margin-bottom: 18px;
        }

        .rule-count {
          padding: 9px 6px;
          border: 1px solid #eaecf0;
          border-radius: 9px;
          text-align: center;
          background: #fcfcfd;
        }

        .rule-count strong {
          display: block;
          font-size: 17px;
          line-height: 1.1;
        }

        .rule-count span {
          display: block;
          margin-top: 4px;
          color: #667085;
          font-size: 9px;
          text-transform: uppercase;
        }

        .rule-count.pass strong {
          color: #027a48;
        }

        .rule-count.fail strong {
          color: #b42318;
        }

        .rule-count.review strong {
          color: #b54708;
        }

        .rule-count.na strong,
        .rule-count.oos strong {
          color: #667085;
        }

        .rule-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rule-card {
          border: 1px solid #eaecf0;
          border-radius: 13px;
          background: #ffffff;
          overflow: hidden;
        }

        .rule-card.pass {
          border-left: 4px solid #12b76a;
        }

        .rule-card.fail {
          border-left: 4px solid #f04438;
        }

        .rule-card.review {
          border-left: 4px solid #f79009;
        }

        .rule-card.na,
        .rule-card.oos {
          border-left: 4px solid #98a2b3;
        }

        .rule-main {
          padding: 12px 13px;
        }

        .rule-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .rule-title-wrap {
          min-width: 0;
        }

        .rule-id {
          color: #667085;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .rule-name {
          margin-top: 3px;
          color: #101828;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.35;
        }

        .rule-status {
          flex: 0 0 auto;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.25px;
        }

        .rule-pass {
          background: #ecfdf3;
          color: #027a48;
        }

        .rule-fail {
          background: #fef3f2;
          color: #b42318;
        }

        .rule-review {
          background: #fffaeb;
          color: #b54708;
        }

        .rule-na,
        .rule-oos {
          background: #f2f4f7;
          color: #667085;
        }

        .rule-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 11px;
        }

        .rule-field {
          min-width: 0;
          padding: 8px 9px;
          border-radius: 9px;
          background: #f8fafc;
        }

        .rule-field.full {
          grid-column: 1 / -1;
        }

        .rule-field-label {
          display: block;
          margin-bottom: 3px;
          color: #667085;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.25px;
        }

        .rule-field-value {
          color: #344054;
          font-size: 11px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .rule-suggestion {
          margin-top: 9px;
          padding: 8px 9px;
          border-radius: 8px;
          background: #f8fafc;
          color: #475467;
          font-size: 10px;
          line-height: 1.4;
        }

        .rule-empty {
          padding: 22px 10px;
          text-align: center;
          color: #667085;
          font-size: 13px;
        }

        .engine-note {
          margin-top: 14px;
          padding: 10px 11px;
          border-radius: 9px;
          background: #f8fafc;
          border: 1px solid #eaecf0;
          color: #667085;
          font-size: 10px;
          line-height: 1.45;
        }

        @media (max-width: 1050px) {
          .analysis-layout {
            grid-template-columns: 1fr;
          }

          .right-column {
            order: 2;
          }
        }

        @media (max-width: 650px) {
          .ocr-page {
            padding: 18px;
          }

          .product-grid,
          .source-grid {
            grid-template-columns: 1fr;
          }

          .product-field.full-width {
            grid-column: auto;
          }

          .compliance-row {
            grid-template-columns: 24px 110px minmax(0, 1fr);
          }

          .ocr-hero h2 {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="ocr-hero">
        <h2>Product Label Scanner</h2>
        <p className="ocr-subtitle">
          Upload or capture a product label and extract structured product
          information using AI.
        </p>
      </div>

      {/* ===================================================== */}
      {/* Upload / Camera */}
      {/* ===================================================== */}

      <div className="upload-panel">
        {!cameraOpen && (
          <div className="action-row">
            <label className="file-label">
              📁 Choose Image
              <input
                className="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>

            <button className="primary-button" onClick={openCamera}>
              📷 Open Camera
            </button>
          </div>
        )}

        {cameraOpen && (
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-preview"
            />

            <div className="camera-controls">
              <button className="capture-button" onClick={captureImage}>
                📸 Capture
              </button>

              <button
                className="close-camera-button"
                onClick={closeCamera}
              >
                ✕ Close Camera
              </button>
            </div>
          </div>
        )}

        {file && !cameraOpen && (
          <>
            <p className="selected-file">
              Selected image: <strong>{file.name}</strong>
            </p>

            {previewUrl && (
              <div className="preview-section">
                <h3 className="section-title">Image Preview</h3>
                <img
                  src={previewUrl}
                  alt="Selected product label"
                  className="preview-image"
                />
              </div>
            )}

            <button
              className="process-button"
              onClick={handleProcess}
              disabled={loading}
            >
              {loading ? "Processing..." : "▶ Process Image"}
            </button>
          </>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {/* ===================================================== */}
      {/* Step-by-step processing */}
      {/* ===================================================== */}

      {(loading || processingFinished) && (
        <div className="processing-card">
          <h3>AI Processing Pipeline</h3>

          {PROCESSING_STEPS.map((step, index) => {
            const isDone =
              processingFinished || index < processingStep;
            const isActive =
              !processingFinished && index === processingStep;

            return (
              <div className="processing-step" key={step.id}>
                <div
                  className={`step-icon ${
                    isDone ? "done" : isActive ? "active" : ""
                  }`}
                >
                  {isDone ? "✓" : isActive ? "●" : index + 1}
                </div>

                <div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================== */}
      {/* Results */}
      {/* ===================================================== */}

      {result && productData && (
        <div className="analysis-layout">
          {/* ================================================= */}
          {/* LEFT */}
          {/* ================================================= */}

          <div className="left-column">
            <div className="card">
              <h3>Processed Image & OCR Text Detection</h3>

              <div className="image-frame">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Product label with OCR boxes"
                      className="processed-image"
                    />

                    <div className="ocr-overlay">
                      {renderBoundingBoxes()}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 30 }}>
                    Processed image preview unavailable.
                  </div>
                )}
              </div>

              <p className="image-note">
                Blue boxes represent text regions detected by PaddleOCR.
                Hover over a box to view the detected text.
              </p>
            </div>

            {/* ================================================= */}
            {/* Product Information */}
            {/* ================================================= */}

            <div className="card">
              <h3>Product Information</h3>

              {FIELD_GROUPS.map((group) => (
                <div className="product-group" key={group.title}>
                  <h4 className="product-group-title">{group.title}</h4>

                  <div className="product-grid">
                    {group.fields.map(([label, key]) => {
                      const value = productData[key as keyof ProductData];
                      const present = hasValue(value);

                      const fullWidth =
                        key === "address" ||
                        key === "consumer_contact" ||
                        key === "ingredients";

                      return (
                        <div
                          className={`product-field ${
                            fullWidth ? "full-width" : ""
                          }`}
                          key={key}
                        >
                          <span className="product-field-label">
                            {label}
                          </span>

                          <span
                            className={`product-field-value ${
                              !present ? "missing" : ""
                            }`}
                          >
                            {displayValue(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================= */}
          {/* RIGHT */}
          {/* ================================================= */}

          <div className="right-column">
            <div className="card legal-engine-card">
              <h3>Legal Metrology Rule Engine</h3>

              {!compliance ? (
                <div className="rule-empty">
                  Compliance results are not available yet.
                  <br />
                  Process an image to run the 2011 Legal Metrology Rules.
                </div>
              ) : (
                <>
                  <div className="legal-status-header">
                    <div>
                      <div className="legal-status-title">
                        Overall Product Status
                      </div>

                      <div
                        className={`legal-status-value ${
                          complianceStatus === "PASS"
                            ? "pass"
                            : complianceStatus === "FAIL"
                              ? "fail"
                              : "review"
                        }`}
                      >
                        {complianceStatus}
                      </div>
                    </div>

                    <div className="score-box">
                      <div className="score-value">
                        {complianceScore !== null
                          ? `${complianceScore}%`
                          : "—"}
                      </div>
                      <span className="score-label">
                        Compliance Score
                      </span>
                    </div>
                  </div>

                  <div className="rule-count-grid">
                    <div className="rule-count pass">
                      <strong>{complianceSummary.pass ?? 0}</strong>
                      <span>Pass</span>
                    </div>

                    <div className="rule-count fail">
                      <strong>{complianceSummary.fail ?? 0}</strong>
                      <span>Fail</span>
                    </div>

                    <div className="rule-count review">
                      <strong>{complianceSummary.review ?? 0}</strong>
                      <span>Review</span>
                    </div>

                    <div className="rule-count na">
                      <strong>
                        {complianceSummary.not_applicable ?? 0}
                      </strong>
                      <span>N/A</span>
                    </div>

                    <div className="rule-count oos">
                      <strong>
                        {complianceSummary.out_of_scope ?? 0}
                      </strong>
                      <span>Out</span>
                    </div>
                  </div>

                  <div className="rule-list">
                    {complianceRules.length === 0 ? (
                      <div className="rule-empty">
                        No rule results were returned by the compliance engine.
                      </div>
                    ) : (
                      complianceRules.map((rule, index) => {
                        const status = String(
                          rule.status ?? "REVIEW"
                        ).toUpperCase();

                        const ruleClass =
                          status === "PASS"
                            ? "pass"
                            : status === "FAIL"
                              ? "fail"
                              : status === "NOT_APPLICABLE"
                                ? "na"
                                : status === "OUT_OF_SCOPE"
                                  ? "oos"
                                  : "review";

                        return (
                          <div
                            className={`rule-card ${ruleClass}`}
                            key={`${rule.rule_id ?? rule.rule_number ?? "rule"}-${index}`}
                          >
                            <div className="rule-main">
                              <div className="rule-header">
                                <div className="rule-title-wrap">
                                  <div className="rule-id">
                                    {rule.rule_id ??
                                      `LM-${rule.rule_number ?? index + 1}`}
                                    {rule.rule_number
                                      ? ` • Rule ${rule.rule_number}`
                                      : ""}
                                  </div>

                                  <div className="rule-name">
                                    {rule.rule_name ??
                                      "Legal Metrology requirement"}
                                  </div>
                                </div>

                                <span
                                  className={`rule-status ${statusClass(status)}`}
                                >
                                  {statusIcon(status)} {status}
                                </span>
                              </div>

                              <div className="rule-fields">
                                <div className="rule-field">
                                  <span className="rule-field-label">
                                    Expected
                                  </span>
                                  <span className="rule-field-value">
                                    {formatComplianceValue(rule.expected)}
                                  </span>
                                </div>

                                <div className="rule-field">
                                  <span className="rule-field-label">
                                    Extracted
                                  </span>
                                  <span className="rule-field-value">
                                    {formatComplianceValue(
                                      rule.extracted_value ??
                                        rule.extracted
                                    )}
                                  </span>
                                </div>

                                <div className="rule-field full">
                                  <span className="rule-field-label">
                                    Evidence
                                  </span>
                                  <span className="rule-field-value">
                                    {formatEvidence(rule.evidence)}
                                  </span>
                                </div>

                                <div className="rule-field full">
                                  <span className="rule-field-label">
                                    Reason
                                  </span>
                                  <span className="rule-field-value">
                                    {formatComplianceValue(rule.reason)}
                                  </span>
                                </div>
                              </div>

                              {(rule.rule_reference || rule.source) && (
                                <div className="rule-suggestion">
                                  <strong>Rule Reference:</strong>{" "}
                                  {rule.rule_reference ?? rule.source}
                                </div>
                              )}

                              {rule.suggestion && (
                                <div className="rule-suggestion">
                                  <strong>Action:</strong>{" "}
                                  {rule.suggestion}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="engine-note">
                    <strong>Important:</strong> REVIEW means the available
                    image/OCR evidence is insufficient for a conclusive
                    automated decision. A missing OCR value is not treated as
                    proof that a legal declaration is absent. Compliance Score
                    is separate from the legal PASS/FAIL/REVIEW status.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* Result exists but no structured product data */}
      {/* ===================================================== */}

      {result && !productData && (
        <div className="card">
          <h3>Processing Result</h3>
          <p>
            OCR processing completed, but no structured product information
            was returned.
          </p>
        </div>
      )}
    </div>
  );
}

export default OCRUpload;
