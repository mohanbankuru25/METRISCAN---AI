import { useState } from "react";
import { Scale, Filter } from "lucide-react";
import { RuleCard } from "./RuleCard";
import type { ComplianceRuleResult } from "../../types/compliance";

interface RuleListProps {
  rules: ComplianceRuleResult[];
  onHighlightEvidence?: (rule: ComplianceRuleResult) => void;
  selectedRuleId?: string | null;
}

export function RuleList({ rules, onHighlightEvidence, selectedRuleId }: RuleListProps) {
  const [filter, setFilter] = useState<string>("ALL");

  const filteredRules = rules.filter((r) => {
    if (filter === "ALL") return true;
    const st = String(r.status || "REVIEW").toUpperCase().replace(/\s+/g, "_");
    return st === filter;
  });

  const getCount = (statusKey: string) => {
    if (statusKey === "ALL") return rules.length;
    return rules.filter((r) => {
      const st = String(r.status || "REVIEW").toUpperCase().replace(/\s+/g, "_");
      return st === statusKey;
    }).length;
  };

  const tabs = [
    { key: "ALL", label: "All Rules" },
    { key: "PASS", label: "PASS" },
    { key: "REVIEW", label: "REVIEW" },
    { key: "FAIL", label: "FAIL" },
    { key: "NOT_APPLICABLE", label: "N/A" },
    { key: "OUT_OF_SCOPE", label: "Out of Scope" },
  ];

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <Scale size={18} color="#2563eb" />
          <span>Legal Metrology Rule Evaluations ({rules.length})</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginRight: "0.5rem" }}>
          <Filter size={13} />
          <span>Filter:</span>
        </div>
        {tabs.map((tab) => {
          const count = getCount(tab.key);
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="btn btn-sm"
              style={{
                backgroundColor: active ? "#0f172a" : "#f1f5f9",
                color: active ? "#ffffff" : "#475569",
                borderRadius: "9999px",
                padding: "0.25rem 0.65rem",
                fontSize: "0.75rem",
                border: "none"
              }}
            >
              <span>{tab.label}</span>
              <span style={{ backgroundColor: active ? "rgba(255,255,255,0.2)" : "#cbd5e1", color: active ? "#ffffff" : "#0f172a", borderRadius: "9999px", padding: "0.05rem 0.35rem", fontSize: "0.68rem" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rule Cards */}
      {filteredRules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
          No rule evaluations found for status filter "{filter}".
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredRules.map((rule, idx) => (
            <RuleCard
              key={rule.rule_id || rule.rule_number || idx}
              rule={rule}
              onHighlightEvidence={onHighlightEvidence}
              isSelected={selectedRuleId === (rule.rule_id || rule.rule_number)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
