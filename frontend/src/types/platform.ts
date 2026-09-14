import type { ComplianceRuleResult } from "./compliance";
import type { ProductData } from "./ocr";

export type UserRole = "admin" | "inspector" | "ADMIN" | "INSPECTOR";

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InspectorProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: "inspector" | "INSPECTOR";
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  is_active: boolean;
  inspections_count?: number;
  recent_inspections?: InspectionRecord[];
  created_at: string;
  updated_at?: string;
}

export interface ComplianceRule {
  id: string;
  rule_code: string;
  rule_name: string;
  title?: string;
  description?: string | null;
  category?: string | null;
  field_name?: string | null;
  condition_type: string;
  expected_value?: string | null;
  operator?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "MANDATORY" | "WARNING" | "OPTIONAL" | string;
  mandatory: boolean;
  active: boolean;
  is_active?: boolean;
  legal_act?: string;
  penalty_clause?: string;
  effective_from?: string | null;
  effective_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface InspectionRecord {
  id: string;
  inspection_number: string;
  user_id?: string;
  inspector_id?: string | null;
  inspector_name?: string;
  inspector_badge?: string;
  product_id?: string | null;
  status: "PASS" | "FAIL" | "REVIEW" | string;
  compliance_score?: number | null;
  total_rules?: number;
  passed_rules?: number;
  failed_rules?: number;
  review_rules?: number;
  total_checks?: number;
  passed_checks?: number;
  failed_checks?: number;
  warnings_count?: number;
  remarks?: string;
  image_url?: string | null;
  image_hash?: string;
  not_applicable_rules?: number;
  out_of_scope_rules?: number;
  inspection_date: string;
  created_at: string;
  updated_at?: string;
  product?: any;
  products?: ProductData | null;
  profiles?: UserProfile | null;
  compliance_results?: ComplianceRuleResult[];
  ocr_results?: any[];
  visual_analysis?: any;
  inspection_evidence?: any[];
  reports?: any[];
}

export interface AdminAnalytics {
  total_inspectors: number;
  active_inspectors: number;
  inactive_inspectors?: number;
  total_inspections: number;
  pass_count: number;
  fail_count: number;
  review_count: number;
  average_compliance_score?: number;
  compliance_rate?: number;
  total_rules?: number;
  active_rules?: number;
  categories?: Record<string, number>;
  category_distribution?: Record<string, number>;
  status_distribution?: {
    pass: number;
    fail: number;
    review: number;
  };
  violation_frequency?: Array<{ name: string; count: number }>;
  timeline?: Array<{
    date: string;
    count?: number;
    total?: number;
    pass?: number;
    fail?: number;
  }>;
  recent_inspections?: InspectionRecord[];
}

export interface InspectorAnalytics {
  total_inspections: number;
  passed: number;
  failed: number;
  review: number;
  average_score: number;
  recent_inspections: InspectionRecord[];
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description?: string | null;
  details?: any;
  ip_address?: string;
  metadata?: Record<string, any>;
  created_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
    role?: string;
  } | null;
}

export interface ReportItem {
  id: string;
  inspection_id: string;
  report_number: string;
  pdf_path?: string | null;
  docx_path?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_size?: number;
  format?: "PDF" | "DOCX" | string;
  generated_at?: string;
  status?: "PASS" | "FAIL" | "REVIEW" | string;
  product_name?: string;
  inspector_name?: string;
  generated_by?: string | null;
  created_at: string;
  inspections?: {
    inspection_number: string;
    status: string;
    compliance_score?: number;
    inspection_date: string;
    inspector_id?: string;
    products?: {
      product_name?: string;
      category?: string;
    };
  } | null;
  profiles?: {
    full_name?: string;
    username?: string;
  } | null;
}
