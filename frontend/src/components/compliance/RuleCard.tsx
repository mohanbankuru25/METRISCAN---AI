import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Scale, Sparkles } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ComplianceRuleResult } from "../../types/compliance";

interface RuleCardProps {
  rule: ComplianceRuleResult;
  onHighlightEvidence?: (rule: ComplianceRuleResult) => void;
  isSelected?: boolean;
}

export function RuleCard({ rule, onHighlightEvidence, isSelected }: RuleCardProps) {
  const [expanded, setExpanded] = useState<boolean>(true);

  const formatValue = (val: unknown) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return "Not detected";
    }
    if (typeof val === "object") {
      try { return JSON.stringify(val); } catch { return String(val); }
    }
    return String(val);
  };

  const formatEvidenceText = (ev: ComplianceRuleResult["evidence"]) => {
    if (!ev || (Array.isArray(ev) && ev.length === 0)) return "No explicit OCR snippet mapped.";
    if (Array.isArray(ev)) {
      return ev
        .map((item) => (typeof item === "string" ? item : item.text || "Visual evidence block"))
        .join(" • ");
    }
    return String(ev);
  };

  const status = String(rule.status || "REVIEW").toUpperCase();

  return (
    <div
      style={{
        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
        border: `1px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        transition: "all 0.15s ease-in-out"
      }}
    >
      {/* Header Bar */}
      <div
        onClick={() => {
          setExpanded(!expanded);
          if (onHighlightEvidence) onHighlightEvidence(rule);
        }}
        style={{
          padding: "0.85rem 1.1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          backgroundColor: isSelected ? "#eff6ff" : "#ffffff"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
          <Scale size={18} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", fontFamily: "var(--font-mono)" }}>
                {rule.rule_number || rule.rule_id || "Rule"}
              </span>
              <span style={{ fontSize: "0.925rem", fontWeight: 700, color: "#0f172a" }}>
                {rule.rule_name || "Legal Metrology Requirement"}
              </span>
            </div>
            {rule.rule_reference && (
              <div style={{ fontSize: "0.725rem", color: "#64748b", marginTop: "1px" }}>
                {rule.rule_reference}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <StatusBadge status={status} size="sm" />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.2rem", borderRadius: "50%", border: "none", backgroundColor: "transparent" }}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div
          style={{
            padding: "0.85rem 1.1rem 1.1rem",
            borderTop: "1px solid #f1f5f9",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.85rem"
          }}
        >
          {/* Expected vs Extracted */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            <div style={{ padding: "0.65rem", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Expected Requirement</div>
              <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "0.2rem" }}>{rule.expected || "Prescribed mandatory declaration."}</div>
            </div>

            <div style={{ padding: "0.65rem", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Extracted Package Value</div>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>
                {formatValue(rule.extracted_value ?? rule.extracted)}
              </div>
            </div>
          </div>

          {/* Evidence snippet */}
          <div style={{ padding: "0.65rem", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
              <Sparkles size={12} />
              <span>OCR & Vision AI Evidence</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#334155", marginTop: "0.25rem" }}>
              {formatEvidenceText(rule.evidence)}
            </div>
          </div>

          {/* Reason */}
          {rule.reason && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", color: "#334155" }}>
              <CheckCircle2 size={15} color="#2563eb" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong>Engine Rationale:</strong> {rule.reason}
              </div>
            </div>
          )}

          {/* Suggestion if present */}
          {rule.suggestion && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", color: "#92400e", backgroundColor: "#fffbeb", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #fde68a" }}>
              <AlertCircle size={15} color="#d97706" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong>Inspector Recommendation:</strong> {rule.suggestion}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
