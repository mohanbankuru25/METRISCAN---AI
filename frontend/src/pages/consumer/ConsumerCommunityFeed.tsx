import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  MapPin,
  AlertTriangle,
  ThumbsUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  ShieldAlert,
  Loader2,
  Filter,
} from "lucide-react";
import { consumerService, type CommunityIssueItem } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

export default function ConsumerCommunityFeed() {
  const { t } = useLanguage();
  const [issues, setIssues] = useState<CommunityIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"prompt" | "granted" | "denied">("prompt");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const loadFeed = useCallback(async (lat?: number, lng?: number) => {
    try {
      const data = await consumerService.getCommunityFeed({ lat, lng });
      setIssues(data);
    } catch (err) {
      console.error("Failed to load community feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Request location on load
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setLocationStatus("granted");
          loadFeed(lat, lng);
        },
        (err) => {
          console.warn("Location permission denied or unavailable:", err.message);
          setLocationStatus("denied");
          loadFeed(); // Fallback to global feed
        },
        { timeout: 8000 }
      );
    } else {
      setLocationStatus("denied");
      loadFeed();
    }
  }, [loadFeed]);

  const handleManualLocationRequest = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setLocationStatus("granted");
          setRefreshing(true);
          loadFeed(lat, lng);
        },
        () => {
          setLocationStatus("denied");
        }
      );
    }
  };

  const handleConfirmIssue = async (issueId: string) => {
    try {
      setConfirmingId(issueId);
      const res = await consumerService.confirmCommunityIssue(issueId);
      // Update local item
      setIssues((prev) =>
        prev.map((item) =>
          item.id === issueId
            ? {
                ...item,
                confirmations_count: res.confirmations_count,
                priority: res.priority,
                has_confirmed: true,
              }
            : item
        )
      );
    } catch (err: any) {
      alert(err.message || "Failed to confirm issue.");
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredIssues = issues.filter((item) => {
    if (filterPriority === "ALL") return true;
    return item.priority.toUpperCase() === filterPriority;
  });

  const getPriorityBadge = (priority: string) => {
    const p = priority.toUpperCase();
    if (p === "HIGH") {
      return (
        <span
          style={{
            padding: "0.25rem 0.65rem",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 800,
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <ShieldAlert size={12} />
          {t("communityFeed.priorityHigh", "HIGH PRIORITY")}
        </span>
      );
    }
    if (p === "MEDIUM") {
      return (
        <span
          style={{
            padding: "0.25rem 0.65rem",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 800,
            backgroundColor: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fde68a",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <AlertTriangle size={12} />
          {t("communityFeed.priorityMedium", "MEDIUM")}
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "0.25rem 0.65rem",
          borderRadius: "6px",
          fontSize: "0.72rem",
          fontWeight: 700,
          backgroundColor: "#f1f5f9",
          color: "#475569",
          border: "1px solid #e2e8f0",
        }}
      >
        {t("communityFeed.priorityLow", "LOW")}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: "1020px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #a7f3d0",
              }}
            >
              <Users size={22} color="#059669" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {t("communityFeed.title", "Community Product Issues")}
              </h1>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                {t("communityFeed.subtitle", "Real-time issues and alerts reported by citizens in your area")}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadFeed(userCoords?.lat, userCoords?.lng);
            }}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.85rem",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            <span>{t("common.refresh", "Refresh")}</span>
          </button>

          <Link
            to="/user/report-issue"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              backgroundColor: "#059669",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(5,150,105,0.25)",
            }}
          >
            <PlusCircle size={15} />
            <span>{t("communityFeed.reportNewIssue", "Report New Issue")}</span>
          </Link>
        </div>
      </div>

      {/* Location Permission Notification Banner */}
      {locationStatus === "denied" && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "12px",
            padding: "0.85rem 1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.65rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={18} color="#d97706" />
            <span style={{ fontSize: "0.82rem", color: "#92400e" }}>
              {t("communityFeed.locationNotice", "Location permission is disabled. Showing all recent community reports. Allow location access to view issues near you.")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualLocationRequest}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "#d97706",
              color: "#ffffff",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("communityFeed.enableLocation", "Enable Location")}
          </button>
        </div>
      )}

      {locationStatus === "granted" && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "0.6rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: "#166534",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" />
          <span>{t("communityFeed.locationActive", "Nearby filter active: showing verified community reports near your location.")}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginRight: "0.3rem" }}>
          <Filter size={14} />
          {t("communityFeed.filterBy", "Filter:")}
        </span>
        {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((pri) => (
          <button
            key={pri}
            type="button"
            onClick={() => setFilterPriority(pri)}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "6px",
              fontSize: "0.76rem",
              fontWeight: 700,
              border: filterPriority === pri ? "1px solid #059669" : "1px solid #e2e8f0",
              backgroundColor: filterPriority === pri ? "#ecfdf5" : "#ffffff",
              color: filterPriority === pri ? "#059669" : "#64748b",
              cursor: "pointer",
            }}
          >
            {pri === "ALL"
              ? t("communityFeed.filterAll", "All Issues")
              : pri === "HIGH"
              ? t("communityFeed.priorityHigh", "High Priority")
              : pri === "MEDIUM"
              ? t("communityFeed.priorityMedium", "Medium")
              : t("communityFeed.priorityLow", "Low")}
          </button>
        ))}
      </div>

      {/* Feed Content */}
      {loading ? (
        <div style={{ padding: "4rem 1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <Loader2 size={32} className="spin" color="#059669" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>
            {t("common.loading", "Loading community feed...")}
          </span>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px dashed #cbd5e1",
            padding: "3.5rem 1.5rem",
            textAlign: "center",
          }}
        >
          <Users size={44} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.4rem" }}>
            {t("communityFeed.emptyTitle", "No Reported Issues Found")}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
            {t("communityFeed.emptySubtext", "No product issues have been reported in this filter category yet. If you spot a defect or violation, report it to alert fellow citizens.")}
          </p>
          <Link
            to="/user/report-issue"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              backgroundColor: "#059669",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <PlusCircle size={15} />
            <span>{t("communityFeed.reportNewIssue", "Report an Issue")}</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "1.25rem" }}>
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: issue.priority.toUpperCase() === "HIGH" ? "1.5px solid #fca5a5" : "1px solid #e2e8f0",
                boxShadow: issue.priority.toUpperCase() === "HIGH" ? "0 4px 12px rgba(239,68,68,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1rem",
                transition: "all 0.15s ease",
              }}
            >
              <div>
                {/* Top badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  {getPriorityBadge(issue.priority)}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {issue.status}
                  </span>
                </div>

                {/* Product info */}
                <div style={{ marginBottom: "0.6rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    {t("communityFeed.productLabel", "PRODUCT")}
                  </div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0.15rem 0 0" }}>
                    {issue.product_name}
                  </h3>
                  {issue.brand && issue.brand !== issue.product_name && (
                    <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      {issue.brand}
                    </div>
                  )}
                </div>

                {/* Issue Description */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    borderLeft: "3px solid #059669",
                    fontSize: "0.84rem",
                    color: "#334155",
                    lineHeight: 1.45,
                    marginBottom: "0.85rem",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                    {t("communityFeed.issueLabel", "REPORTED ISSUE")}
                  </div>
                  "{issue.description}"
                </div>

                {/* Details list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem", color: "#64748b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <MapPin size={13} color="#059669" />
                    <span>
                      <strong style={{ color: "#334155" }}>{t("communityFeed.locationLabel", "Location")}:</strong>{" "}
                      {issue.location_display || t("communityFeed.nearbyArea", "Nearby / Local Area")}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={13} color="#64748b" />
                    <span>
                      <strong style={{ color: "#334155" }}>{t("communityFeed.reportedOn", "Reported")}:</strong>{" "}
                      {new Date(issue.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm / Raise Alert Button */}
              <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Users size={14} color="#059669" />
                  <span>
                    {issue.confirmations_count}{" "}
                    {issue.confirmations_count === 1
                      ? t("communityFeed.citizenReported", "citizen reported")
                      : t("communityFeed.citizensReported", "citizens confirmed")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmIssue(issue.id)}
                  disabled={issue.has_confirmed || confirmingId === issue.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "7px",
                    backgroundColor: issue.has_confirmed ? "#f1f5f9" : "#ecfdf5",
                    color: issue.has_confirmed ? "#94a3b8" : "#059669",
                    border: issue.has_confirmed ? "1px solid #e2e8f0" : "1px solid #a7f3d0",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: issue.has_confirmed ? "default" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {confirmingId === issue.id ? (
                    <Loader2 size={13} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                  ) : issue.has_confirmed ? (
                    <CheckCircle2 size={13} color="#94a3b8" />
                  ) : (
                    <ThumbsUp size={13} color="#059669" />
                  )}
                  <span>
                    {issue.has_confirmed
                      ? t("communityFeed.confirmedBtn", "Confirmed ✓")
                      : t("communityFeed.confirmIssueBtn", "Confirm Issue")}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
