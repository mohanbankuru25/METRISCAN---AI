import { useState, useEffect, useRef } from "react";
import { Eye, Layers, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import type { OCRDetail } from "../../types/ocr";
import type { ComplianceRuleResult } from "../../types/compliance";

interface EvidenceViewerProps {
  imageUrl: string;
  fallbackUrl?: string;
  ocrDetails?: OCRDetail[];
  selectedRule?: ComplianceRuleResult | null;
}

export function EvidenceViewer({
  imageUrl,
  fallbackUrl,
  ocrDetails = [],
  selectedRule,
}: EvidenceViewerProps) {
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [hoveredText, setHoveredText] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string>(imageUrl);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync currentSrc when imageUrl prop changes
  useEffect(() => {
    setCurrentSrc(imageUrl);
    setIsLoading(true);
    setHasError(false);
    setImageDimensions(null);
  }, [imageUrl]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleImageError = () => {
    if (fallbackUrl && currentSrc !== fallbackUrl) {
      // Try fallback URL
      setCurrentSrc(fallbackUrl);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => setZoom(1);

  // Extract query string to match with rule evidence
  const getHighlightedText = (): string | null => {
    if (!selectedRule) return null;
    if (typeof selectedRule.extracted_value === "string") return selectedRule.extracted_value.trim();
    if (typeof selectedRule.extracted === "string") return selectedRule.extracted.trim();
    if (Array.isArray(selectedRule.evidence) && selectedRule.evidence.length > 0) {
      const firstEv = selectedRule.evidence[0];
      if (typeof firstEv === "string") return firstEv.trim();
      if (typeof firstEv === "object" && firstEv?.text) return firstEv.text.trim();
    }
    return null;
  };

  const activeQuery = getHighlightedText();

  // Coordinate scaling factors
  // Backend preprocessor scales small images (width < 1200) up to 1200 width.
  // When measuring against original natural dimensions:
  const naturalWidth = imageDimensions?.width || 1200;
  const naturalHeight = imageDimensions?.height || 800;

  const ocrCoordWidth = naturalWidth < 1200 ? 1200 : naturalWidth;
  const ocrCoordHeight = naturalWidth < 1200 ? (naturalHeight * 1200) / naturalWidth : naturalHeight;

  const scaleX = naturalWidth / ocrCoordWidth;
  const scaleY = naturalHeight / ocrCoordHeight;

  return (
    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Header bar */}
      <div className="panel-card-header" style={{ marginBottom: 0 }}>
        <div className="panel-card-title">
          <Eye size={18} color="#2563eb" />
          <span>Product Package OCR & Bounding Box Evidence</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Zoom Controls */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#f1f5f9",
              borderRadius: "6px",
              padding: "2px",
              border: "1px solid #e2e8f0",
            }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5 || isLoading || hasError}
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.2rem 0.45rem", border: "none", backgroundColor: "transparent" }}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0 0.35rem", minWidth: "40px", textAlign: "center", color: "#334155" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 2.5 || isLoading || hasError}
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.2rem 0.45rem", border: "none", backgroundColor: "transparent" }}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            {zoom !== 1 && (
              <button
                onClick={handleResetZoom}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.2rem 0.45rem", border: "none", backgroundColor: "transparent" }}
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>

          {/* Toggle Bounding Boxes */}
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            disabled={isLoading || hasError}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.3rem 0.65rem" }}
          >
            <Layers size={13} />
            <span>{showBoxes ? "Hide Boxes" : "Show Boxes"}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        className="ocr-evidence-viewer"
        style={{
          position: "relative",
          width: "100%",
          minHeight: "340px",
          maxHeight: "650px",
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          borderRadius: "10px",
          border: "1px solid #1e293b",
          padding: "1rem",
          boxSizing: "border-box",
        }}
      >
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              color: "#94a3b8",
              zIndex: 5,
            }}
          >
            <Loader2 size={26} color="#38bdf8" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.85rem" }}>Loading OCR evidence image...</span>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              color: "#f87171",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <AlertCircle size={28} />
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Unable to display OCR evidence image.</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              The extracted text and rule evaluations below remain fully available.
            </span>
            {fallbackUrl && currentSrc !== fallbackUrl && (
              <button
                onClick={() => setCurrentSrc(fallbackUrl)}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "0.5rem" }}
              >
                Try Uploaded Preview
              </button>
            )}
          </div>
        )}

        {/* The Image Stage with exact pixel match */}
        <div
          className="ocr-image-stage"
          style={{
            position: "relative",
            width: "fit-content",
            maxWidth: "100%",
            margin: "0 auto",
            lineHeight: 0,
            display: hasError ? "none" : "inline-block",
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
          }}
        >
          <img
            ref={imgRef}
            src={currentSrc}
            alt="Product Package with OCR evidence"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              display: "block",
              width: "auto",
              maxWidth: "100%",
              height: "auto",
              maxHeight: "600px",
              objectFit: "contain",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              visibility: isLoading ? "hidden" : "visible",
            }}
          />

          {/* SVG Bounding Boxes Overlay */}
          {!isLoading && !hasError && showBoxes && imageDimensions && ocrDetails && ocrDetails.length > 0 && (
            <svg
              viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              {ocrDetails.map((item, idx) => {
                if (!item.bbox || item.bbox.length < 4) return null;
                const [x1, y1, x2, y2] = item.bbox;

                const boxX = x1 * scaleX;
                const boxY = y1 * scaleY;
                const boxW = Math.max(2, (x2 - x1) * scaleX);
                const boxH = Math.max(2, (y2 - y1) * scaleY);

                const isMatched = Boolean(
                  activeQuery &&
                  item.text &&
                  (item.text.toLowerCase().includes(activeQuery.toLowerCase()) ||
                   activeQuery.toLowerCase().includes(item.text.toLowerCase()))
                );

                const isHovered = hoveredText === item.text;

                const strokeColor = isMatched ? "#22c55e" : isHovered ? "#38bdf8" : "#2563eb";
                const strokeWidth = isMatched ? Math.max(3, naturalWidth * 0.003) : isHovered ? Math.max(2, naturalWidth * 0.002) : Math.max(1.5, naturalWidth * 0.0015);
                const fillColor = isMatched
                  ? "rgba(34, 197, 94, 0.3)"
                  : isHovered
                  ? "rgba(56, 189, 248, 0.25)"
                  : "rgba(37, 99, 235, 0.1)";

                const fontSize = Math.max(10, Math.min(22, naturalWidth * 0.015));

                return (
                  <g key={`${item.text}-${idx}`} style={{ pointerEvents: "auto" }}>
                    <rect
                      x={boxX}
                      y={boxY}
                      width={boxW}
                      height={boxH}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      rx={Math.max(1, naturalWidth * 0.002)}
                      onMouseEnter={() => setHoveredText(item.text)}
                      onMouseLeave={() => setHoveredText(null)}
                      style={{ cursor: "pointer", transition: "stroke 0.15s ease-in-out" }}
                    >
                      <title>{item.text}</title>
                    </rect>

                    {/* Prominent label tag for matched or hovered boxes */}
                    {(isMatched || isHovered) && (
                      <g>
                        <rect
                          x={boxX}
                          y={Math.max(0, boxY - fontSize - 6)}
                          width={Math.min(naturalWidth - boxX, Math.max(boxW, item.text.length * (fontSize * 0.65) + 8))}
                          height={fontSize + 6}
                          fill={strokeColor}
                          rx={3}
                        />
                        <text
                          x={boxX + 4}
                          y={Math.max(fontSize, boxY - 3)}
                          fill="#ffffff"
                          fontSize={fontSize}
                          fontWeight="700"
                          fontFamily="sans-serif"
                        >
                          {item.text}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Footer Info Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <ZoomIn size={14} color="#2563eb" />
          <span>Click any rule to highlight matching OCR bounding box evidence on label.</span>
        </div>
        <span style={{ fontWeight: 600 }}>{ocrDetails.length} OCR Text Blocks Detected</span>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
