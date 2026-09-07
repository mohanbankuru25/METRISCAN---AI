import { useState, useEffect } from "react";
import { Play, RotateCcw, FileText, Image as ImageIcon } from "lucide-react";

interface ScanPreviewProps {
  file: File;
  previewUrl: string;
  onStartScan: () => void;
  onReset: () => void;
  loading: boolean;
}

export function ScanPreview({
  file,
  previewUrl,
  onStartScan,
  onReset,
  loading,
}: ScanPreviewProps) {
  const [dimensions, setDimensions] = useState<string>("");

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions(`${img.width} × ${img.height} px`);
    };
    img.src = previewUrl;
  }, [previewUrl]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="panel-card-header" style={{ marginBottom: 0 }}>
        <div className="panel-card-title">
          <ImageIcon size={18} color="#2563eb" />
          <span>Product Package Image Preview</span>
        </div>
        <button onClick={onReset} disabled={loading} className="btn btn-secondary btn-sm">
          <RotateCcw size={14} />
          <span>Retake / Change Image</span>
        </button>
      </div>

      {/* Image container */}
      <div
        style={{
          width: "100%",
          maxHeight: "450px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem"
        }}
      >
        <img
          src={previewUrl}
          alt="Package preview"
          style={{ width: "100%", height: "100%", maxHeight: "430px", objectFit: "contain" }}
        />
      </div>

      {/* File info bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          backgroundColor: "#f1f5f9",
          borderRadius: "8px",
          fontSize: "0.85rem",
          color: "#475569"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, color: "#0f172a" }}>
          <FileText size={16} color="#2563eb" />
          <span className="truncate" style={{ maxWidth: "300px" }}>{file.name}</span>
        </div>
        <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.775rem" }}>
          <span>Size: <strong>{formatFileSize(file.size)}</strong></span>
          {dimensions && <span>Resolution: <strong>{dimensions}</strong></span>}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStartScan}
        disabled={loading}
        className="btn btn-blue btn-lg"
        style={{ width: "100%", gap: "0.6rem" }}
      >
        <Play size={20} />
        <span>{loading ? "Analyzing Package..." : "Start Compliance Scan"}</span>
      </button>
    </div>
  );
}
