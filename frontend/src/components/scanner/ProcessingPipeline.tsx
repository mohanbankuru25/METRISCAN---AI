import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface PipelineStep {
  stepNumber: string;
  title: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { stepNumber: "01", title: "Image Capture & Validation", description: "Package image received and validated" },
  { stepNumber: "02", title: "Image Preprocessing", description: "OpenCV contrast & resolution enhancement" },
  { stepNumber: "03", title: "PaddleOCR Extraction", description: "Detecting bounding boxes and text blocks" },
  { stepNumber: "04", title: "Gemini Vision Analysis", description: "Understanding multi-panel package layout" },
  { stepNumber: "05", title: "Extraction Fusion", description: "Merging OCR and Vision AI product declarations" },
  { stepNumber: "06", title: "OCR Field Recovery", description: "Recovering missing values from raw OCR streams" },
  { stepNumber: "07", title: "Product Classification", description: "Categorizing commodity type and schedule" },
  { stepNumber: "08", title: "Applicability Analysis", description: "Determining applicable Legal Metrology rules" },
  { stepNumber: "09", title: "Legal Metrology Rules Evaluation", description: "Evaluating declarations against Rules, 2011" },
  { stepNumber: "10", title: "Compliance Score & Report Result", description: "Synthesizing evidence and generating score" },
];

interface ProcessingPipelineProps {
  currentStepIndex: number;
  isComplete: boolean;
}

export function ProcessingPipeline({ currentStepIndex, isComplete }: ProcessingPipelineProps) {
  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <Loader2 size={18} className={!isComplete ? "spin" : ""} color="#2563eb" />
          <span>AI & Legal Metrology Processing Pipeline</span>
        </div>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isComplete ? "#059669" : "#2563eb" }}>
          {isComplete ? "Analysis Complete (10/10)" : `Step ${currentStepIndex + 1} of 10`}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = isComplete || idx < currentStepIndex;
          const isActive = !isComplete && idx === currentStepIndex;

          return (
            <div
              key={step.stepNumber}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                backgroundColor: isActive ? "#eff6ff" : isDone ? "#f8fafc" : "#ffffff",
                border: `1px solid ${isActive ? "#bfdbfe" : isDone ? "#e2e8f0" : "#f1f5f9"}`,
                transition: "all 0.15s ease-in-out"
              }}
            >
              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isDone ? (
                  <CheckCircle2 size={18} color="#059669" />
                ) : isActive ? (
                  <Loader2 size={18} color="#2563eb" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Circle size={18} color="#cbd5e1" />
                )}
              </div>

              {/* Number */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: isDone ? "#059669" : isActive ? "#2563eb" : "#94a3b8"
                }}
              >
                {step.stepNumber}
              </span>

              {/* Title & Desc */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: isDone || isActive ? 700 : 500,
                    color: isDone ? "#0f172a" : isActive ? "#1e40af" : "#64748b"
                  }}
                >
                  {step.title}
                </div>
                <div style={{ fontSize: "0.725rem", color: isDone ? "#64748b" : isActive ? "#3b82f6" : "#94a3b8" }}>
                  {step.description}
                </div>
              </div>

              {/* Badge */}
              <div>
                {isDone && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>Complete</span>}
                {isActive && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#2563eb", backgroundColor: "#eff6ff", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>Processing...</span>}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
