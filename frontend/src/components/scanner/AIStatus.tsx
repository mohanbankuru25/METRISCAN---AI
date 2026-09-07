import { CheckCircle2, AlertTriangle, Cpu, Sparkles } from "lucide-react";

interface AIStatusProps {
  paddleCompleted: boolean;
  geminiError: string | null | undefined;
  recoveredFieldsCount?: number;
}

export function AIStatus({ paddleCompleted, geminiError, recoveredFieldsCount = 0 }: AIStatusProps) {
  const geminiAvailable = !geminiError;

  return (
    <div className="panel-card" style={{ marginBottom: "1.25rem" }}>
      <div className="panel-card-header" style={{ marginBottom: "0.75rem" }}>
        <div className="panel-card-title">
          <Cpu size={18} color="#2563eb" />
          <span>AI & OCR Extraction Engine Status</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
        {/* PaddleOCR Card */}
        <div style={{ padding: "0.85rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>
              <Cpu size={16} color="#2563eb" />
              <span>PaddleOCR</span>
            </div>
            {paddleCompleted ? (
              <span className="badge badge-pass" style={{ fontSize: "0.68rem" }}>Active</span>
            ) : (
              <span className="badge badge-review" style={{ fontSize: "0.68rem" }}>Pending</span>
            )}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
            Deep learning text detection & recognition bounding boxes.
          </p>
        </div>

        {/* Gemini Vision Card */}
        <div style={{ padding: "0.85rem", backgroundColor: geminiAvailable ? "#f8fafc" : "#fffbeb", border: `1px solid ${geminiAvailable ? "#e2e8f0" : "#fde68a"}`, borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>
              <Sparkles size={16} color={geminiAvailable ? "#7c3aed" : "#d97706"} />
              <span>Gemini Vision AI</span>
            </div>
            {geminiAvailable ? (
              <span className="badge badge-pass" style={{ fontSize: "0.68rem" }}>Active</span>
            ) : (
              <span className="badge badge-review" style={{ fontSize: "0.68rem" }}>Fallback Used</span>
            )}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
            {geminiAvailable ? "Multimodal visual layout & field classification." : "Quota exceeded/Unavailable. OCR fallback activated."}
          </p>
        </div>

        {/* OCR Field Recovery Card */}
        <div style={{ padding: "0.85rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: "0.875rem", color: "#065f46" }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>OCR Field Recovery</span>
            </div>
            <span className="badge badge-pass" style={{ fontSize: "0.68rem" }}>{recoveredFieldsCount} Recovered</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#047857", margin: 0 }}>
            Fills missing fields directly from verified raw OCR streams.
          </p>
        </div>
      </div>

      {geminiError && (
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.65rem 0.85rem",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            fontSize: "0.775rem",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <AlertTriangle size={15} color="#d97706" />
          <span>
            <strong>Gemini Vision Fallback Notice:</strong> Gemini Vision service reported an API constraint. The system automatically continued complete legal evaluation using PaddleOCR and Field Recovery.
          </span>
        </div>
      )}
    </div>
  );
}
