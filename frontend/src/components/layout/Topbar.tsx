import { useLocation } from "react-router-dom";
import { Shield, UserCheck, Scale } from "lucide-react";

export function Topbar() {
  const location = useLocation();

  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return "Compliance Dashboard";
    if (path.startsWith("/scanner")) return "Product Compliance Scanner";
    if (path.startsWith("/scan-result")) return "Scan Compliance Report";
    if (path.startsWith("/history/")) return "Historical Scan Detail";
    if (path.startsWith("/history")) return "Inspection History";
    if (path.startsWith("/settings")) return "Settings & Regulatory Rules";
    return "Legal Metrology Portal";
  };

  return (
    <header className="app-topbar">
      {/* Title & Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ padding: "0.4rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#1e293b", display: "flex", alignItems: "center" }}>
          <Scale size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
            {getPageTitle(location.pathname)}
          </h2>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
            Legal Metrology (Packaged Commodities) Rules, 2011 Inspection Portal
          </div>
        </div>
      </div>

      {/* Profile & Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Verification Chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.3rem 0.65rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "9999px",
            fontSize: "0.725rem",
            fontWeight: 600,
            color: "#166534"
          }}
        >
          <Shield size={13} />
          <span>AI + OCR Pipeline Active</span>
        </div>

        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "0.5rem", borderLeft: "1px solid #e2e8f0" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#1e293b",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <UserCheck size={16} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>Compliance Officer</span>
            <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Government Inspector</span>
          </div>
        </div>
      </div>
    </header>
  );
}
