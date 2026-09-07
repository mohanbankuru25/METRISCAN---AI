import { PageContainer } from "../components/layout/PageContainer";
import { Settings as SettingsIcon, BookOpen, Server } from "lucide-react";

export function Settings() {
  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <SettingsIcon size={24} color="#2563eb" />
            <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a" }}>System Settings & Regulatory Rules</h1>
          </div>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
            Legal Metrology (Packaged Commodities) Rules, 2011 compliance configuration and engine metadata.
          </p>
        </div>

        {/* Regulatory Summary */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <BookOpen size={18} color="#2563eb" />
              <span>Legal Metrology (Packaged Commodities) Rules, 2011 — Mandatory Rule 6 Declarations</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.875rem" }}>Rule 6(1)(a) — Generic Name</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem" }}>
                Name or generic description of the commodity must be clearly declared on the principal display panel.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.875rem" }}>Rule 6(1)(b) — Net Quantity</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem" }}>
                Net weight or volume in standard units (g, kg, ml, l, or number) per prescribed Schedule II standards.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.875rem" }}>Rule 6(1)(c) — Retail Price (MRP)</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem" }}>
                Maximum Retail Price in Indian Rupees inclusive of all taxes in format `MRP ₹xx.xx (incl. of all taxes)`.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.875rem" }}>Rule 6(1)(d) — Packaging Date</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem" }}>
                Month and year of manufacture, packing, or import clearly stated.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.875rem" }}>Rule 6(1)(e) — Manufacturer Info</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem" }}>
                Name and complete address of the manufacturer, packer, or importer.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.875rem" }}>Rule 6(1)(f) — Consumer Care</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem" }}>
                Name, address, telephone helpline number, and email ID for consumer complaints.
              </p>
            </div>
          </div>
        </div>

        {/* System & API Info */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Server size={18} color="#2563eb" />
              <span>Backend & AI Engine Configurations</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              <span style={{ color: "#64748b" }}>Backend Endpoint:</span>
              <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>http://127.0.0.1:8000/api/ocr/</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              <span style={{ color: "#64748b" }}>OCR Engine:</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>PaddleOCR (PP-OCRv4)</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              <span style={{ color: "#64748b" }}>Vision AI Model:</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>Gemini Vision AI (with automatic fallback)</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              <span style={{ color: "#64748b" }}>Compliance Rules Engine:</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>Legal Metrology Compliance Engine v1.0</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>UI Frontend:</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>React 19 + TypeScript + Vite</span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
