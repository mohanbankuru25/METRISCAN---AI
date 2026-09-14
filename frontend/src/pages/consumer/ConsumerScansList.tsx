import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ScanLine,
  History,
  Search,
  Calendar,
  ArrowRight,
  Filter,
  Loader2,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { consumerService, type ConsumerScanItem } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

export default function ConsumerScansList() {
  const [scans, setScans] = useState<ConsumerScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    const loadScans = async () => {
      try {
        setLoading(true);
        const data = await consumerService.getScans(50, 0);
        if (isMounted) setScans(data);
      } catch (err) {
        console.error("Failed to load scans", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadScans();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredScans = scans.filter((scan) => {
    const matchesSearch =
      (scan.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (scan.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (scan.barcode || "").toLowerCase().includes(search.toLowerCase());

    const isExpired = scan.is_expired || scan.expiry_status === "EXPIRED";

    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "SAFE") return matchesSearch && !isExpired;
    if (statusFilter === "EXPIRED") return matchesSearch && isExpired;
    return matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <History size={22} color="#059669" />
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {t("nav.myScans", "My Scan History")}
            </h1>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            {t("scanner.subtitle", "All packaged commodities scanned and analyzed by you")}
          </p>
        </div>

        <Link
          to="/user/scan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.6rem 1.15rem",
            borderRadius: "8px",
            backgroundColor: "#059669",
            color: "#ffffff",
            fontSize: "0.88rem",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(5,150,105,0.25)",
          }}
        >
          <ScanLine size={16} />
          <span>{t("nav.scanProduct", "Scan Product")}</span>
        </Link>
      </div>

      {/* Filter and Search Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          backgroundColor: "#ffffff",
          padding: "0.85rem 1.15rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search", "Search by product name, brand...")}
            style={{
              width: "100%",
              padding: "0.55rem 0.85rem 0.55rem 2.1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter size={15} color="#64748b" />
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
            {t("communityFeed.filterBy", "Filter:")}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.82rem",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontWeight: 600,
              outline: "none",
            }}
          >
            <option value="ALL">{t("communityFeed.filterAll", "All Scans")}</option>
            <option value="SAFE">{t("product.safeShelfLife", "Safe Shelf Life")}</option>
            <option value="EXPIRED">{t("product.expiredHeadline", "Expired Only")}</option>
          </select>
        </div>
      </div>

      {/* Scans Grid / List */}
      {loading ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <Loader2 size={20} className="spin" style={{ animation: "spin 1s linear infinite" }} />
          <span>{t("common.loading", "Loading your scans...")}</span>
        </div>
      ) : filteredScans.length === 0 ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <ScanLine size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", fontSize: "0.95rem" }}>
            {t("communityFeed.emptyTitle", "No matching scans found")}
          </div>
          <p style={{ margin: "0.25rem 0 1.25rem", fontSize: "0.82rem", color: "#64748b" }}>
            {search ? t("common.noData", "Try adjusting your search criteria") : t("scanner.subtitle", "Start by scanning your first packaged product")}
          </p>
          <Link
            to="/user/scan"
            style={{
              display: "inline-block",
              padding: "0.55rem 1.15rem",
              backgroundColor: "#059669",
              color: "#ffffff",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {t("nav.scanProduct", "Scan Product Now")}
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
          {filteredScans.map((scan) => {
            const isExpired = scan.is_expired || scan.expiry_status === "EXPIRED";

            return (
              <div
                key={scan.id}
                onClick={() => navigate(`/user/scans/${scan.id}`)}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: isExpired ? "1px solid #fca5a5" : "1px solid #e2e8f0",
                  padding: "1.25rem",
                  boxShadow: isExpired ? "0 4px 10px rgba(239,68,68,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        {scan.brand || t("common.notDetected", "Brand Unspecified")}
                      </span>
                      {scan.scan_type === "MULTI_SCAN" ? (
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.08rem 0.35rem", borderRadius: "4px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                          Multi-Scan
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.08rem 0.35rem", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#64748b" }}>
                          Single Scan
                        </span>
                      )}
                    </div>

                    {isExpired ? (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          backgroundColor: "#fee2e2",
                          color: "#b91c1c",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                        }}
                      >
                        <AlertOctagon size={11} />
                        {t("product.expiredHeadline", "EXPIRED")}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          backgroundColor: "#ecfdf5",
                          color: "#059669",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                        }}
                      >
                        <CheckCircle2 size={11} />
                        {t("product.safeShelfLife", "SHELF LIFE OK")}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem", lineHeight: 1.3 }}>
                    {scan.product_name || t("reportForm.defaultProductName", "Packaged Commodity")}
                  </h3>

                  <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {scan.mrp && (
                      <div>
                        {t("product.mrp", "MRP")}: <strong style={{ color: "#1e293b" }}>{scan.mrp}</strong>
                      </div>
                    )}
                    {scan.net_quantity && (
                      <div>
                        {t("product.netQuantity", "Net Qty")}: <strong style={{ color: "#1e293b" }}>{scan.net_quantity}</strong>
                      </div>
                    )}
                    {scan.expiry_date && (
                      <div>
                        {t("product.expiryDate", "Expiry")}:{" "}
                        <strong style={{ color: isExpired ? "#dc2626" : "#1e293b" }}>{scan.expiry_date}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Calendar size={12} />
                    <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                  </div>

                  <span style={{ color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <span>{t("common.viewDetails", "View Details")}</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
