import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Mic,
  Calendar,
  Loader2,
  Plus
} from "lucide-react";
import { consumerService, type ConsumerIssueItem } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

export default function ConsumerIssuesList() {
  const [issues, setIssues] = useState<ConsumerIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    const loadIssues = async () => {
      try {
        setLoading(true);
        const data = await consumerService.getIssues(50, 0);
        if (isMounted) setIssues(data);
      } catch (err) {
        console.error("Failed to load issues", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadIssues();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { label: t("communityFeed.statusResolved", "Resolved"), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: CheckCircle2 };
      case "UNDER_REVIEW":
        return { label: t("communityFeed.statusUnderReview", "Under Review"), color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: Clock };
      case "REJECTED":
        return { label: t("communityFeed.statusDismissed", "Dismissed"), color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: XCircle };
      default:
        return { label: t("communityFeed.statusSubmitted", "Submitted"), color: "#ca8a04", bg: "#fefce8", border: "#fef08a", icon: Clock };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={22} color="#059669" />
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {t("nav.myGrievances", "My Grievances")}
            </h1>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            {t("communityFeed.subtitle", "Track the enforcement and review status of packaged product complaints submitted by you")}
          </p>
        </div>

        <Link
          to="/user/report-issue"
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
          <Plus size={16} />
          <span>{t("communityFeed.reportNewIssue", "Report New Violation")}</span>
        </Link>
      </div>

      {/* Grievances List */}
      {loading ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <Loader2 size={20} className="spin" style={{ animation: "spin 1s linear infinite" }} />
          <span>{t("common.loading", "Retrieving your grievances...")}</span>
        </div>
      ) : issues.length === 0 ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <AlertTriangle size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", fontSize: "0.95rem" }}>
            {t("communityFeed.emptyTitle", "No Grievances Lodged")}
          </div>
          <p style={{ margin: "0.25rem 0 1.25rem", fontSize: "0.82rem", color: "#64748b" }}>
            {t("communityFeed.emptySubtext", "You have not submitted any product complaints. If you spot a defective package or violation, report it.")}
          </p>
          <Link
            to="/user/report-issue"
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
            {t("communityFeed.reportNewIssue", "Report Issue")}
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {issues.map((item) => {
            const badge = getStatusBadge(item.status);
            const Icon = badge.icon;
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      {item.category?.replace(/_/g, " ")}
                    </span>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0.4rem 0 0.15rem" }}>
                      {item.product_name}
                    </h3>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: "0.25rem 0.65rem",
                      borderRadius: "999px",
                    }}
                  >
                    <Icon size={12} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.5, backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "8px" }}>
                  "{item.description}"
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.75rem", color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: "0.65rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Calendar size={13} />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>

                    {item.location_latitude && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669" }}>
                        <MapPin size={13} />
                        <span>{t("reportForm.locationAttached", "Location Attached")}</span>
                      </div>
                    )}

                    {item.audio_storage_path && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#2563eb" }}>
                        <Mic size={13} />
                        <span>{t("voice.voiceNote", "Voice Complaint Attached")}</span>
                      </div>
                    )}
                  </div>

                  {item.admin_notes && (
                    <div style={{ fontSize: "0.75rem", color: "#b45309", backgroundColor: "#fffbeb", padding: "0.3rem 0.6rem", borderRadius: "6px" }}>
                      <strong>{t("common.officialNote", "Officer Note")}:</strong> {item.admin_notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
