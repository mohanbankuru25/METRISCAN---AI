import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Settings,
  ShieldCheck,
  Server,
  CheckCircle2,
  AlertCircle,
  Users,
  BarChart3,
  FileText,
  BookOpen,
  Activity,
  LogOut,
  Building2,
  Shield,
  ShieldAlert,
  FileSpreadsheet,
  Layers,
  Bell
} from "lucide-react";
import { checkBackendHealth } from "../../services/api";
import { authService } from "../../services/authService";
import type { UserProfile } from "../../types/platform";
import { useLanguage } from "../../i18n/LanguageContext";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    let isMounted = true;
    const verifyHealth = async () => {
      const health = await checkBackendHealth();
      if (isMounted) {
        setBackendOnline(health.online);
      }
    };

    const loadUser = async () => {
      const profile = await authService.getCurrentUser();
      if (isMounted) {
        setUser(profile);
      }
    };

    verifyHealth();
    loadUser();
    const interval = setInterval(verifyHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    if (window.confirm(t("officer.logout", "Are you sure you want to end your active session and log out?"))) {
      await authService.logout();
      navigate("/login");
    }
  };

  const inspectorNavItems = [
    { to: "/inspector", label: t("officer.dashboard", "Dashboard"), icon: LayoutDashboard },
    { to: "/inspector/scan", label: t("officer.scanProduct", "Scan Product"), icon: ScanLine },
    { to: "/inspector/multi-scan", label: t("officer.multiScan", "Multi-Scan Products"), icon: Layers },
    { to: "/inspector/history", label: t("officer.inspectionHistory", "Inspection History"), icon: History },
    { to: "/inspector/reports", label: t("officer.reportsDossiers", "Reports & Dossiers"), icon: FileText },
    { to: "/inspector/rules", label: t("officer.rules", "Rules"), icon: BookOpen },
    { to: "/inspector/settings", label: t("officer.profileSettings", "Profile & Settings"), icon: Settings },
  ];

  const adminNavItems = [
    { to: "/admin", label: t("officer.dashboard", "Dashboard"), icon: LayoutDashboard },
    { to: "/admin/inspectors", label: t("officer.inspectors", "Inspectors"), icon: Users },
    { to: "/admin/inspections", label: t("officer.inspections", "Inspections"), icon: ScanLine },
    { to: "/admin/user-scan-issues", label: t("officer.citizenScanAlerts", "Citizen Scan Alerts"), icon: ShieldAlert },
    { to: "/admin/user-issues", label: t("officer.citizenGrievances", "Citizen Grievances"), icon: FileSpreadsheet },
    { to: "/admin/rules", label: t("officer.rulesManagement", "Rules Management"), icon: BookOpen },
    { to: "/admin/notifications", label: t("officer.notifications", "Notifications & Requests"), icon: Bell },
    { to: "/admin/reports", label: t("officer.reports", "Reports"), icon: FileText },
    { to: "/admin/analytics", label: t("officer.analytics", "Analytics"), icon: BarChart3 },
    { to: "/admin/logs", label: t("officer.auditLogs", "Audit Logs"), icon: Activity },
    { to: "/admin/settings", label: t("officer.settings", "Settings"), icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : inspectorNavItems;

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              backgroundColor: isAdmin ? "#1d4ed8" : "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
            }}
          >
            {isAdmin ? <Building2 size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#ffffff", letterSpacing: "-0.01em" }}>
              METRISCAN
            </div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {t("officer.topbarTitle", "Legal Metrology Platform")}
            </div>
          </div>
        </div>

        {/* Active Role Indicator */}
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.35rem 0.65rem",
            backgroundColor: isAdmin ? "rgba(30, 58, 138, 0.45)" : "rgba(37, 99, 235, 0.2)",
            border: isAdmin ? "1px solid #1d4ed8" : "1px solid #2563eb",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: isAdmin ? "#60a5fa" : "#34d399",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "0.03em" }}>
            {isAdmin ? t("officer.sidebarOversight", "CENTRAL OVERSIGHT (ADMIN)") : t("officer.sidebarEnforcement", "FIELD ENFORCEMENT (INSPECTOR)")}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", overflowY: "auto" }}>
        <div style={{ padding: "0 0.5rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {isAdmin ? t("officer.directorateModules", "Directorate Modules") : t("officer.inspectorWorkspace", "Inspector Workspace")}
        </div>
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.to}-${idx}`}
              to={item.to}
              end={item.to === "/inspector" || item.to === "/admin"}
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
                textDecoration: "none",
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Professional Sidebar Logout */}
        <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid #1e293b" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#f87171",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              textAlign: "left",
            }}
            title="Sign out of Legal Metrology Platform"
          >
            <LogOut size={16} />
            <span>{t("officer.logout", "Sign Out")} ({user?.username || "Officer"})</span>
          </button>
        </div>
      </nav>

      {/* System Status Footer */}
      <div style={{ padding: "0.9rem", borderTop: "1px solid #1e293b", backgroundColor: "#0b1329" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.45rem" }}>
          Compliance Engine Status
        </div>
        
        {/* Backend Connection Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.45rem 0.65rem",
            backgroundColor: "#0f172a",
            borderRadius: "6px",
            border: "1px solid #1e293b",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#cbd5e1" }}>
            <Server size={13} />
            <span>FastAPI Server</span>
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

        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.68rem", color: "#64748b" }}>
          <Shield size={11} />
          <span>LM (PC) Rules, 2011 Engine v1.0</span>
        </div>
      </div>
    </aside>
  );
}
