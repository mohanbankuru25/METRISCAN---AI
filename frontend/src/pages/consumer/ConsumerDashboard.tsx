import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ScanLine,
  AlertTriangle,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertOctagon,
  Layers
} from "lucide-react";
import { consumerService, type ConsumerScanItem, type ConsumerIssueItem } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

export default function ConsumerDashboard() {
  const [scans, setScans] = useState<ConsumerScanItem[]>([]);
  const [issues, setIssues] = useState<ConsumerIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [scansData, issuesData] = await Promise.all([
          consumerService.getScans(6, 0).catch(() => []),
          consumerService.getIssues(5, 0).catch(() => []),
        ]);
        if (isMounted) {
          setScans(scansData);
          setIssues(issuesData);
        }
      } catch (err) {
        console.error("Failed to load consumer dashboard data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalScans = scans.length;
  const safeScans = scans.filter((s) => !s.is_expired && s.expiry_status !== "EXPIRED").length;
  const expiredScans = scans.filter((s) => s.is_expired || s.expiry_status === "EXPIRED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Hero Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 60%, #0d9488 100%)",
          borderRadius: "16px",
          padding: "2rem",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(5,150,105,0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1, maxWidth: "700px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.3rem 0.65rem",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#a7f3d0",
              marginBottom: "0.75rem",
            }}
          >
            <Sparkles size={13} />
            <span>{t("nav.portalSubtitle", "National Consumer Packaged Commodity Portal")}</span>
          </div>

          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0 0 0.5rem", letterSpacing: "-0.02em", color: "#ffffff" }}>
            {t("landing.heroTitle", "AI-Powered Packaged Commodity")}
          </h1>
          <p style={{ margin: 0, fontSize: "0.92rem", color: "#d1fae5", lineHeight: 1.5 }}>
            {t("landing.heroDescription", "Automated verification of statutory declarations, OCR text recognition, net quantity checking, expiry detection, and product safety evaluation for enforcement officers and consumers.")}
          </p>

          <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link
              to="/user/scan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "#ffffff",
                color: "#065f46",
                padding: "0.65rem 1.25rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <ScanLine size={18} />
              <span>{t("nav.scanProduct", "Scan Product Label")}</span>
            </Link>

            <Link
              to="/user/multi-scan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.45)",
                color: "#ffffff",
                padding: "0.65rem 1.25rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                backdropFilter: "blur(4px)",
              }}
            >
              <Layers size={18} />
              <span>{t("nav.multiScan", "Multi-Scan Products")}</span>
            </Link>

            <Link
              to="/user/report-issue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "0.65rem 1.25rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              <AlertTriangle size={18} />
              <span>{t("nav.reportProduct", "Report Product Issue")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{t("nav.myScans", "My Product Scans")}</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
              <ScanLine size={20} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.5rem" }}>
            {totalScans}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {t("scanner.title", "Packaged commodities analyzed")}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{t("product.safeShelfLife", "Safe Shelf Life")}</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a", marginTop: "0.5rem" }}>
            {safeScans}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {t("product.safeShelfLife", "Verified within shelf life")}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{t("product.expiredHeadline", "Expired Alerts")}</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
              <AlertOctagon size={20} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#dc2626", marginTop: "0.5rem" }}>
            {expiredScans}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {t("advisory.shelfLifeAlert", "Past best-before or use-by date")}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{t("nav.myGrievances", "Issues Lodged")}</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#2563eb", marginTop: "0.5rem" }}>
            {issues.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {t("landing.grievanceTitle", "Citizen grievances tracked")}
          </div>
        </div>
      </div>

      {/* Main Content Split: Recent Scans & Legal Metrology Awareness */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Recent Scans Section */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <History size={20} color="#059669" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>{t("nav.myScans", "Recent Product Scans")}</h2>
            </div>
            <Link to="/user/scans" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}>
              <span>{t("common.viewDetails", "View All")}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
              {t("common.loading", "Loading your verified scan history...")}
            </div>
          ) : scans.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
              <ScanLine size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700, color: "#334155", fontSize: "0.9rem" }}>{t("common.notDetected", "No Scans Yet")}</div>
              <p style={{ margin: "0.25rem 0 1rem", fontSize: "0.8rem", color: "#64748b" }}>
                {t("scanner.subtitle", "Scan a packaged commodity label to verify expiry date, ingredients, and MRP.")}
              </p>
              <Link
                to="/user/scan"
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {t("nav.scanProduct", "Scan Now")}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {scans.slice(0, 5).map((scan) => {
                const isExpired = scan.is_expired || scan.expiry_status === "EXPIRED";

                return (
                  <div
                    key={scan.id}
                    onClick={() => navigate(`/user/scans/${scan.id}`)}
                    style={{
                      padding: "0.85rem",
                      borderRadius: "10px",
                      border: "1px solid #f1f5f9",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#f1f5f9")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          backgroundColor: isExpired ? "#fef2f2" : "#f0fdf4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isExpired ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {isExpired ? <Clock size={22} /> : <CheckCircle2 size={22} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>
                          {scan.product_name || t("product.commodity", "Packaged Product")}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>{scan.brand || t("product.category", "Product")}</span>
                          <span>•</span>
                          <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {isExpired ? (
                        <span style={{ fontSize: "0.7rem", backgroundColor: "#fee2e2", color: "#b91c1c", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                          {t("product.expiredHeadline", "EXPIRED")}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            backgroundColor: "#dcfce7",
                            color: "#15803d",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontWeight: 700,
                          }}
                        >
                          {t("product.safeShelfLife", "SAFE / WITHIN SHELF LIFE")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Citizen Education / Advisory Card */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <ShieldCheck size={20} color="#059669" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {t("landing.featuresHeading", "Mandatory Label Checks")}
            </h2>
          </div>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#64748b" }}>
            {t("landing.ministryBadge", "Under Legal Metrology (Packaged Commodities) Rules, 2011, every pre-packaged item in India MUST display:")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", padding: "0.6rem", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <span style={{ fontWeight: 800, color: "#059669", fontSize: "0.85rem" }}>1.</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{t("product.mrp", "Maximum Retail Price (MRP)")}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("advisory.goodToKnow", 'Must state "Inclusive of all taxes". Charging above MRP is a punishable offense.')}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", padding: "0.6rem", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <span style={{ fontWeight: 800, color: "#059669", fontSize: "0.85rem" }}>2.</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{t("product.quantity", "Net Quantity & Standard Metric")}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("common.viewDetails", "Declared in g, kg, ml, L with minimum font height rules based on pack size.")}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", padding: "0.6rem", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <span style={{ fontWeight: 800, color: "#059669", fontSize: "0.85rem" }}>3.</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{t("product.expiryDate", "Manufacturing & Expiry / Best Before")}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("product.expiredSubtext", "Month and year of manufacture/packing and clear expiry date. Selling expired items is strictly prohibited.")}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", padding: "0.6rem", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <span style={{ fontWeight: 800, color: "#059669", fontSize: "0.85rem" }}>4.</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{t("product.manufacturer", "Manufacturer / Packer Information")}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("product.manufacturerAddress", "Name and complete physical address of the manufacturer, packer, or importer.")}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", padding: "0.6rem", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <span style={{ fontWeight: 800, color: "#059669", fontSize: "0.85rem" }}>5.</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{t("product.consumerContact", "Consumer Care Contact")}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("advisory.disclaimer", "Name, physical address, telephone number, and email of person/office handling grievances.")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
