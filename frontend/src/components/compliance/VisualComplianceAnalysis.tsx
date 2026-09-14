import {
  Eye,
  Ruler,
  MapPin,
  Contrast,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

interface VisualComplianceAnalysisProps {
  visualAnalysis?: any;
  analysis?: any;
}

export function VisualComplianceAnalysis({
  visualAnalysis,
  analysis,
}: VisualComplianceAnalysisProps) {
  const data = visualAnalysis || analysis;
  if (!data) {
    return null;
  }

  const textSize = data.text_size || {};
  const placement = data.placement || {};
  const readability = data.readability || {};
  const visibility = data.declaration_visibility || {};
  const image = data.image || {};

  const getValue = (
    value: any,
    fallback = "Not available"
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    if (typeof value === "number") {
      return Number.isInteger(value)
        ? value.toString()
        : value.toFixed(2);
    }

    return String(value);
  };

  const getPercent = (value: any) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "Not available";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return `${(number * 100).toFixed(1)}%`;
  };

  return (
    <div
      className="panel-card"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Eye
              size={21}
              color="#2563eb"
            />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.15rem",
                color: "#0f172a",
              }}
            >
              Visual Compliance Analysis
            </h2>

            <p
              style={{
                margin: "0.2rem 0 0",
                fontSize: "0.85rem",
                color: "#64748b",
              }}
            >
              Image-based evidence for Legal
              Metrology Rules 7, 8 and 9
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "0.4rem 0.7rem",
            borderRadius: "999px",
            backgroundColor: image.calibrated
              ? "#dcfce7"
              : "#fef3c7",
            color: image.calibrated
              ? "#166534"
              : "#92400e",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          {image.calibrated
            ? "CALIBRATED IMAGE"
            : "IMAGE-BASED EVIDENCE"}
        </div>
      </div>

      {/* EVIDENCE CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* TEXT SIZE */}
        <div
          style={{
            padding: "1rem",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <Ruler
              size={18}
              color="#2563eb"
            />

            <strong style={{ color: "#0f172a" }}>
              Text Size
            </strong>
          </div>

          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {getValue(
              textSize.median_height
            )}
          </div>

          <div
            style={{
              fontSize: "0.78rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Median OCR text height
          </div>

          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.8rem",
              color: "#475569",
            }}
          >
            Minimum:{" "}
            {getValue(textSize.min_height)}

            <br />

            Maximum:{" "}
            {getValue(textSize.max_height)}
          </div>
        </div>

        {/* PLACEMENT */}
        <div
          style={{
            padding: "1rem",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <MapPin
              size={18}
              color="#2563eb"
            />

            <strong style={{ color: "#0f172a" }}>
              Placement
            </strong>
          </div>

          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {getValue(
              placement.text_blocks
            )}
          </div>

          <div
            style={{
              fontSize: "0.78rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            OCR text blocks detected
          </div>

          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.8rem",
              color: "#475569",
            }}
          >
            Bounding boxes:{" "}
            {getValue(
              placement.bbox_count
            )}
          </div>
        </div>

        {/* READABILITY */}
        <div
          style={{
            padding: "1rem",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <Contrast
              size={18}
              color="#2563eb"
            />

            <strong style={{ color: "#0f172a" }}>
              Readability
            </strong>
          </div>

          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {getValue(
              readability.local_contrast
            )}
          </div>

          <div
            style={{
              fontSize: "0.78rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Local contrast evidence
          </div>

          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.8rem",
              color: "#475569",
            }}
          >
            OCR confidence:{" "}
            {getPercent(
              readability.mean_ocr_confidence
            )}
          </div>
        </div>

        {/* DECLARATION VISIBILITY */}
        <div
          style={{
            padding: "1rem",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <FileCheck2
              size={18}
              color="#2563eb"
            />

            <strong style={{ color: "#0f172a" }}>
              Declaration Visibility
            </strong>
          </div>

          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {getValue(
              visibility.detected_declarations
            )}
          </div>

          <div
            style={{
              fontSize: "0.78rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Declaration groups detected
          </div>

          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.8rem",
              color: "#475569",
            }}
          >
            OCR blocks:{" "}
            {getValue(
              visibility.ocr_bbox_count
            )}
          </div>
        </div>
      </div>

      {/* IMPORTANT LEGAL LIMITATION */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.85rem 1rem",
          borderRadius: "8px",
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.6rem",
        }}
      >
        <AlertTriangle
          size={18}
          color="#d97706"
          style={{
            flexShrink: 0,
            marginTop: "2px",
          }}
        />

        <div
          style={{
            fontSize: "0.8rem",
            lineHeight: 1.5,
            color: "#92400e",
          }}
        >
          <strong>
            Evidence limitation:
          </strong>{" "}
          Image analysis provides OCR geometry,
          relative text size, placement and
          readability evidence. Exact physical
          font height cannot be established
          without image calibration or a known
          scale.
        </div>
      </div>
    </div>
  );
}