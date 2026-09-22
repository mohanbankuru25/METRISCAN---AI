import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { authService } from "../services/authService";
import type { UserProfile } from "../types/platform";
import {
  Settings as SettingsIcon,
  BookOpen,
  Server,
  UserCheck,
  Database,
  CheckCircle,
} from "lucide-react";

export function Settings() {
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);

  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    async function loadMe() {
      const me = await authService.getCurrentUser();
      if (me) setUser(me);
    }
    loadMe();
  }, []);

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <SettingsIcon size={24} color="#1e3a8a" />
            <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
              System Configuration &amp; Officer Dossier
            </h1>
          </div>
          <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Legal Metrology (Packaged Commodities) Rules, 2011 compliance configuration, officer credentials, and engine metadata.
          </p>
        </div>

        {/* Officer Profile Card */}
        {user && (
          <div className="panel-card" style={{ padding: "1.5rem" }}>
            <div className="panel-card-header" style={{ marginBottom: "1rem" }}>
              <div className="panel-card-title">
                <UserCheck size={18} color="#1e3a8a" />
                <span>Authenticated Officer Profile Dossier</span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px",
                  backgroundColor: user.is_active ? "#ecfdf5" : "#fef2f2",
                  color: user.is_active ? "#047857" : "#b91c1c",
                  border: `1px solid ${user.is_active ? "#a7f3d0" : "#fecaca"}`
                }}
              >
                <CheckCircle size={12} /> {user.is_active ? "ACTIVE OFFICER" : "DEACTIVATED"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Full Name</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
                  {user.full_name || "Official"}
                </div>
              </div>

              <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Legal Metrology Inspector Username</div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1e3a8a", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
                  {user.username}
                </div>
              </div>

              <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Role / Authorization</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#047857", marginTop: "0.25rem" }}>
                  {(user.role || "").toUpperCase() === "ADMIN" ? "National Platform Administrator" : "Legal Metrology Field Inspector"}
                </div>
              </div>

              <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Department</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#334155", marginTop: "0.25rem" }}>
                  {user.department || "Legal Metrology Enforcement"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regulatory Summary */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div className="panel-card-header" style={{ marginBottom: "1rem" }}>
            <div className="panel-card-title">
              <BookOpen size={18} color="#1e3a8a" />
              <span>Legal Metrology (Packaged Commodities) Rules, 2011 — Mandatory Rule 6 Declarations</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Rule 6(1)(a) — Generic Name</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem", lineHeight: 1.5 }}>
                Name or generic description of the commodity must be clearly declared on the principal display panel.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Rule 6(1)(b) — Net Quantity</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem", lineHeight: 1.5 }}>
                Net weight or volume in standard units (g, kg, ml, l, or number) per prescribed Schedule II standards.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Rule 6(1)(c) — Retail Price (MRP)</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem", lineHeight: 1.5 }}>
                Maximum Retail Price in Indian Rupees inclusive of all taxes in format `MRP ₹xx.xx (incl. of all taxes)`.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Rule 6(1)(d) — Packaging Date</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem", lineHeight: 1.5 }}>
                Month and year of manufacture, packing, or import clearly stated.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Rule 6(1)(e) — Manufacturer Info</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem", lineHeight: 1.5 }}>
                Name and complete address of the manufacturer, packer, or importer.
              </p>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Rule 6(1)(f) — Consumer Care</div>
              <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.25rem", lineHeight: 1.5 }}>
                Name, address, telephone helpline number, and email ID for consumer complaints.
              </p>
            </div>
          </div>
        </div>

        {/* System & Architecture Info (Admin Central Oversight Only) */}
        {isAdmin && (
          <div className="panel-card" style={{ padding: "1.5rem" }}>
            <div className="panel-card-header" style={{ marginBottom: "1rem" }}>
              <div className="panel-card-title">
                <Server size={18} color="#1e3a8a" />
                <span>Backend &amp; Statutory Engine Architecture</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#15803d", fontWeight: 700 }}>
                <Database size={14} />
                <span>Supabase Cloud PostgreSQL Active</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>Primary Database:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>Supabase PostgreSQL (Single Source of Truth)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>Evidence Storage Buckets:</span>
                <span style={{ fontWeight: 700, color: "#1e3a8a", fontFamily: "var(--font-mono)" }}>inspection-images / inspection-reports</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>OCR Recognition Engine:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>PaddleOCR (PP-OCRv4 Multi-language Model)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>Vision AI Model:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>Gemini Vision AI (with dynamic heuristic fallback)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>Statutory Rules Engine:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>Dynamic Rule Engine (Configured in Supabase)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Audit Integrity:</span>
                <span style={{ fontWeight: 700, color: "#15803d" }}>Tamper-Evident Immutable Audit Log</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
