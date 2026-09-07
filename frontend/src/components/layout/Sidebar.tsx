import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Settings,
  ShieldCheck,
  Server,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { checkBackendHealth } from "../../services/api";

export function Sidebar() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const verifyHealth = async () => {
      const health = await checkBackendHealth();
      if (isMounted) {
        setBackendOnline(health.online);
      }
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/scanner", label: "Scanner", icon: ScanLine },
    { to: "/history", label: "History", icon: History },
    { to: "/settings", label: "Settings & Rules", icon: Settings },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 4px rgba(37,99,235,0.4)"
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#ffffff", letterSpacing: "-0.01em" }}>
              SIH-G
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Legal Metrology System
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ padding: "0 0.5rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isActive ? "#1e293b" : "transparent",
                borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                transition: "all 0.15s ease-in-out",
                textDecoration: "none"
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div style={{ padding: "1rem", borderTop: "1px solid #1e293b", backgroundColor: "#0b1329" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          System Engine Status
        </div>
        
        {/* Backend Connection Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.65rem",
            backgroundColor: "#0f172a",
            borderRadius: "6px",
            border: "1px solid #1e293b",
            fontSize: "0.75rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#cbd5e1" }}>
            <Server size={13} />
            <span>FastAPI Backend</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            {backendOnline === null ? (
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Connecting...</span>
            ) : backendOnline ? (
              <>
                <CheckCircle2 size={13} color="#10b981" />
                <span style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 600 }}>Connected</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} color="#ef4444" />
                <span style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 600 }}>Offline</span>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", color: "#64748b" }}>
          <Info size={11} />
          <span>Rules 2011 Compliance Engine v1.0</span>
        </div>
      </div>
    </aside>
  );
}
