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

  const totalRules = passCount + failCount + reviewCount + naCount + oosCount;
  const r = 36;
  const circumference = 2 * Math.PI * r;

  const slices = [
    { label: "PASS", count: passCount, color: "#059669" },
    { label: "FAIL", count: failCount, color: "#dc2626" },
    { label: "REVIEW", count: reviewCount, color: "#d97706" },
    { label: "N/A", count: naCount, color: "#64748b" },
    { label: "OUT OF SCOPE", count: oosCount, color: "#475569" },
  ].filter((s) => s.count > 0);

  let accumulated = 0;

  return (
    <div className="panel-card" style={{ marginBottom: "1.25rem" }}>
      <div className="panel-card-header">
        <div className="panel-card-title">
          <span>Legal Metrology Compliance Verdict</span>
        </div>
        <StatusBadge status={status} size="lg" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          alignItems: "center",
        }}
      >
        {/* Left: Overall Compliance Score Circular Gauge */}
        <ComplianceScore score={score} status={status} />

        {/* Center: Interactive Pie / Doughnut Chart */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.75rem",
            backgroundColor: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Compliance Rule Pie Chart
          </div>

          <div style={{ position: "relative", width: "120px", height: "120px" }}>
            <svg
              width="120"
              height="120"
              viewBox="0 0 100 100"
              style={{ transform: "rotate(-90deg)", borderRadius: "50%" }}
            >
              {totalRules === 0 ? (
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="14"
                />
              ) : (
                slices.map((slice, idx) => {
                  const strokeLength = (slice.count / totalRules) * circumference;
                  const offset = (accumulated / totalRules) * circumference;
                  accumulated += slice.count;

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={r}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="14"
                      strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                      strokeDashoffset={-offset}
                      style={{ transition: "stroke-dasharray 0.5s ease" }}
                    >
                      <title>{`${slice.label}: ${slice.count} (${Math.round(
                        (slice.count / totalRules) * 100
                      )}%)`}</title>
                    </circle>
                  );
                })
              )}
            </svg>

            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                {totalRules}
              </span>
              <span style={{ fontSize: "0.625rem", color: "#64748b", fontWeight: 600 }}>
                RULES
              </span>
            </div>
          </div>
        </div>

        {/* Right: Summary Pill Counters & Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Rule Evaluation Breakdown
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#065f46" }}>
                ✓ PASS
              </span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#059669" }}>
                {passCount}
              </span>
            </div>

            <div
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#991b1b" }}>
                ✕ FAIL
              </span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>
                {failCount}
              </span>
            </div>

            <div
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e" }}>
                ! REVIEW
              </span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#d97706" }}>
                {reviewCount}
              </span>
            </div>

            <div
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}>
                — N/A
              </span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#64748b" }}>
                {naCount}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "0.45rem 0.75rem",
              backgroundColor: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e293b" }}>
              — OUT OF SCOPE
            </span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#475569" }}>
              {oosCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
