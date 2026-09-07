import { ShieldCheck, Info } from "lucide-react";

interface ComplianceScoreProps {
  score: number | null | undefined;
  status: string;
}

export function ComplianceScore({ score, status }: ComplianceScoreProps) {
  const displayScore = typeof score === "number" ? Math.round(score * 10) / 10 : 0;
  const s = String(status).toUpperCase();

  const getScoreColor = () => {
    if (s === "PASS") return "#059669";
    if (s === "FAIL") return "#dc2626";
    return "#d97706";
  };

  const color = getScoreColor();

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}
    >
      <div style={{ fontSize: "0.725rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
        Evidence-Based Compliance Score
      </div>

      {/* Circle Gauge Graphic */}
      <div
        style={{
          position: "relative",
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          background: `conic-gradient(${color} ${displayScore * 3.6}deg, #e2e8f0 ${displayScore * 3.6}deg 360deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0.5rem 0"
        }}
      >
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span style={{ fontSize: "1.65rem", fontWeight: 800, color, lineHeight: 1 }}>
            {displayScore}%
          </span>
          <ShieldCheck size={14} color={color} style={{ marginTop: "2px" }} />
        </div>
      </div>

      <div style={{ marginTop: "0.5rem", fontSize: "0.725rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem", maxWidth: "260px" }}>
        <Info size={12} style={{ flexShrink: 0 }} />
        <span>Reflects automated checks. Not Applicable and Out of Scope rules are excluded from score calculation.</span>
      </div>
    </div>
  );
}
