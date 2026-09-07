import { StatusBadge } from "./StatusBadge";
import { ComplianceScore } from "./ComplianceScore";
import type { ComplianceResult } from "../../types/compliance";

interface ComplianceSummaryProps {
  compliance: ComplianceResult | null | undefined;
}

export function ComplianceSummary({ compliance }: ComplianceSummaryProps) {
  if (!compliance) return null;

  const status = String(compliance.overall_status || "REVIEW").toUpperCase();
  const score = compliance.compliance_score ?? compliance.score ?? 0;
  const summary = compliance.summary || {};

  const passCount = summary.PASS ?? summary.pass ?? 0;
  const failCount = summary.FAIL ?? summary.fail ?? 0;
  const reviewCount = summary.REVIEW ?? summary.review ?? 0;
  const naCount = summary["NOT APPLICABLE"] ?? summary.not_applicable ?? 0;
  const oosCount = summary["OUT OF SCOPE"] ?? summary.out_of_scope ?? 0;

  return (
    <div className="panel-card" style={{ marginBottom: "1.25rem" }}>
      <div className="panel-card-header">
        <div className="panel-card-title">
          <span>Legal Metrology Compliance Verdict</span>
        </div>
        <StatusBadge status={status} size="lg" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", alignItems: "center" }}>
        {/* Left score visualization */}
        <ComplianceScore score={score} status={status} />

        {/* Right summary pill counters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Rule Evaluation Breakdown
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
            <div style={{ padding: "0.65rem 0.85rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#065f46" }}>PASS</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>{passCount}</span>
            </div>

            <div style={{ padding: "0.65rem 0.85rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#991b1b" }}>FAIL</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#dc2626" }}>{failCount}</span>
            </div>

            <div style={{ padding: "0.65rem 0.85rem", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#92400e" }}>REVIEW</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#d97706" }}>{reviewCount}</span>
            </div>

            <div style={{ padding: "0.65rem 0.85rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>N/A</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#64748b" }}>{naCount}</span>
            </div>
          </div>

          <div style={{ padding: "0.5rem 0.85rem", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "#1e293b" }}>OUT OF SCOPE</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#475569" }}>{oosCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
