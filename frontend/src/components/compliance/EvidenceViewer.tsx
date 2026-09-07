import { useState } from "react";
import { Eye, Layers, ZoomIn } from "lucide-react";
import type { OCRDetail } from "../../types/ocr";
import type { ComplianceRuleResult } from "../../types/compliance";

interface EvidenceViewerProps {
  imageUrl: string;
  ocrDetails?: OCRDetail[];
  selectedRule?: ComplianceRuleResult | null;
}

export function EvidenceViewer({ imageUrl, ocrDetails = [], selectedRule }: EvidenceViewerProps) {
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [hoveredText, setHoveredText] = useState<string | null>(null);

  const getHighlightedText = (): string | null => {
    if (!selectedRule) return null;
    if (typeof selectedRule.extracted_value === "string") return selectedRule.extracted_value;
    if (typeof selectedRule.extracted === "string") return selectedRule.extracted;
    if (Array.isArray(selectedRule.evidence) && selectedRule.evidence.length > 0) {
      const firstEv = selectedRule.evidence[0];
      if (typeof firstEv === "string") return firstEv;
      if (typeof firstEv === "object" && firstEv.text) return firstEv.text;
    }
    return null;
  };

  const activeQuery = getHighlightedText();

  const originalWidth = 1200;
  const originalHeightRatio = 1;

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <Eye size={18} color="#2563eb" />
          <span>Product Package OCR & Bounding Box Evidence</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.25rem 0.6rem" }}
          >
            <Layers size={13} />
            <span>{showBoxes ? "Hide Boxes" : "Show Bounding Boxes"}</span>
          </button>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          backgroundColor: "#0f172a",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0
        }}
      >
        <img
          src={imageUrl}
          alt="OCR Evidence"
          style={{ width: "100%", height: "auto", maxHeight: "650px", objectFit: "contain" }}
        />

        {/* OCR Overlays */}
        {showBoxes && ocrDetails && ocrDetails.length > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none"
            }}
          >
            {ocrDetails.map((item, idx) => {
              if (!item.bbox || item.bbox.length < 4) return null;
              const [x1, y1, x2, y2] = item.bbox;

              const isMatched =
                activeQuery &&
                item.text &&
                (item.text.toLowerCase().includes(activeQuery.toLowerCase()) ||
                  activeQuery.toLowerCase().includes(item.text.toLowerCase()));

              const isHovered = hoveredText === item.text;

              const boxBorderColor = isMatched ? "#22c55e" : isHovered ? "#38bdf8" : "#2563eb";
              const boxBg = isMatched
                ? "rgba(34, 197, 94, 0.25)"
                : isHovered
                ? "rgba(56, 189, 248, 0.2)"
                : "rgba(37, 99, 235, 0.1)";

              return (
                <div
                  key={`${item.text}-${idx}`}
                  onMouseEnter={() => setHoveredText(item.text)}
                  onMouseLeave={() => setHoveredText(null)}
                  title={item.text}
                  style={{
                    position: "absolute",
                    left: `${(x1 / originalWidth) * 100}%`,
                    top: `${(y1 / (originalWidth * originalHeightRatio)) * 100}%`,
                    width: `${((x2 - x1) / originalWidth) * 100}%`,
                    height: `${((y2 - y1) / (originalWidth * originalHeightRatio)) * 100}%`,
                    border: `2px solid ${boxBorderColor}`,
                    backgroundColor: boxBg,
                    pointerEvents: "auto",
                    boxSizing: "border-box",
                    borderRadius: "2px",
                    transition: "all 0.15s ease-in-out"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: "-1px",
                      top: "-20px",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      backgroundColor: boxBorderColor,
                      color: "#ffffff",
                      fontSize: "9px",
                      fontWeight: 700,
                      lineHeight: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "180px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.5)"
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <ZoomIn size={14} color="#2563eb" />
          <span>Click any rule to highlight matching OCR bounding box evidence on label.</span>
        </div>
        <span style={{ fontWeight: 600 }}>{ocrDetails.length} OCR Text Blocks Detected</span>
      </div>
    </div>
  );
}
