import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  ArrowRight,
  MapPin
} from "lucide-react";
import { consumerService, type ConsumerScanItem } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

export default function ConsumerScanner() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Reset all state when mounting to guarantee strict isolation between separate scans
  useEffect(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setLoading(false);
    setError(null);
    setCurrentStep("");
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError(null);
      } else {
        setError(t("scanner.dragDropSubtitle", "Please upload a valid image file (JPG, PNG, WebP)."));
      }
    }
  };

  const handleStartScan = async () => {
    if (!selectedFile) {
      setError("Please select or capture an image of a packaged commodity label first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      setCurrentStep(t("scanner.stepUploading", "Uploading packaged label image..."));
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("language", language);

      // Add optional geolocation if permitted by citizen
      if (locationSharing && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              { timeout: 3500, enableHighAccuracy: false }
            );
          });
          if (position) {
            const locObj = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
            };
            formData.append("location", JSON.stringify(locObj));
          }
        } catch {
          // Denied or timed out - continue scanning smoothly without blocking
        }
      }

      setCurrentStep(t("scanner.stepExtracting", "Extracting text, ingredients, nutrition & dates..."));
      const scanResult: ConsumerScanItem = await consumerService.scanProduct(formData, language);

      setCurrentStep(t("scanner.stepComplete", "Analysis complete!"));
      navigate(`/user/scans/${scanResult.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to scan product. Please check your image clarity and retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Sparkles size={22} color="#059669" />
          <h1 style={{ fontSize: "1.55rem", fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.01em" }}>
            {t("scanner.title", "Packaged Product Label Scanner")}
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
          {t("scanner.subtitle", "Upload or capture a photo of product packaging for instant product information, shelf-life, and consumer awareness.")}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "0.85rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#991b1b",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone Box */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "2px dashed #cbd5e1",
          padding: "2rem 1.5rem",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          position: "relative",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {previewUrl ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                position: "relative",
                maxWidth: "360px",
                maxHeight: "360px",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
              }}
            >
              <img
                src={previewUrl}
                alt="Product Label Preview"
                style={{ width: "100%", height: "auto", display: "block", maxHeight: "360px", objectFit: "contain" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{
                  padding: "0.5rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("scanner.changePhoto", "Choose Different Photo")}
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                style={{
                  padding: "0.5rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Camera size={15} />
                <span>{t("scanner.retakePhoto", "Take New Photo")}</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ImageIcon size={32} />
            </div>

            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.25rem" }}>
                {t("scanner.dragDropTitle", "Drag and drop your product photo here")}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                {t("scanner.dragDropSubtitle", "Supports JPG, PNG, WebP of packaged commodity labels")}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.6rem 1.1rem",
                  borderRadius: "8px",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
                }}
              >
                <Upload size={16} />
                <span>{t("scanner.choosePhoto", "Select File")}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.6rem 1.1rem",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                }}
              >
                <Camera size={16} />
                <span>{t("scanner.openCamera", "Open Camera")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Geolocation Option Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1rem", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <input
          type="checkbox"
          id="geoToggle"
          checked={locationSharing}
          onChange={(e) => setLocationSharing(e.target.checked)}
          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#059669" }}
        />
        <label htmlFor="geoToggle" style={{ fontSize: "0.82rem", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <MapPin size={15} color="#059669" />
          <span>{t("scanner.locationPrompt", "Use my current location to help identify local product issues (Optional)")}</span>
        </label>
      </div>

      {/* Action Button & Processing State */}
      {selectedFile && (
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={handleStartScan}
            disabled={loading}
            style={{
              padding: "0.85rem 2.25rem",
              borderRadius: "10px",
              backgroundColor: "#059669",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 800,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              transition: "transform 0.1s",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                <span>{t("scanner.analyzing", "Analyzing Product Package...")}</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>{t("scanner.runAnalysis", "Analyze Product Package")}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {loading && (
            <div style={{ marginTop: "1rem", color: "#047857", fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Sparkles size={16} />
              <span>{currentStep}</span>
            </div>
          )}
        </div>
      )}

      {/* Helpful Tips for Best Scan Results */}
      <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.85rem", color: "#1e293b", marginBottom: "0.5rem" }}>
          <Info size={16} color="#059669" />
          <span>{t("scanner.tipsTitle", "Tips for Accurate Consumer Analysis:")}</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>
          <li>{t("scanner.tip1", "Ensure good lighting and avoid glare or reflections on glossy packaging.")}</li>
          <li>{t("scanner.tip2", "For food items, capture the panel where Ingredients and Nutrition Facts are printed.")}</li>
          <li>{t("scanner.tip3", "Ensure the manufacturing/expiry date and MRP stamp are clearly visible in the photo.")}</li>
        </ul>
      </div>
    </div>
  );
}
