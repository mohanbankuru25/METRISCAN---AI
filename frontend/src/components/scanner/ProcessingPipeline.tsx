import { useState, useEffect } from "react";
import { Package, CheckCircle2 } from "lucide-react";

export interface PipelineStep {
  stepNumber: string;
  title: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [];

interface ProcessingPipelineProps {
  currentStepIndex?: number;
  isComplete?: boolean;
  isCached?: boolean;
}

export function ProcessingPipeline({
  isComplete = false,
  isCached = false,
}: ProcessingPipelineProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isComplete || isCached) {
      setProgress(100);
      return;
    }

    // Smoothly advance progress with asymptotic decay while awaiting the actual backend API response.
    // Strictly capped at 92% and NEVER reaches 100% until isComplete is explicitly triggered by the API response.
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          return 92;
        }
        const remaining = 92 - prev;
        const increment = Math.max(0.04, remaining * 0.009);
        return Math.min(prev + increment, 92);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isComplete, isCached]);

  // Generic status text that NEVER falsely claims unverified backend stages like PaddleOCR or Compliance
  const getStatusText = (pct: number, complete: boolean, cached: boolean) => {
    if (cached) {
      return "Retrieving previous analysis...";
    }
    if (complete) {
      return "Analysis Complete";
    }
    if (pct >= 50) {
      return "Processing Product Information...";
    }
    return "Analyzing Product...";
  };

  const roundedPct = isComplete || isCached ? 100 : Math.round(progress);
  const statusMessage = getStatusText(roundedPct, isComplete, isCached);

  // SVG Circular ring calculations
  // Radius = 56, Circumference = 2 * PI * 56 ≈ 351.86
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  const isSuccess = isComplete || isCached;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflow: "hidden",
        borderRadius: "10px",
        pointerEvents: "none",
        animation: "overlayFadeIn 0.3s ease-out",
      }}
    >
      {/* Computer-Vision HUD Scanning Frame */}
      <div
        style={{
          position: "relative",
          width: "280px",
          height: "280px",
          maxWidth: "88%",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Glowing HUD Detection Corner Brackets */}
        {/* Top-Left */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "26px",
            height: "26px",
            borderTop: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderLeft: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderTopLeftRadius: "6px",
            filter: `drop-shadow(0 0 8px ${isSuccess ? "rgba(16, 185, 129, 0.8)" : "rgba(56, 189, 248, 0.8)"})`,
          }}
        />
        {/* Top-Right */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "26px",
            height: "26px",
            borderTop: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderRight: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderTopRightRadius: "6px",
            filter: `drop-shadow(0 0 8px ${isSuccess ? "rgba(16, 185, 129, 0.8)" : "rgba(56, 189, 248, 0.8)"})`,
          }}
        />
        {/* Bottom-Left */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "26px",
            height: "26px",
            borderBottom: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderLeft: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderBottomLeftRadius: "6px",
            filter: `drop-shadow(0 0 8px ${isSuccess ? "rgba(16, 185, 129, 0.8)" : "rgba(56, 189, 248, 0.8)"})`,
          }}
        />
        {/* Bottom-Right */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "26px",
            height: "26px",
            borderBottom: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderRight: `3px solid ${isSuccess ? "#10b981" : "#38bdf8"}`,
            borderBottomRightRadius: "6px",
            filter: `drop-shadow(0 0 8px ${isSuccess ? "rgba(16, 185, 129, 0.8)" : "rgba(56, 189, 248, 0.8)"})`,
          }}
        />

        {/* Small HUD Header Indicator */}
        <div
          style={{
            position: "absolute",
            top: "-18px",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            color: isSuccess ? "#34d399" : "#38bdf8",
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            fontFamily: "var(--font-mono), monospace",
            textTransform: "uppercase",
            textShadow: `0 0 6px ${isSuccess ? "rgba(16, 185, 129, 0.7)" : "rgba(56, 189, 248, 0.7)"}`,
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: isSuccess ? "#10b981" : "#38bdf8",
              boxShadow: `0 0 6px ${isSuccess ? "#10b981" : "#38bdf8"}`,
              animation: !isSuccess ? "dotBlink 1.2s infinite" : "none",
            }}
          />
          <span>{isCached ? "PRODUCT FOUND" : isComplete ? "ANALYSIS COMPLETE" : "AI SCAN // IN PROGRESS"}</span>
        </div>

        {/* Circular Progress & Product Icon Container */}
        <div
          style={{
            position: "relative",
            width: "140px",
            height: "140px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Subtle Outer Rotating Radar Ring */}
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            style={{
              position: "absolute",
              animation: "radarRotate 10s linear infinite",
            }}
          >
            <circle
              cx="70"
              cy="70"
              r="66"
              stroke="rgba(56, 189, 248, 0.28)"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              fill="none"
            />
          </svg>

          {/* SVG Radial Progress Arc */}
          <svg
            width="130"
            height="130"
            viewBox="0 0 130 130"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Background Track Circle */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke={isSuccess ? "#10b981" : "#38bdf8"}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: "stroke-dashoffset 0.25s ease-out, stroke 0.3s ease",
                filter: isSuccess
                  ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))"
                  : "drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))",
              }}
            />
          </svg>

          {/* Center Glass Card with Product Icon & Percentage */}
          <div
            style={{
              position: "absolute",
              width: "92px",
              height: "92px",
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.82)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1.5px solid ${isSuccess ? "rgba(16, 185, 129, 0.6)" : "rgba(56, 189, 248, 0.45)"}`,
              boxShadow: isSuccess
                ? "0 0 22px rgba(16, 185, 129, 0.35), inset 0 0 12px rgba(16, 185, 129, 0.2)"
                : "0 0 22px rgba(56, 189, 248, 0.3), inset 0 0 12px rgba(56, 189, 248, 0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              transition: "all 0.3s ease",
            }}
          >
            {/* Product Icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: !isSuccess ? "hudPulse 2s ease-in-out infinite" : "none",
              }}
            >
              {isSuccess ? (
                <CheckCircle2 size={26} color="#10b981" strokeWidth={2.4} />
              ) : (
                <Package size={26} color="#38bdf8" strokeWidth={2.2} />
              )}
            </div>

            {/* Percentage inside center */}
            <div
              style={{
                fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                fontSize: "1.18rem",
                fontWeight: 800,
                color: isSuccess ? "#10b981" : "#ffffff",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 6px rgba(0, 0, 0, 0.6)",
              }}
            >
              {roundedPct}%
            </div>
          </div>
        </div>

        {/* Status Pill Badge directly below the HUD element */}
        <div
          style={{
            marginTop: "1.1rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.38rem 1rem",
            borderRadius: "9999px",
            backgroundColor: "rgba(15, 23, 42, 0.86)",
            border: `1px solid ${isSuccess ? "rgba(16, 185, 129, 0.4)" : "rgba(56, 189, 248, 0.35)"}`,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            color: isSuccess ? "#34d399" : "#f1f5f9",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: isSuccess ? "#10b981" : "#38bdf8",
              boxShadow: `0 0 8px ${isSuccess ? "#10b981" : "#38bdf8"}`,
              animation: !isSuccess ? "dotBlink 1.2s infinite" : "none",
            }}
          />
          <span>{statusMessage}</span>
        </div>
      </div>

      <style>{`
        @keyframes radarRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hudPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(56, 189, 248, 0)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.6)); }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export const ProductAnalysisProgress = ProcessingPipeline;


