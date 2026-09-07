import type { OCRResponse } from "./ocr";

export type StatusType = "PASS" | "FAIL" | "REVIEW" | "NOT_APPLICABLE" | "OUT_OF_SCOPE";

export interface ComplianceEvidence {
  text?: string;
  confidence?: number | null;
  bbox?: number[] | null;
}

export interface ComplianceRuleResult {
  rule_id?: string;
  rule_number?: string;
  rule_name?: string;
  status?: StatusType | string;
  applicable?: boolean | null;
  expected?: string | null;
  extracted?: unknown;
  extracted_value?: unknown;
  evidence?: ComplianceEvidence[] | string[] | null;
  reason?: string | null;
  suggestion?: string | null;
  rule_reference?: string | null;
  source?: string | null;
}

export interface ComplianceSummary {
  pass?: number;
  fail?: number;
  review?: number;
  not_applicable?: number;
  out_of_scope?: number;
  PASS?: number;
  FAIL?: number;
  REVIEW?: number;
  "NOT APPLICABLE"?: number;
  "OUT OF SCOPE"?: number;
}

export interface ComplianceResult {
  overall_status?: StatusType | string;
  summary?: ComplianceSummary;
  results?: ComplianceRuleResult[];
  score?: number;
  compliance_score?: number;
}

export interface OCRComplianceResponse extends OCRResponse {
  compliance?: ComplianceResult | null;
  applicability?: unknown;
}
