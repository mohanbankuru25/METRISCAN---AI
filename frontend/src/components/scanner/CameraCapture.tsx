import { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, CheckCircle2 } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const startStream = async (mode: "environment" | "user") => {
    setError("");
    setIsCameraReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraReady(true);
    } catch (err) {
      console.error(err);
      setError("Unable to access camera. Please allow camera permissions in browser.");
    }
  };

  useEffect(() => {
    startStream(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Failed to initialize canvas context.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to generate captured image file.");
          return;
        }
        const capturedFile = new File([blob], `camera_capture_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        // Stop stream before delivering
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        onCapture(capturedFile);
      },
      "image/jpeg",
      0.95
    );
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        borderRadius: "14px",
        padding: "1.25rem",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "1rem" }}>
          <Camera size={20} color="#38bdf8" />
          <span>Live Package Camera Scanner</span>
        </div>
        <button
          onClick={onClose}
          className="btn btn-secondary btn-sm"
          style={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#ffffff" }}
        >
          <X size={16} />
          <span>Close</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", backgroundColor: "#7f1d1d", color: "#fecaca", borderRadius: "8px", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* Video Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "480px",
          backgroundColor: "#000000",
          borderRadius: "10px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", maxHeight: "480px", objectFit: "contain" }}
        />

        {/* Viewfinder Target Graphic */}
        <div
          style={{
            position: "absolute",
            inset: "15%",
            border: "2px dashed rgba(56, 189, 248, 0.6)",
            borderRadius: "12px",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", color: "#38bdf8", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
            Align Commodity Package Label Here
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <button
          onClick={toggleFacingMode}
          className="btn btn-secondary btn-sm"
          style={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#ffffff" }}
          title="Switch Camera"
        >
          <RefreshCw size={16} />
          <span>Switch Camera ({facingMode})</span>
        </button>

        <button
          onClick={capturePhoto}
          disabled={!isCameraReady}
          className="btn btn-blue btn-lg"
          style={{ gap: "0.5rem" }}
        >
          <CheckCircle2 size={20} />
          <span>Capture Label</span>
        </button>
      </div>
    </div>
  );
}
