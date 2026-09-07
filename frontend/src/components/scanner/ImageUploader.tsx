import React, { useRef, useState } from "react";
import { UploadCloud, FileImage } from "lucide-react";

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
}

export function ImageUploader({ onFileSelect }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("image/")) {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? "#2563eb" : "#cbd5e1"}`,
        backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
        borderRadius: "14px",
        padding: "2.5rem 1.5rem",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.15s ease-in-out"
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        style={{ display: "none" }}
        onChange={handleChange}
      />

      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2563eb",
          marginBottom: "1rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
        }}
      >
        <UploadCloud size={28} />
      </div>

      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
        Upload Commodity Package Label Image
      </h3>

      <p style={{ fontSize: "0.875rem", color: "#64748b", maxWidth: "450px", margin: "0 auto 1rem" }}>
        Drag and drop your product package photo here, or click to browse files.
      </p>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#64748b", backgroundColor: "#ffffff", padding: "0.3rem 0.75rem", borderRadius: "9999px", border: "1px solid #e2e8f0" }}>
        <FileImage size={14} color="#2563eb" />
        <span>Supports JPG, PNG, WEBP (High Resolution Recommended)</span>
      </div>
    </div>
  );
}
