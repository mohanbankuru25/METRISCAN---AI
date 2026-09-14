const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const CONSUMER_TOKEN_KEY = "metriscan_consumer_token";

export interface ConsumerUser {
  id: string;
  auth_user_id?: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  role: "consumer";
}

export interface ConsumerScanItem {
  id: string;
  product_name: string;
  category?: string;
  brand?: string;
  barcode?: string;
  manufacturer?: string;
  marketed_by?: string;
  country_of_origin?: string;
  consumer_contact?: string;
  manufacturing_date?: string;
  packed_on?: string;
  expiry_date?: string;
  best_before?: string;
  batch_number?: string;
  mrp?: string;
  net_quantity?: string;
  fssai_license?: string;
  expiry_status?: "VALID" | "EXPIRED" | "UNDETERMINED";
  is_expired?: boolean;
  ingredients?: Array<{
    order: number;
    name: string;
    percentage?: string | null;
    percentage_value?: number | null;
  }>;
  has_explicit_percentages?: boolean;
  ingredient_note?: string;
  highest_ingredient?: string;
  nutrition_data?: Record<string, string>;
  allergens?: string[];
  warnings?: string[];
  recommendations?: Array<{
    category: string;
    text: string;
  }>;
  legal_compliance_status?: "PASS" | "FAIL" | "REVIEW";
  compliance_score?: number;
  image_url?: string;
  language?: string;
  scan_type?: "SINGLE_SCAN" | "MULTI_SCAN" | string;
  multi_scan_session_id?: string;
  created_at: string;
}

export interface ConsumerIssueItem {
  id: string;
  category: string;
  product_name: string;
  description: string;
  barcode?: string;
  lot_number?: string;
  image_storage_path?: string;
  audio_storage_path?: string;
  image_url?: string;
  audio_url?: string;
  location_latitude?: number;
  location_longitude?: number;
  location_accuracy?: number;
  location_address?: string;
  confirmations_count?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  language?: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CommunityIssueItem {
  id: string;
  product_name: string;
  brand?: string;
  description: string;
  category?: string;
  barcode?: string;
  lot_number?: string;
  image_url?: string;
  location_label: string;
  location_display?: string;
  distance_km?: number | null;
  confirmations_count: number;
  has_confirmed?: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  status: string;
  created_at: string;
}


export const consumerService = {
  getToken(): string | null {
    return localStorage.getItem(CONSUMER_TOKEN_KEY);
  },

  setSession(token: string) {
    localStorage.setItem(CONSUMER_TOKEN_KEY, token);
  },

  clearSession() {
    localStorage.removeItem(CONSUMER_TOKEN_KEY);
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  async signup(data: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ user: ConsumerUser; access_token: string }> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || "Registration failed");
    }
    this.setSession(result.access_token);
    return result;
  },

  async login(username: string, password: string): Promise<{ user: ConsumerUser; access_token: string }> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || "Invalid username or password");
    }
    this.setSession(result.access_token);
    return result;
  },

  async getCurrentUser(): Promise<ConsumerUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_URL}/api/consumer/auth/me`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        this.clearSession();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async updateProfile(data: { full_name?: string; phone?: string }): Promise<ConsumerUser> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/profile`, {
      method: "PUT",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Failed to update profile");
    return result.user;
  },

  async scanProduct(formData: FormData, language = "en"): Promise<ConsumerScanItem> {
    if (!formData.has("language")) {
      formData.append("language", language);
    }
    const res = await fetch(`${BACKEND_URL}/api/consumer/scan`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Product scan failed");
    return result;
  },

  async downloadConsumerReport(scanId: string, language = "en"): Promise<Blob> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/scans/${scanId}/report/pdf?lang=${language}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to download consumer report PDF");
    }
    return await res.blob();
  },

  async getScans(limit = 20, offset = 0): Promise<ConsumerScanItem[]> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/scans?limit=${limit}&offset=${offset}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch scans");
    const data = await res.json();
    return data.items || [];
  },

  async getScanDetail(id: string): Promise<ConsumerScanItem> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/scans/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch scan detail");
    return await res.json();
  },

  async submitIssue(formData: FormData): Promise<ConsumerIssueItem> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/issues`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Failed to submit issue");
    return result;
  },

  async getIssues(limit = 20, offset = 0): Promise<ConsumerIssueItem[]> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/issues?limit=${limit}&offset=${offset}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch issues");
    const data = await res.json();
    return data.items || [];
  },

  async getIssueDetail(id: string): Promise<ConsumerIssueItem> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/issues/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch issue detail");
    return await res.json();
  },

  async getCommunityFeed(params?: { lat?: number; lng?: number; radius_km?: number; limit?: number }): Promise<CommunityIssueItem[]> {
    const q = new URLSearchParams();
    if (params?.lat !== undefined) q.append("lat", params.lat.toString());
    if (params?.lng !== undefined) q.append("lng", params.lng.toString());
    if (params?.radius_km !== undefined) q.append("radius_km", params.radius_km.toString());
    if (params?.limit !== undefined) q.append("limit", params.limit.toString());

    const res = await fetch(`${BACKEND_URL}/api/consumer/community-feed?${q.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch community issue feed");
    const data = await res.json();
    return data.items || [];
  },

  async confirmCommunityIssue(issueId: string): Promise<{ success: boolean; confirmations_count: number; priority: string; message: string }> {
    const res = await fetch(`${BACKEND_URL}/api/consumer/issues/${issueId}/confirm`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || "Failed to confirm issue");
    }
    return result;
  },


  // Admin consumer oversight endpoints (calls with Admin token)
  async getAdminScanIssues(params: { status?: string; priority?: string; search?: string; limit?: number; offset?: number } = {}) {
    const token = localStorage.getItem("metriscan_access_token");
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.priority) q.append("priority", params.priority);
    if (params.search) q.append("search", params.search);
    if (params.limit) q.append("limit", params.limit.toString());
    if (params.offset) q.append("offset", params.offset.toString());

    const res = await fetch(`${BACKEND_URL}/api/admin/consumer-scan-issues?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch scan issues");
    return await res.json();
  },

  async updateAdminScanIssue(issueId: string, status: string, adminNotes?: string) {
    const token = localStorage.getItem("metriscan_access_token");
    const res = await fetch(`${BACKEND_URL}/api/admin/consumer-scan-issues/${issueId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });
    if (!res.ok) throw new Error("Failed to update scan issue");
    return await res.json();
  },

  async getAdminUserIssues(params: { status?: string; category?: string; search?: string; limit?: number; offset?: number } = {}) {
    const token = localStorage.getItem("metriscan_access_token");
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.category) q.append("category", params.category);
    if (params.search) q.append("search", params.search);
    if (params.limit) q.append("limit", params.limit.toString());
    if (params.offset) q.append("offset", params.offset.toString());

    const res = await fetch(`${BACKEND_URL}/api/admin/consumer-issues?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch user issues");
    return await res.json();
  },

  async updateAdminUserIssue(issueId: string, status: string, adminNotes?: string) {
    const token = localStorage.getItem("metriscan_access_token");
    const res = await fetch(`${BACKEND_URL}/api/admin/consumer-issues/${issueId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });
    if (!res.ok) throw new Error("Failed to update user issue");
    return await res.json();
  },
};
