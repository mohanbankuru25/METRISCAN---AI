import { CheckCircle2, AlertTriangle, XCircle, FileText } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  type: "total" | "pass" | "fail" | "review";
  subtitle?: string;
}

export function StatCard({ title, value, type, subtitle }: StatCardProps) {
  const getCardStyle = () => {
    switch (type) {
      case "pass":
        return {
          bg: "#f0fdf4",
          border: "#bbf7d0",
          iconColor: "#059669",
          textColor: "#065f46",
          Icon: CheckCircle2,
        };
      case "fail":
        return {
          bg: "#fef2f2",
          border: "#fecaca",
          iconColor: "#dc2626",
          textColor: "#991b1b",
          Icon: XCircle,
        };
      case "review":
        return {
          bg: "#fffbeb",
          border: "#fde68a",
          iconColor: "#d97706",
          textColor: "#92400e",
          Icon: AlertTriangle,
        };
      default:
        return {
          bg: "#ffffff",
          border: "#e2e8f0",
          iconColor: "#2563eb",
          textColor: "#0f172a",
          Icon: FileText,
        };
    }
  };

  const { bg, border, iconColor, textColor, Icon } = getCardStyle();

  return (
    <div
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: "12px",
        padding: "1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: "0.775rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
          {title}
        </div>
        <div style={{ fontSize: "1.85rem", fontWeight: 800, color: textColor, lineHeight: 1.1 }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          border: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconColor,
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
        }}
      >
        <Icon size={22} />
      </div>
    </div>
  );
}
