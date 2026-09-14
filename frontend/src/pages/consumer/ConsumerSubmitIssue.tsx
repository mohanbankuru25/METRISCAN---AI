import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  AlertTriangle,
  Upload,
  Mic,
  MicOff,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { consumerService } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

const langTagMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  te: "te-IN",
  ta: "ta-IN",
  kn: "kn-IN",
};

export default function ConsumerSubmitIssue() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Primary State
  const [productName, setProductName] = useState(searchParams.get("product_name") || "");
  const [description, setDescription] = useState("");
  const [imageConfirmed, setImageConfirmed] = useState(false);

  // Photo
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording & Speech-to-Text
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Geolocation
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Submit status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [photoPreview]);

  // Photo handlers
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setImageConfirmed(true);
    }
  };

  // Location handler
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t("reportForm.locationNotSupported", "Geolocation is not supported by your device."));
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.warn("Location error:", err);
        setLocationError(t("reportForm.locationDeniedMsg", "Location permission denied or unavailable. Issue will be submitted with general area."));
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Voice recording & Speech-to-Text handler
  const startVoiceRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      setRecordingSeconds(0);

      // 1. Start audio media recorder
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      }

      // 2. Start SpeechRecognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langTagMap[language] || "en-IN";

        recognition.onresult = (event: any) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          if (fullTranscript.trim()) {
            setDescription(fullTranscript.trim());
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition notice:", e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 90) {
            stopVoiceRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setIsRecording(false);
      setError(t("voice.micError", "Microphone access denied or unavailable. Please type your issue below."));
    }
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPhoto) {
      setError(t("reportForm.errorPhotoRequired", "Please upload or take a photo of the product package or issue."));
      return;
    }

    if (!imageConfirmed) {
      setError(t("reportForm.errorConfirmationRequired", "Please confirm that this image represents the product/issue you want to report."));
      return;
    }

    if (!description.trim()) {
      setError(t("reportForm.errorDescriptionRequired", "Please describe the issue using text or voice recording."));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append("photo", selectedPhoto);
      formData.append("description", description.trim());
      formData.append("product_name", productName.trim() || t("reportForm.defaultProductName", "Packaged Product Issue"));
      formData.append("category", "LABEL_VIOLATION");
      formData.append("language", language);

      if (audioBlob) {
        const audioFile = new File([audioBlob], "voice_complaint.webm", { type: "audio/webm" });
        formData.append("audio", audioFile);
      }

      if (location) {
        formData.append("latitude", location.latitude.toString());
        formData.append("longitude", location.longitude.toString());
        formData.append("accuracy", location.accuracy.toString());
      }

      const scanId = searchParams.get("scan_id");
      if (scanId) {
        formData.append("scan_id", scanId);
      }

      await consumerService.submitIssue(formData);
      navigate("/user/community", { replace: true });
    } catch (err: any) {
      setError(err.message || t("reportForm.submitFailed", "Failed to submit grievance. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={24} color="#dc2626" />
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {t("reportForm.title", "REPORT A PRODUCT ISSUE")}
            </h1>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            {t("reportForm.subtitle", "Simple 4-step report to protect fellow consumers and alert regulatory authorities")}
          </p>
        </div>

        <Link
          to="/user"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            color: "#64748b",
            textDecoration: "none",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={15} />
          <span>{t("nav.dashboard", "Dashboard")}</span>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "0.85rem 1.1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#991b1b",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Simplified 4-Step Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* STEP 1: UPLOAD / TAKE PHOTO */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "1.35rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                fontSize: "0.8rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #a7f3d0",
              }}
            >
              1
            </span>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {t("reportForm.step1Title", "Upload or Take a Photo")}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>*</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />

          {!photoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "2rem 1.5rem",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Camera size={24} color="#059669" />
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b" }}>
                {t("reportForm.uploadPhotoBtn", "Take / Upload Package Photo")}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.3rem" }}>
                {t("reportForm.uploadPhotoHint", "Tap to capture from camera or browse images (JPEG, PNG)")}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                <img
                  src={photoPreview}
                  alt="Product issue evidence"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>{t("reportForm.photoAttached", "Photo Attached")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "6px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={13} />
                  <span>{t("reportForm.changePhoto", "Change Photo")}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIRMATION CHECKBOX */}
          <div
            style={{
              marginTop: "1.1rem",
              paddingTop: "0.85rem",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.65rem",
            }}
          >
            <input
              type="checkbox"
              id="confirm-image-check"
              checked={imageConfirmed}
              onChange={(e) => setImageConfirmed(e.target.checked)}
              style={{ marginTop: "0.2rem", width: "18px", height: "18px", cursor: "pointer", accentColor: "#059669" }}
            />
            <label
              htmlFor="confirm-image-check"
              style={{ fontSize: "0.84rem", color: "#1e293b", fontWeight: 600, cursor: "pointer", lineHeight: 1.4 }}
            >
              {t("reportForm.confirmImage", "I confirm that this image represents the product / issue I want to report.")}
            </label>
          </div>
        </div>

        {/* STEP 3: ATTACH CURRENT LOCATION */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "1.35rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #a7f3d0",
                }}
              >
                2
              </span>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  {t("reportForm.step2Title", "Attach Current Location")}
                </h2>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.1rem" }}>
                  {t("reportForm.locationSubtext", "Helps alert citizens and officials in your specific area")}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={locationLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.55rem 0.95rem",
                borderRadius: "8px",
                backgroundColor: location ? "#ecfdf5" : "#f1f5f9",
                border: location ? "1px solid #a7f3d0" : "1px solid #cbd5e1",
                color: location ? "#059669" : "#334155",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: locationLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {locationLoading ? (
                <Loader2 size={14} className="spin" style={{ animation: "spin 1s linear infinite" }} />
              ) : location ? (
                <CheckCircle2 size={14} color="#059669" />
              ) : (
                <MapPin size={14} color="#059669" />
              )}
              <span>
                {locationLoading
                  ? t("reportForm.fetchingLocation", "Fetching GPS...")
                  : location
                  ? t("reportForm.locationAttached", "Location Attached ✓")
                  : t("reportForm.attachLocationBtn", "Attach Current Location")}
              </span>
            </button>
          </div>

          {location && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.6rem 0.85rem",
                backgroundColor: "#f0fdf4",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
                fontSize: "0.78rem",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <MapPin size={14} />
              <span>
                {t("reportForm.coordinates", "GPS Coordinates")}: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} (±{Math.round(location.accuracy)}m)
              </span>
            </div>
          )}

          {locationError && (
            <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "#b45309" }}>
              {locationError}
            </div>
          )}
        </div>

        {/* STEP 4: DESCRIBE THE ISSUE (TEXT OR VOICE) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "1.35rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #a7f3d0",
                }}
              >
                3
              </span>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                {t("reportForm.step3Title", "Describe the Issue")}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>*</span>
            </div>

            {/* Optional Product Name Input */}
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={t("reportForm.productNamePlaceholder", "Product Name (e.g. Quaker Oats, Rice)")}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                width: "230px",
                outline: "none",
              }}
            />
          </div>

          {/* Voice Input Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              backgroundColor: isRecording ? "#fef2f2" : "#f8fafc",
              borderRadius: "10px",
              border: isRecording ? "1px solid #fca5a5" : "1px solid #e2e8f0",
              marginBottom: "0.85rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: isRecording ? "#fee2e2" : "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mic size={18} color={isRecording ? "#dc2626" : "#059669"} />
              </div>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>
                  {isRecording
                    ? `${t("voice.listening", "Listening...")} (${recordingSeconds}s)`
                    : t("voice.speakComplaint", "Speak your complaint")}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  {isRecording
                    ? t("voice.speakNowHint", "Speak clearly in your selected language. Voice converts to text automatically.")
                    : t("voice.clickMicHint", "Tap Record to speak your issue in your language instead of typing")}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                backgroundColor: isRecording ? "#dc2626" : "#059669",
                color: "#ffffff",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
              <span>{isRecording ? t("voice.stopRecording", "Stop Recording") : t("voice.recordVoice", "Record Voice")}</span>
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
              {t("reportForm.convertedTextLabel", "Issue Description (Type or review voice-converted text):")}
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                "reportForm.descriptionPlaceholder",
                "Describe the issue here (e.g., The package contains insects, overcharging above MRP, expired date, missing mandatory declaration)..."
              )}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                color: "#1e293b",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
                lineHeight: 1.5,
              }}
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.8rem 1.8rem",
              borderRadius: "10px",
              backgroundColor: submitting ? "#94a3b8" : "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(5,150,105,0.3)",
              transition: "all 0.15s ease",
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                <span>{t("reportForm.submitting", "Submitting Issue...")}</span>
              </>
            ) : (
              <>
                <FileCheck size={18} />
                <span>{t("reportForm.submitBtn", "SUBMIT ISSUE")}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
