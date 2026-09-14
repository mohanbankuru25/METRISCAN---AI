import { authService } from "./authService";
import type {
  InspectorProfile,
  ComplianceRule,
  InspectionRecord,
  AdminAnalytics,
  AuditLog,
  ReportItem,
} from "../types/platform";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface SystemStats {
  totalInspections: number;
  totalInspectors: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  complianceRate: number;
}

export const adminService = {
  // ==========================================================================
  // SYSTEM ANALYTICS
  // ==========================================================================
  async getSystemStats(): Promise<SystemStats> {
    const res = await fetch(`${BACKEND_URL}/api/admin/analytics`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch system stats (${res.status})`);
    }

    const json = await res.json();
    const data: AdminAnalytics = json.data || {};

    const total = data.total_inspections || 0;
    const passed = data.pass_count || 0;
    const rate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;

    return {
      totalInspections: total,
      totalInspectors: data.total_inspectors || 0,
      passCount: passed,
      failCount: data.fail_count || 0,
      reviewCount: data.review_count || 0,
      complianceRate: rate,
    };
  },

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const res = await fetch(`${BACKEND_URL}/api/admin/analytics`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch platform analytics (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },

  // ==========================================================================
  // INSPECTORS MANAGEMENT
  // ==========================================================================
  async getInspectors(params?: {
    search?: string;
    isActive?: boolean;
    department?: string;
    designation?: string;
  }): Promise<InspectorProfile[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.isActive !== undefined) query.set("is_active", String(params.isActive));
    if (params?.department) query.set("department", params.department);
    if (params?.designation) query.set("designation", params.designation);

    const res = await fetch(`${BACKEND_URL}/api/admin/inspectors?${query.toString()}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch inspectors directory (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  async getInspectorById(id: string): Promise<InspectorProfile> {
    const res = await fetch(`${BACKEND_URL}/api/admin/inspectors/${id}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Inspector not found (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },

  async createInspector(data: {
    username: string;
    password: string;
    full_name: string;
    phone?: string;
    designation?: string;
    department?: string;
  }): Promise<InspectorProfile> {
    const res = await fetch(`${BACKEND_URL}/api/admin/inspectors`, {
      method: "POST",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Failed to register inspector");
    }

    return json.inspector;
  },

  async updateInspector(
    id: string,
    data: {
      full_name?: string;
      phone?: string;
      designation?: string;
      department?: string;
      is_active?: boolean;
    }
  ): Promise<InspectorProfile> {
    const res = await fetch(`${BACKEND_URL}/api/admin/inspectors/${id}`, {
      method: "PUT",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Failed to update inspector profile");
    }

    return json.inspector;
  },

  async updateInspectorStatus(id: string, active: boolean): Promise<InspectorProfile> {
    const res = await fetch(`${BACKEND_URL}/api/admin/inspectors/${id}/status`, {
      method: "PATCH",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ active }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Failed to update inspector status");
    }

    return json.inspector;
  },

  // ==========================================================================
  // COMPLIANCE RULES MANAGEMENT
  // ==========================================================================
  async getComplianceRules(params?: {
    search?: string;
    category?: string;
    active?: boolean;
  }): Promise<ComplianceRule[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.active !== undefined) query.set("active", String(params.active));

    const res = await fetch(`${BACKEND_URL}/api/admin/rules?${query.toString()}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch compliance rules (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  async getRuleById(id: string): Promise<ComplianceRule> {
    const res = await fetch(`${BACKEND_URL}/api/admin/rules/${id}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Rule not found (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },

  async createComplianceRule(data: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const res = await fetch(`${BACKEND_URL}/api/admin/rules`, {
      method: "POST",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Failed to create compliance rule");
    }

    return json.rule;
  },

  async updateComplianceRule(id: string, data: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const res = await fetch(`${BACKEND_URL}/api/admin/rules/${id}`, {
      method: "PUT",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Failed to update compliance rule");
    }

    return json.rule;
  },

  async updateRuleStatus(id: string, active: boolean): Promise<ComplianceRule> {
    const res = await fetch(`${BACKEND_URL}/api/admin/rules/${id}/status`, {
      method: "PATCH",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ active }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || "Failed to update rule status");
    }

    return json.rule;
  },

  // ==========================================================================
  // INSPECTIONS
  // ==========================================================================
  async getRecentInspections(limit = 50, params?: { search?: string; status?: string }): Promise<InspectionRecord[]> {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (params?.search) query.set("search", params.search);
    if (params?.status && params.status !== "ALL") query.set("status", params.status);

    const res = await fetch(`${BACKEND_URL}/api/inspections/?${query.toString()}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch inspections (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  async getInspectionById(id: string): Promise<InspectionRecord> {
    const res = await fetch(`${BACKEND_URL}/api/inspections/${id}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Inspection not found (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },

  // ==========================================================================
  // REPORTS
  // ==========================================================================
  async getRecentReports(search?: string): Promise<ReportItem[]> {
    const query = new URLSearchParams();
    if (search) query.set("search", search);

    const res = await fetch(`${BACKEND_URL}/api/reports/?${query.toString()}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch reports (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================
  async getActivityLogs(searchOrLimit?: string | number, action?: string): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (typeof searchOrLimit === "number") {
      query.set("limit", String(searchOrLimit));
    } else if (typeof searchOrLimit === "string" && searchOrLimit.trim()) {
      query.set("search", searchOrLimit.trim());
    }
    if (action && action !== "ALL") query.set("action", action);

    const res = await fetch(`${BACKEND_URL}/api/admin/audit-logs?${query.toString()}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch audit logs (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  // ==========================================================================
  // STATUTORY RULE DOCUMENT UPLOAD & EXTRACTION
  // ==========================================================================
  async uploadRuleDocument(file: File): Promise<{
    upload_id: string;
    document_name: string;
    storage_path: string;
    upload_date: string;
    rules_detected_count: number;
    candidate_rules: any[];
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BACKEND_URL}/api/admin/rules/upload`, {
      method: "POST",
      headers: {
        Authorization: authService.getAuthHeaders().Authorization || "",
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || `Failed to process rule document (${res.status})`);
    }

    return json;
  },

  async confirmExtractedRules(rules: any[]): Promise<{
    confirmed_count: number;
    rules: any[];
  }> {
    const res = await fetch(`${BACKEND_URL}/api/admin/rules/batch`, {
      method: "POST",
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ rules }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.detail || `Failed to confirm and save extracted rules (${res.status})`);
    }

    return json;
  },
};
