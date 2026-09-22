import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shield, Scale, Building2, LogOut, ChevronDown, User, Bell } from "lucide-react";
import { authService } from "../../services/authService";
import type { UserProfile } from "../../types/platform";
import { useLanguage } from "../../i18n/LanguageContext";
import { LanguageSelector } from "../common/LanguageSelector";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isAdmin = path.startsWith("/admin");
  const { t } = useLanguage();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    authService.getCurrentUser().then((profile) => {
      if (isMounted) setUser(profile);
    });
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to end your active session and log out?")) {
      await authService.logout();
      navigate("/login");
    }
  };

  const getPageTitle = (p: string) => {
    if (p === "/admin") return t("officer.dashboard", "Administrator Central Oversight");
    if (p.startsWith("/admin/inspectors")) return t("officer.inspectors", "Enforcement Officer Directory");
    if (p.startsWith("/admin/inspections")) return t("officer.inspections", "National Inspection Registry");
    if (p.startsWith("/admin/analytics")) return t("officer.analytics", "Compliance Analytics & Violation Intelligence");
    if (p.startsWith("/admin/reports")) return t("officer.reports", "Official Inspection Reports Repository");
    if (p.startsWith("/admin/rules")) return t("officer.rulesManagement", "Dynamic Statutory Compliance Rule Registry");
    if (p.startsWith("/admin/notifications")) return t("officer.notifications", "Notifications & Rule Requests");
    if (p.startsWith("/admin/logs")) return t("officer.auditLogs", "System Activity & Audit Trails");
    if (p.startsWith("/admin/settings")) return t("officer.settings", "Central Administration Settings");

    if (p === "/inspector") return t("officer.inspectorWorkspace", "Field Inspector Workspace");
    if (p.startsWith("/inspector/scan")) return t("officer.scanProduct", "Product Label Compliance Scanner");
    if (p.startsWith("/inspector/history/")) return t("officer.inspectionHistory", "Statutory Inspection Dossier");
    if (p.startsWith("/inspector/history")) return t("officer.inspectionHistory", "Inspector Inspection Archive");
    if (p.startsWith("/inspector/reports")) return t("officer.reportsDossiers", "Certified Compliance Reports");
    if (p.startsWith("/inspector/rules")) return t("officer.rules", "Statutory Compliance Rules Catalog");
    if (p.startsWith("/inspector/settings")) return t("officer.profileSettings", "Officer Profile & Regulatory Rules");

    return t("officer.topbarTitle", "Legal Metrology Compliance Platform");
  };

  const getPageSubtitle = (p: string) => {
    if (p.startsWith("/admin")) {
      return t("officer.sidebarOversight", "Ministry of Consumer Affairs • State Directorate Central Oversight");
    }
    return t("officer.topbarSubtitle", "Legal Metrology (Packaged Commodities) Rules, 2011 Enforcement");
  };

  const displayName = user?.full_name || (isAdmin ? "Administrator" : "Enforcement Officer");
  const displayUsername = user?.username || (isAdmin ? "admin.admin" : "officer.ins");
  const displayRole = user?.role === "admin" ? "Administrator" : "Field Inspector";

  return (
    <header className="app-topbar">
      {/* Title & Hierarchy */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            padding: "0.45rem",
            borderRadius: "6px",
            backgroundColor: isAdmin ? "#eff6ff" : "#f1f5f9",
            color: isAdmin ? "#1d4ed8" : "#0f172a",
            display: "flex",
            alignItems: "center",
          }}
        >
          {isAdmin ? <Building2 size={19} /> : <Scale size={19} />}
        </div>
        <div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
            {getPageTitle(path)}
          </h2>
          <div style={{ fontSize: "0.725rem", color: "#64748b", fontWeight: 500 }}>
            {getPageSubtitle(path)}
          </div>
        </div>
      </div>

      {/* Engine Chip & Real Officer Identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Verification Engine Chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.25rem 0.6rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "9999px",
            fontSize: "0.725rem",
            fontWeight: 600,
            color: "#166534",
          }}
        >
          <Shield size={13} />
          <span>{t("officer.engineActive", "PaddleOCR + Vision AI Active")}</span>
        </div>

        {/* Admin Notification Quick Access */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin/notifications")}
            title="Inspector Rule Requests & Notifications"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              backgroundColor: path.startsWith("/admin/notifications") ? "#eff6ff" : "#ffffff",
              color: path.startsWith("/admin/notifications") ? "#2563eb" : "#64748b",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Bell size={18} />
          </button>
        )}

        {/* Global Language Selector */}
        <LanguageSelector variant="compact" />

        {/* Real Profile with Dropdown Menu */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: isAdmin ? "#1e3a8a" : "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.75rem",
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "#2563eb" }}>{displayUsername}</span> • {displayRole}
              </div>
            </div>

            <ChevronDown size={14} color="#64748b" />
          </div>

          {/* Profile Dropdown Menu */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                border: "1px solid #e2e8f0",
                minWidth: "200px",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a" }}>{displayName}</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)" }}>{displayUsername}</div>
                <div style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 600, marginTop: "0.2rem" }}>
                  ● Active Session
                </div>
              </div>

              <div style={{ padding: "0.35rem" }}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(isAdmin ? "/admin/settings" : "/inspector/settings");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    border: "none",
                    background: "none",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#334155",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <User size={14} />
                  <span>View Officer Profile</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    border: "none",
                    background: "none",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#dc2626",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
