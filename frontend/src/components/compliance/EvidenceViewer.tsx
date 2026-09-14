import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Layers,
  Minus,
  Plus,
  AlertCircle,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import type { OCRDetail } from "../../types/ocr";
import type { ComplianceRuleResult } from "../../types/compliance";

// =========================================================
// TYPES
// =========================================================

export interface EvidenceViewerProps {
  imageUrl: string;
  fallbackUrl?: string;
  ocrDetails?: (OCRDetail | any)[];
  selectedRule?: ComplianceRuleResult | any | null;
}

interface ParsedBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface BoxEntry {
  id: number;
  item: any;
  box: ParsedBoundingBox;
  text: string;
  confidence: number | null;
}

interface HoveredBoxState {
  id: number;
  text: string;
  confidence: number | null;
  canvasX: number;
  canvasY: number;
  canvasWidth: number;
  canvasHeight: number;
}

const BACKEND_URL = "http://127.0.0.1:8000";

// =========================================================
// IMAGE URL NORMALIZER
// =========================================================

function normalizeImageUrl(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Already an absolute URL, data URI, or blob
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Convert Windows backslashes to forward slashes
  let normalized = trimmed.replace(/\\/g, "/");

  // Remove leading slashes
  normalized = normalized.replace(/^\/+/, "");

  // Encode path components safely while keeping forward slashes
  const encodedPath = normalized
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${BACKEND_URL}/${encodedPath}`;
}

// =========================================================
// BOUNDING BOX EXTRACTOR
// =========================================================

function getBoundingBox(item: any): ParsedBoundingBox | null {
  if (!item) return null;

  const box =
    item.bbox ||
    item.bounding_box ||
    item.boundingBox ||
    item.box ||
    item.coordinates;

  if (!box) return null;

  // Format: [x1, y1, x2, y2]
  if (
    Array.isArray(box) &&
    box.length >= 4 &&
    typeof box[0] === "number" &&
    typeof box[1] === "number"
  ) {
    const x1 = Number(box[0]);
    const y1 = Number(box[1]);
    const x2 = Number(box[2]);
    const y2 = Number(box[3]);
    return {
      x1: Math.min(x1, x2),
      y1: Math.min(y1, y2),
      x2: Math.max(x1, x2),
      y2: Math.max(y1, y2),
    };
  }

  // Format: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] (PaddleOCR polygon/points)
  if (Array.isArray(box) && Array.isArray(box[0])) {
    const xs = box.map((p: any) => Number(p[0])).filter((n) => !isNaN(n));
    const ys = box.map((p: any) => Number(p[1])).filter((n) => !isNaN(n));

    if (xs.length > 0 && ys.length > 0) {
      return {
        x1: Math.min(...xs),
        y1: Math.min(...ys),
        x2: Math.max(...xs),
        y2: Math.max(...ys),
      };
    }
  }

  // Format: { x, y, width, height }
  if (
    typeof box === "object" &&
    box !== null &&
    typeof box.x === "number" &&
    typeof box.y === "number"
  ) {
    const width = Number(box.width || 0);
    const height = Number(box.height || 0);
    return {
      x1: Number(box.x),
      y1: Number(box.y),
      x2: Number(box.x) + width,
      y2: Number(box.y) + height,
    };
  }

  // Format: { x1, y1, x2, y2 }
  if (
    typeof box === "object" &&
    box !== null &&
    typeof box.x1 === "number" &&
    typeof box.y1 === "number" &&
    typeof box.x2 === "number" &&
    typeof box.y2 === "number"
  ) {
    return {
      x1: Math.min(Number(box.x1), Number(box.x2)),
      y1: Math.min(Number(box.y1), Number(box.y2)),
      x2: Math.max(Number(box.x1), Number(box.x2)),
      y2: Math.max(Number(box.y1), Number(box.y2)),
    };
  }

  return null;
}

function getOCRText(item: any): string {
  if (!item) return "";
  return String(
    item.text ??
    item.content ??
    item.value ??
    item.label ??
    ""
  ).trim();
}

function getOCRConfidence(item: any): number | null {
  if (!item) return null;
  const conf = item.confidence ?? item.score ?? item.conf;
  if (typeof conf === "number" && !isNaN(conf)) {
    return conf;
  }
  return null;
}

// Check if a box matches the selected compliance rule
function isBoxMatchedByRule(entry: BoxEntry, selectedRule: any): boolean {
  if (!selectedRule) return false;

  const entryText = entry.text.toLowerCase().trim();
  if (!entryText) return false;

  // 1. Check evidence array
  const evidenceList = Array.isArray(selectedRule.evidence) ? selectedRule.evidence : [];
  for (const ev of evidenceList) {
    if (typeof ev === "string") {
      const evStr = ev.toLowerCase().trim();
      if (evStr && (entryText.includes(evStr) || evStr.includes(entryText))) {
        return true;
      }
    } else if (ev && typeof ev === "object") {
      if (ev.text) {
        const evText = String(ev.text).toLowerCase().trim();
        if (evText && (entryText.includes(evText) || evText.includes(entryText))) {
          return true;
        }
      }
      if (Array.isArray(ev.bbox) && ev.bbox.length >= 4) {
        const [bx1, by1, bx2, by2] = ev.bbox;
        if (
          Math.abs(entry.box.x1 - bx1) < 20 &&
          Math.abs(entry.box.y1 - by1) < 20 &&
          Math.abs(entry.box.x2 - bx2) < 20 &&
          Math.abs(entry.box.y2 - by2) < 20
        ) {
          return true;
        }
      }
    }
  }

  // 2. Check extracted value
  const extracted = selectedRule.extracted ?? selectedRule.extracted_value;
  if (extracted) {
    if (typeof extracted === "string") {
      const extStr = extracted.toLowerCase().trim();
      if (extStr && extStr.length > 1 && (entryText.includes(extStr) || extStr.includes(entryText))) {
        return true;
      }
    } else if (typeof extracted === "object") {
      for (const val of Object.values(extracted)) {
        if (val && typeof val === "string") {
          const valStr = val.toLowerCase().trim();
          if (valStr && valStr.length > 1 && (entryText.includes(valStr) || valStr.includes(entryText))) {
            return true;
          }
        }
      }
    }
  }

  // 3. Check rule ID or name match in text
  const ruleId = String(selectedRule.rule_id || selectedRule.rule_number || "").toLowerCase().trim();
  if (ruleId && entryText.includes(ruleId)) {
    return true;
  }

  return false;
}

// =========================================================
// COMPONENT
// =========================================================

export function EvidenceViewer({
  imageUrl,
  fallbackUrl,
  ocrDetails = [],
  selectedRule = null,
}: EvidenceViewerProps) {
  // Zoom level: 1 = 100% (Fit), 1.25 = 125%, 0.75 = 75%, etc.
  const [zoom, setZoom] = useState<number>(1);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  const [hoveredBox, setHoveredBox] = useState<HoveredBoxState | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Track container dimensions to calculate Fit scale accurately
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Primary and fallback URLs
  const primaryImageUrl = useMemo(() => normalizeImageUrl(imageUrl), [imageUrl]);
  const normalizedFallbackUrl = useMemo(() => normalizeImageUrl(fallbackUrl), [fallbackUrl]);

  const currentImageUrl = usingFallback && normalizedFallbackUrl
    ? normalizedFallbackUrl
    : primaryImageUrl;

  // Reset states when image changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setUsingFallback(false);
    setNaturalWidth(0);
    setNaturalHeight(0);
    setHoveredBox(null);
    setZoom(1); // Default to Fit
  }, [primaryImageUrl, normalizedFallbackUrl]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    if (!usingFallback && normalizedFallbackUrl && normalizedFallbackUrl !== primaryImageUrl) {
      setUsingFallback(true);
      setImageLoading(true);
      setImageError(false);
      return;
    }
    setImageLoading(false);
    setImageError(true);
  };

  // Parse all OCR boxes
  const boxes: BoxEntry[] = useMemo(() => {
    if (!Array.isArray(ocrDetails)) return [];
    return ocrDetails
      .map((item: any, index: number) => {
        const box = getBoundingBox(item);
        if (!box) return null;
        return {
          id: index,
          item,
          box,
          text: getOCRText(item),
          confidence: getOCRConfidence(item),
        };
      })
      .filter((entry): entry is BoxEntry => entry !== null);
  }, [ocrDetails]);

  // Fit scale calculation: fits complete original image inside container without cropping
  const fitScale = useMemo(() => {
    if (!naturalWidth || !naturalHeight) return 1;
    const padding = 20; // safe interior padding
    const availW = Math.max(100, (containerSize.width || 600) - padding);
    const availH = Math.max(100, (containerSize.height || 540) - padding);
    return Math.min(availW / naturalWidth, availH / naturalHeight);
  }, [naturalWidth, naturalHeight, containerSize]);

  // Rendered dimensions for the ImageCanvas at the current zoom level
  const renderedWidth = Math.round(naturalWidth * fitScale * zoom);
  const renderedHeight = Math.round(naturalHeight * fitScale * zoom);

  // Zoom controls
  const zoomIn = () => {
    setZoom((curr) => Math.min(3.0, Number((curr + 0.25).toFixed(2))));
  };

  const zoomOut = () => {
    setZoom((curr) => Math.max(0.5, Number((curr - 0.25).toFixed(2))));
  };

  const fitImage = () => {
    setZoom(1);
    setHoveredBox(null);
  };

  // Hover handlers for bounding boxes
  const handleBoxMouseEnter = (entry: BoxEntry) => {
    if (!naturalWidth || !naturalHeight) return;
    const { x1, y1, x2, y2 } = entry.box;
    const canvasX = (x1 / naturalWidth) * renderedWidth;
    const canvasY = (y1 / naturalHeight) * renderedHeight;
    const canvasWidth = ((x2 - x1) / naturalWidth) * renderedWidth;
    const canvasHeight = ((y2 - y1) / naturalHeight) * renderedHeight;

    setHoveredBox({
      id: entry.id,
      text: entry.text,
      confidence: entry.confidence,
      canvasX,
      canvasY,
      canvasWidth,
      canvasHeight,
    });
  };

  const handleBoxMouseLeave = () => {
    setHoveredBox(null);
  };

  return (
    <div
      className="panel-card"
      style={{
        backgroundColor: "#ffffff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ===================================================
          HEADER CONTROLS BAR
      =================================================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.85rem 1.25rem",
          borderBottom: "1px solid #e2e8f0",
          flexWrap: "wrap",
        }}
      >
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Eye size={18} color="#2563eb" />
          <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>
            Product Package OCR & Bounding Box Evidence
          </strong>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Zoom Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#f8fafc",
            }}
          >
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              title="Zoom out"
              style={{
                border: "none",
                background: "transparent",
                padding: "0.4rem 0.6rem",
                cursor: zoom <= 0.5 ? "not-allowed" : "pointer",
                color: zoom <= 0.5 ? "#94a3b8" : "#0f172a",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Minus size={14} />
            </button>

            <button
              type="button"
              onClick={fitImage}
              title="Click to reset to Fit view"
              style={{
                border: "none",
                background: "transparent",
                padding: "0.4rem 0.5rem",
                cursor: "pointer",
                minWidth: "55px",
                color: "#334155",
                fontSize: "0.775rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 3.0}
              title="Zoom in"
              style={{
                border: "none",
                background: "transparent",
                padding: "0.4rem 0.6rem",
                cursor: zoom >= 3.0 ? "not-allowed" : "pointer",
                color: zoom >= 3.0 ? "#94a3b8" : "#0f172a",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Fit Button */}
          <button
            type="button"
            onClick={fitImage}
            className="btn btn-secondary btn-sm"
            title="Fit complete image into viewer"
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.65rem" }}
          >
            <Maximize2 size={14} />
            <span>Fit</span>
          </button>

          {/* Show / Hide Boxes Toggle */}
          <button
            type="button"
            onClick={() => setShowBoxes((curr) => !curr)}
            className="btn btn-secondary btn-sm"
            title={showBoxes ? "Hide all OCR bounding boxes" : "Show all OCR bounding boxes"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.65rem",
              backgroundColor: showBoxes ? "#eff6ff" : "#ffffff",
              borderColor: showBoxes ? "#93c5fd" : "#cbd5e1",
              color: showBoxes ? "#1d4ed8" : "#334155",
            }}
          >
            <Layers size={14} />
            <span>{showBoxes ? "Hide Boxes" : "Show Boxes"}</span>
          </button>
        </div>
      </div>

      {/* ===================================================
          VIEWER SCROLL CONTAINER
      =================================================== */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          margin: "0.75rem 1rem 0",
          height: "560px",
          backgroundColor: "#0b1329",
          borderRadius: "8px",
          overflow: "auto",
          display: "flex",
          justifyContent: renderedWidth > 0 && renderedWidth < containerSize.width ? "center" : "flex-start",
          alignItems: renderedHeight > 0 && renderedHeight < containerSize.height ? "center" : "flex-start",
        }}
      >
        {/* No Image State */}
        {!currentImageUrl && (
          <div
            style={{
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            <AlertCircle size={36} color="#64748b" />
            <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
              No evidence image is currently available.
            </div>
          </div>
        )}

        {/* Loading Spinner Overlay */}
        {currentImageUrl && imageLoading && !imageError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#cbd5e1",
              zIndex: 20,
              backgroundColor: "rgba(11, 19, 41, 0.75)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #334155",
                borderTopColor: "#38bdf8",
                borderRadius: "50%",
                animation: "evidenceViewerSpin 0.8s linear infinite",
              }}
            />
            <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              Loading OCR evidence image...
            </div>
          </div>
        )}

        {/* Image Loading Error Banner */}
        {imageError && (
          <div
            style={{
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fecaca",
              textAlign: "center",
              padding: "2rem",
              maxWidth: "500px",
            }}
          >
            <AlertCircle size={40} color="#f87171" />
            <strong style={{ marginTop: "0.75rem", fontSize: "1rem", color: "#fca5a5" }}>
              Unable to load OCR evidence image
            </strong>
            <p style={{ marginTop: "0.35rem", color: "#94a3b8", fontSize: "0.775rem" }}>
              The processed image could not be loaded from the backend storage.
            </p>
            <div
              style={{
                marginTop: "0.5rem",
                color: "#64748b",
                fontSize: "0.725rem",
                wordBreak: "break-all",
                backgroundColor: "#070d1e",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                fontFamily: "monospace",
              }}
            >
              {currentImageUrl}
            </div>
            <button
              type="button"
              onClick={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Scaled Image Canvas (Image + SVG overlay as one synchronized unit) */}
        {currentImageUrl && !imageError && (
          <div
            style={{
              width: renderedWidth > 0 ? `${renderedWidth}px` : "auto",
              height: renderedHeight > 0 ? `${renderedHeight}px` : "auto",
              position: "relative",
              flexShrink: 0,
              margin: "auto",
              transition: "width 0.15s ease-out, height 0.15s ease-out",
            }}
          >
            {/* The Image */}
            <img
              src={currentImageUrl}
              alt="Processed product package OCR evidence"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />

            {/* SVG OCR Bounding Boxes Overlay */}
            {showBoxes && !imageLoading && naturalWidth > 0 && naturalHeight > 0 && (
              <svg
                viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "visible",
                  pointerEvents: "none", // Root SVG ignores pointer events
                }}
              >
                {boxes.map((entry) => {
                  const { x1, y1, x2, y2 } = entry.box;
                  const width = Math.max(1, x2 - x1);
                  const height = Math.max(1, y2 - y1);

                  const isSelected = isBoxMatchedByRule(entry, selectedRule);
                  const isHovered = hoveredBox?.id === entry.id;

                  return (
                    <g
                      key={entry.id}
                      style={{ pointerEvents: "all", cursor: "pointer" }}
                      onMouseEnter={() => handleBoxMouseEnter(entry)}
                      onMouseLeave={handleBoxMouseLeave}
                    >
                      <rect
                        x={x1}
                        y={y1}
                        width={width}
                        height={height}
                        fill={
                          isSelected
                            ? "rgba(250, 204, 21, 0.32)"
                            : isHovered
                            ? "rgba(56, 189, 248, 0.28)"
                            : "rgba(56, 189, 248, 0.05)"
                        }
                        stroke={
                          isSelected
                            ? "#facc15"
                            : isHovered
                            ? "#38bdf8"
                            : "rgba(56, 189, 248, 0.7)"
                        }
                        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.2}
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Native tooltip fallback */}
                      <title>{`OCR Detected: ${entry.text}`}</title>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Custom Interactive Floating Tooltip */}
            {showBoxes && hoveredBox && (
              <div
                style={{
                  position: "absolute",
                  left: `${hoveredBox.canvasX + hoveredBox.canvasWidth / 2}px`,
                  top:
                    hoveredBox.canvasY < 60
                      ? `${hoveredBox.canvasY + hoveredBox.canvasHeight + 8}px`
                      : `${hoveredBox.canvasY - 8}px`,
                  transform:
                    hoveredBox.canvasY < 60
                      ? "translate(-50%, 0)"
                      : "translate(-50%, -100%)",
                  zIndex: 50,
                  pointerEvents: "none",
                  backgroundColor: "rgba(15, 23, 42, 0.96)",
                  border: "1px solid #38bdf8",
                  borderRadius: "6px",
                  padding: "0.35rem 0.65rem",
                  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.6)",
                  maxWidth: "280px",
                  minWidth: "120px",
                  textAlign: "center",
                  animation: "evidenceTooltipFadeIn 0.12s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    color: "#38bdf8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "0.15rem",
                  }}
                >
                  OCR Detected
                </div>
                <div
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "#ffffff",
                    wordBreak: "break-word",
                    lineHeight: 1.25,
                  }}
                >
                  {hoveredBox.text || "(empty)"}
                </div>
                {hoveredBox.confidence !== null && (
                  <div style={{ fontSize: "0.625rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                    {Math.round(hoveredBox.confidence * 100)}% confidence
                  </div>
                )}

                {/* Arrow pointer */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    ...(hoveredBox.canvasY < 60
                      ? {
                          top: "-5px",
                          borderBottom: "5px solid rgba(15, 23, 42, 0.96)",
                        }
                      : {
                          bottom: "-5px",
                          borderTop: "5px solid rgba(15, 23, 42, 0.96)",
                        }),
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          FOOTER STATUS BAR
      =================================================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.75rem 1.25rem",
          color: "#64748b",
          fontSize: "0.775rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Eye size={13} color="#2563eb" />
          <span>
            Hover over any bounding box to view detected OCR text. Click any rule in the evaluation list to highlight evidence.
          </span>
        </div>

        <strong>
          {boxes.length > 0
            ? `${boxes.length} OCR Text Blocks Detected`
            : Array.isArray(ocrDetails) && ocrDetails.length > 0
            ? `${ocrDetails.length} OCR Text Blocks Detected`
            : "No OCR text blocks"}
        </strong>
      </div>

      {/* Tooltip & Spinner CSS Animations */}
      <style>
        {`
          @keyframes evidenceViewerSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes evidenceTooltipFadeIn {
            from { opacity: 0; transform: translate(-50%, -90%); }
            to { opacity: 1; transform: translate(-50%, -100%); }
          }
        `}
      </style>
    </div>
  );
}