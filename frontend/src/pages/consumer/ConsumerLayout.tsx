import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  ScanLine,
  Layers,
  History,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Sparkles
} from "lucide-react";
import { consumerService, type ConsumerUser } from "../../services/consumerService";
import { LanguageSelector } from "../../components/common/LanguageSelector";
import { useLanguage } from "../../i18n/LanguageContext";

export function ConsumerLayout() {
  const [user, setUser] = useState<ConsumerUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    consumerService.getCurrentUser().then((u) => {
      if (isMounted) setUser(u);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of the Citizen Consumer Portal?")) {
      consumerService.clearSession();
      navigate("/user/login");
    }
  };

  const navItems = [
    { to: "/user", label: t("nav.dashboard", "Dashboard"), icon: ShieldCheck, exact: true },
    { to: "/user/scan", label: t("nav.scanProduct", "Scan Product"), icon: ScanLine },
    { to: "/user/multi-scan", label: t("nav.multiScan", "Multi-Scan Products"), icon: Layers },
    { to: "/user/scans", label: t("nav.myScans", "My Scans"), icon: History },
    { to: "/user/community", label: t("nav.communityFeed", "Community Issues"), icon: Users },
    { to: "/user/report-issue", label: t("nav.reportProduct", "Report Issue"), icon: AlertTriangle },
    { to: "/user/issues", label: t("nav.myGrievances", "My Grievances"), icon: FileSpreadsheet },
    { to: "/user/profile", label: t("nav.myAccount", "My Account"), icon: User },
  ];


  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
      {/* Top Tiranga Tricolor Bar */}
      <div style={{ height: "4px", background: "linear-gradient(90deg, #ff9933 33.3%, #ffffff 33.3%, #ffffff 66.6%, #138808 66.6%)" }} />

      {/* Main Header */}
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0.75rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Logo & Portal Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <NavLink to="/user" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #059669, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 2px 10px rgba(5,150,105,0.3)",
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>{t("nav.portalTitle", "METRISCAN")}</span>
                  <span style={{ fontSize: "0.7rem", backgroundColor: "#ecfdf5", color: "#059669", padding: "0.15rem 0.45rem", borderRadius: "999px", fontWeight: 700, border: "1px solid #a7f3d0" }}>
                    {t("nav.citizenBadge", "CITIZEN")}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                  {t("nav.portalSubtitle", "National Consumer Packaged Commodity Portal")}
                </div>
              </div>
            </NavLink>
          </div>

          {/* Desktop Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "0.35rem" }} className="desktop-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.5rem 0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#047857" : "#475569",
                    backgroundColor: isActive ? "#ecfdf5" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={16} color={isActive ? "#059669" : "#64748b"} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Status, Language Selector & Sign Out */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Global Language Selector */}
            <LanguageSelector variant="compact" />

            <div style={{ textAlign: "right", display: "none" }} className="desktop-user-info">
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                {user?.full_name || user?.username || "Citizen User"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>
                Verified Consumer
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #fee2e2",
                backgroundColor: "#fff1f2",
                color: "#b91c1c",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <LogOut size={15} />
              <span className="logout-text">{t("nav.signOut", "Exit")}</span>
            </button>

            {/* Mobile Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              style={{
                display: "none",
                background: "none",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "0.35rem",
                cursor: "pointer",
                color: "#334155",
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", borderBottom: "1px solid #f1f5f9" }}>
              Welcome, {user?.full_name || user?.username || "Citizen"}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#047857" : "#475569",
                    backgroundColor: isActive ? "#ecfdf5" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* Regulatory Context Sub-Bar */}
      <div style={{ backgroundColor: "#047857", color: "#ffffff", padding: "0.35rem 1.25rem", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
        <Sparkles size={14} />
        <span>Legal Metrology (Packaged Commodities) Rules, 2011 & Consumer Protection Act, 2019 Advisory Suite</span>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "1.5rem 1.25rem" }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: "#0f172a", color: "#94a3b8", borderTop: "1px solid #1e293b", padding: "1.5rem 1.25rem", fontSize: "0.78rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <span style={{ fontWeight: 700, color: "#f8fafc" }}>METRISCAN Citizen Portal</span> — AI-assisted consumer product safety and compliance verification.
          </div>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <NavLink to="/user/scan" style={{ color: "#94a3b8", textDecoration: "none" }}>{t("nav.scanProduct", "Scan Label")}</NavLink>
            <NavLink to="/user/report-issue" style={{ color: "#94a3b8", textDecoration: "none" }}>{t("nav.reportProduct", "Report Issue")}</NavLink>
            <NavLink to="/" style={{ color: "#60a5fa", textDecoration: "none" }}>Official Portals</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
