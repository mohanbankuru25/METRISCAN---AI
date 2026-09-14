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

export interface VisualTextSize {
  status?: string;
  text_blocks?: number;
  median_height?: number;
  min_height?: number;
  max_height?: number;
  median_height_px?: number;
  min_height_px?: number;
  max_height_px?: number;
  calibrated_height_mm?: number | null;
}


export interface VisualPlacement {
  status?: string;
  text_blocks?: number;
  bbox_count?: number;
  regions?: any[];
  label_positions?: any[];
  declaration_groups?: any[];
}


export interface VisualReadability {
  status?: string;
  mean_ocr_confidence?: number;
  high_confidence_ratio?: number;
  local_contrast?: number;
  median_local_contrast?: number;
}


export interface DeclarationVisibility {
  status?: string;
  detected_declarations?: number;
  ocr_bbox_count?: number;
  groups?: any[];
}


export interface VisualComplianceAnalysis {
  engine?: string;

  image?: {
    width?: number;
    height?: number;
    calibrated?: boolean;
  };

  text_size?: VisualTextSize;

  placement?: VisualPlacement;

  readability?: VisualReadability;

  declaration_visibility?: DeclarationVisibility;

  rules?: {
    [key: string]: any;
  };
}


export interface OCRComplianceResponse
  extends OCRResponse {

  compliance?: ComplianceResult | null;

  applicability?: unknown;

  visual_analysis?: VisualComplianceAnalysis;

  processed_image?: string;

  gemini_error?: string | null;

  recovered_fields?: any[];
}