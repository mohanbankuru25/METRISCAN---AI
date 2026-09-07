import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, HelpCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string | undefined | null;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const norm = String(status || "REVIEW").toUpperCase().replace(/\s+/g, "_");

  let badgeClass = "badge-review";
  let icon = <AlertTriangle size={size === "lg" ? 18 : 14} />;
  let label = "REVIEW";

  if (norm === "PASS") {
    badgeClass = "badge-pass";
    icon = <CheckCircle2 size={size === "lg" ? 18 : 14} />;
    label = "PASS ✓";
  } else if (norm === "FAIL") {
    badgeClass = "badge-fail";
    icon = <XCircle size={size === "lg" ? 18 : 14} />;
    label = "FAIL ✕";
  } else if (norm === "NOT_APPLICABLE" || norm === "NOT APPLICABLE" || norm === "N/A") {
    badgeClass = "badge-na";
    icon = <MinusCircle size={size === "lg" ? 18 : 14} />;
    label = "NOT APPLICABLE —";
  } else if (norm === "OUT_OF_SCOPE" || norm === "OUT OF SCOPE") {
    badgeClass = "badge-oos";
    icon = <HelpCircle size={size === "lg" ? 18 : 14} />;
    label = "OUT OF SCOPE ○";
  } else {
    label = "REVIEW ⚠";
  }

  const paddingStyle =
    size === "lg" ? { padding: "0.4rem 0.85rem", fontSize: "0.85rem" } :
    size === "sm" ? { padding: "0.15rem 0.45rem", fontSize: "0.68rem" } :
    { padding: "0.25rem 0.65rem", fontSize: "0.75rem" };

  return (
    <span className={`badge ${badgeClass}`} style={paddingStyle}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
