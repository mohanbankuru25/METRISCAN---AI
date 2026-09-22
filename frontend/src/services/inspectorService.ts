import { authService } from "./authService";
import type { ComplianceRule, RuleRequest } from "../types/platform";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const inspectorService = {
  // ==========================================================================
  // READ-ONLY STATUTORY RULES
  // ==========================================================================
  async getRules(params?: {
    search?: string;
    category?: string;
    severity?: string;
    active_only?: boolean;
  }): Promise<ComplianceRule[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category && params.category !== "ALL") query.set("category", params.category);
    if (params?.severity && params.severity !== "ALL") query.set("severity", params.severity);
    if (params?.active_only) query.set("active_only", "true");

    const qs = query.toString();
    const url = `${BACKEND_URL}/api/inspector/rules${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch rules (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  // ==========================================================================
  // RULE REQUESTS (SUBMISSION & MY REQUESTS)
  // ==========================================================================
  async submitRuleRequest(payload: {
    rule_id?: string | null;
    rule_code?: string | null;
    request_type: string;
    subject: string;
    description: string;
    evidence_url?: string | null;
  }): Promise<RuleRequest> {
    const res = await fetch(`${BACKEND_URL}/api/inspector/rule-requests`, {
      method: "POST",
      headers: {
        ...authService.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = typeof err.detail === "string"
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : `Failed to submit rule request (${res.status})`;
      throw new Error(errorMsg);
    }

    const json = await res.json();
    return json.data;
  },

  async getMyRuleRequests(): Promise<RuleRequest[]> {
    const res = await fetch(`${BACKEND_URL}/api/inspector/rule-requests`, {
      headers: authService.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = typeof err.detail === "string"
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : `Failed to fetch your rule requests (${res.status})`;
      throw new Error(errorMsg);
    }

    const json = await res.json();
    return json.data || [];
  },
};
