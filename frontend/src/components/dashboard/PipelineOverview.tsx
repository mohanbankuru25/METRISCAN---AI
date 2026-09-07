import { Cpu, CheckCircle2 } from "lucide-react";

export function PipelineOverview() {
  const stages = [
    { name: "Image Capture", desc: "OpenCV preprocessing" },
    { name: "PaddleOCR", desc: "Text & bounding boxes" },
    { name: "Vision AI", desc: "Gemini layout analysis" },
    { name: "Fusion Engine", desc: "Multi-source merge" },
    { name: "Field Recovery", desc: "OCR text recovery" },
    { name: "Applicability", desc: "Rule applicability" },
    { name: "Compliance Engine", desc: "Legal Metrology Rules 2011" },
  ];

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <Cpu size={18} color="#2563eb" />
          <span>System Pipeline Overview</span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, backgroundColor: "#ecfdf5", padding: "0.2rem 0.5rem", borderRadius: "9999px", border: "1px solid #a7f3d0" }}>
          Engine Ready
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem" }}>
        {stages.map((stage, idx) => (
          <div
            key={stage.name}
            style={{
              padding: "0.65rem",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b" }}>0{idx + 1}</span>
              <CheckCircle2 size={12} color="#059669" />
            </div>
            <div style={{ fontSize: "0.775rem", fontWeight: 700, color: "#0f172a" }}>{stage.name}</div>
            <div style={{ fontSize: "0.675rem", color: "#64748b" }}>{stage.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
