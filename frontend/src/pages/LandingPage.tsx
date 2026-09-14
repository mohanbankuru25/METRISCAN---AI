import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Scale,
  ArrowRight,
  User,
  RotateCw,
  LogIn,
  UserPlus,
  FileCheck2,
  ShieldAlert,
  Search
} from "lucide-react";
import { LanguageSelector } from "../components/common/LanguageSelector";
import { useLanguage } from "../i18n/LanguageContext";

export function LandingPage() {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const { t } = useLanguage();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
      {/* ====================================================================
          TOP NAVIGATION HEADER
         ==================================================================== */}
      <header style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0.85rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          {/* Brand */}
          <div
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer" }}
          >
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)"
            }}>
              <Scale size={24} />
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1.1 }}>
                METRI<span style={{ color: "#2563eb" }}>SCAN</span>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>
                Legal Metrology Compliance Platform
              </div>
            </div>
          </div>

          {/* Direct Portals Quick Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LanguageSelector variant="compact" />

            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.15s ease"
              }}
            >
              <LogIn size={15} />
              <span>{t("nav.officerLogin", "Officer Login")}</span>
            </button>
            <button
              onClick={() => navigate("/user/login")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 2px 6px rgba(37,99,235,0.25)"
              }}
            >
              <User size={15} />
              <span>{t("nav.citizenPortal", "Citizen Portal")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          HERO & 3D FLIP PORTAL CARD
         ==================================================================== */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "3rem 1.5rem 2rem", textAlign: "center" }}>
        {/* Ministry Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.35rem 0.9rem",
          borderRadius: "9999px",
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1d4ed8",
          fontSize: "0.8rem",
          fontWeight: 600,
          marginBottom: "1.25rem"
        }}>
          <ShieldCheck size={16} />
          <span>{t("landing.ministryBadge", "Ministry of Consumer Affairs • Legal Metrology (PC) Rules, 2011")}</span>
        </div>

        {/* Hero Titles */}
        <h1 style={{
          fontSize: "2.75rem",
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1.15,
          letterSpacing: "-0.03em",
          marginBottom: "0.85rem"
        }}>
          {t("landing.heroTitlePrefix", "AI-Powered Packaged Commodity")} <br />
          <span style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #059669 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            {t("landing.heroTitleSuffix", "Compliance & Verification Platform")}
          </span>
        </h1>

        <p style={{
          maxWidth: "700px",
          margin: "0 auto 2.5rem",
          fontSize: "1.05rem",
          color: "#475569",
          lineHeight: 1.5
        }}>
          {t("landing.heroDescription", "Automated verification of statutory declarations, OCR text recognition, net quantity checking, expiry detection, and product safety evaluation for enforcement officers and consumers.")}
        </p>

        {/* ==================================================================
            PORTAL CARD CONTAINER WITH 3D FLIP
           ================================================================== */}
        <div style={{
          perspective: "1200px",
          maxWidth: "680px",
          margin: "0 auto 3rem",
        }}>
          <div style={{
            position: "relative",
            width: "100%",
            minHeight: "290px",
            transformStyle: "preserve-3d",
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            {/* --------------------------------------------------------------
                FRONT: OFFICER (Inspector) & ADMIN PORTALS
               -------------------------------------------------------------- */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              borderRadius: "20px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #cbd5e1",
              boxShadow: "0 12px 32px -4px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)",
              padding: "1.75rem 2rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1d4ed8" }}>
                      {t("landing.enforcementDivision", "Enforcement Division")}
                    </span>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      {t("landing.operationalPortals", "Official Operational Portals")}
                    </h2>
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                    {t("landing.frontOfficers", "Front: Officers")}
                  </span>
                </div>

                {/* Two side-by-side balanced tiles: Officer & Admin */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.75rem" }}>
                  {/* OFFICER / INSPECTOR TILE */}
                  <div
                    onClick={() => navigate("/inspector")}
                    style={{
                      borderRadius: "14px",
                      border: "1.5px solid #bfdbfe",
                      background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
                      padding: "1.25rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#059669";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 18px rgba(5, 150, 105, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#bfdbfe";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "0.75rem"
                    }}>
                      <ShieldCheck size={22} />
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.2rem" }}>
                      🛡 {t("landing.officerTitle", "Officer")}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.85rem" }}>
                      {t("landing.officerDesc", "Inspector Portal • Field scanning & reports")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#059669", fontSize: "0.82rem", fontWeight: 700 }}>
                      <span>{t("landing.enterPortal", "Enter Portal")}</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>

                  {/* ADMIN TILE */}
                  <div
                    onClick={() => navigate("/admin")}
                    style={{
                      borderRadius: "14px",
                      border: "1.5px solid #cbd5e1",
                      background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
                      padding: "1.25rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#2563eb";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 18px rgba(37, 99, 235, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      backgroundColor: "#1e3a8a",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "0.75rem"
                    }}>
                      <Building2 size={22} />
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.2rem" }}>
                      🏛 {t("landing.adminTitle", "Admin")}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.85rem" }}>
                      {t("landing.adminDesc", "Administrator • Oversight & analytics")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#1e3a8a", fontSize: "0.82rem", fontWeight: 700 }}>
                      <span>{t("landing.enterPortal", "Enter Portal")}</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Bar with Flip Control */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "0.75rem",
                marginTop: "0.5rem",
                borderTop: "1px solid #f1f5f9"
              }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {t("landing.flipToCitizenHint", "Click here for Citizen / Consumer Portal")}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  title="Switch to Public / Citizen Portal"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    color: "#2563eb",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#eff6ff";
                    e.currentTarget.style.borderColor = "#bfdbfe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  <RotateCw size={14} style={{ animation: "spin 8s linear infinite" }} />
                  <span>{t("landing.flipToCitizenBtn", "Citizen Portal")}</span>
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------------
                BACK: CITIZEN / USER / CONSUMER PORTAL
               -------------------------------------------------------------- */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              borderRadius: "20px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #93c5fd",
              boxShadow: "0 12px 32px -4px rgba(37, 99, 235, 0.12), 0 4px 12px rgba(15, 23, 42, 0.04)",
              padding: "1.75rem 2rem 1.5rem",
              transform: "rotateY(180deg)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <User size={20} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                        👤 {t("landing.citizenTitle", "Citizen / Consumer Portal")}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {t("landing.citizenDivision", "Product Safety, Expiry Verification & Issue Reporting")}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px", backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>
                    {t("landing.publicPortal", "Public Access")}
                  </span>
                </div>

                <p style={{ textAlign: "left", fontSize: "0.82rem", color: "#475569", lineHeight: 1.4, margin: "0.5rem 0 1.25rem" }}>
                  {t("landing.citizenDesc", "Scan packaged commodity labels to instantly verify nutritional facts, ingredient lists, expiry dates, and statutory legal declarations, or submit consumer grievances with photo and voice evidence.")}
                </p>

                {/* Login & Signup Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <button
                    onClick={() => navigate("/user/login")}
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "10px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.92rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                  >
                    <LogIn size={17} />
                    <span>{t("auth.citizenSignInBtn", "Consumer Login")}</span>
                  </button>

                  <button
                    onClick={() => navigate("/user/signup")}
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      color: "#1e293b",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.92rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#2563eb";
                      e.currentTarget.style.color = "#2563eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.color = "#1e293b";
                    }}
                  >
                    <UserPlus size={17} />
                    <span>{t("auth.createAccount", "Create Account")}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Card Bar with Flip-Back Control */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "0.75rem",
                marginTop: "0.5rem",
                borderTop: "1px solid #e2e8f0"
              }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {t("landing.flipToOfficerHint", "Click here for Enforcement Officer Portal")}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  title="Return to Officer / Admin Portals"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.color = "#475569";
                  }}
                >
                  <RotateCw size={14} />
                  <span>{t("landing.flipToOfficerBtn", "Officer Portals")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================
            CLEAN 3-PILLAR CAPABILITIES GRID (Streamlined, no clutter)
           ================================================================== */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          maxWidth: "1000px",
          margin: "0 auto",
          textAlign: "left"
        }}>
          {/* Card 1 */}
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "1.5rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <Search size={20} />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
              {t("landing.featOcrTitle", "Automated OCR & Vision")}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4, margin: 0 }}>
              {t("landing.featOcrDesc", "PaddleOCR and computer vision automatically detect MRP, Net Qty, dates, and packer addresses from label photographs.")}
            </p>
          </div>

          {/* Card 2 */}
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "1.5rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#dcfce7",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <FileCheck2 size={20} />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
              {t("landing.featComplianceTitle", "Rule 2 to 34 Compliance Engine")}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4, margin: 0 }}>
              {t("landing.featComplianceDesc", "Rigorous statutory verification evaluating mandatory declarations, unit sale price formats, and principal display proportions.")}
            </p>
          </div>

          {/* Card 3 */}
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "1.5rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem"
            }}>
              <ShieldAlert size={20} />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
              {t("landing.featGrievanceTitle", "Consumer Grievance Integration")}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.4, margin: 0 }}>
              {t("landing.featGrievanceDesc", "Citizens report expired, missing declarations, or misleading items with photos, voice recordings, and authorized geolocation.")}
            </p>
          </div>
        </div>
      </main>

      {/* ====================================================================
          FOOTER
         ==================================================================== */}
      <footer style={{
        marginTop: "4rem",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        padding: "1.5rem 1.5rem",
        textAlign: "center",
        fontSize: "0.8rem",
        color: "#64748b"
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <b>METRISCAN</b> — {t("landing.footerPlatform", "Legal Metrology Compliance Platform")}
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <span style={{ cursor: "pointer", color: "#2563eb" }} onClick={() => navigate("/inspector")}>{t("landing.officerPortal", "Inspector Portal")}</span>
            <span style={{ cursor: "pointer", color: "#2563eb" }} onClick={() => navigate("/admin")}>{t("officer.dashboard", "Admin Portal")}</span>
            <span style={{ cursor: "pointer", color: "#2563eb" }} onClick={() => navigate("/user/login")}>{t("nav.citizenPortal", "Citizen Portal")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

