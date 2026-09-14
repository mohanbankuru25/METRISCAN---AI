const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface MultiScanImageItem {
  image_id: string;
  filename: string;
  side: "front" | "back" | "side" | "full";
}

export interface MultiScanProduct {
  product_id: string;
  group_id: string;
  display_title: string;
  primary_identity: string;
  product_name: string;
  brand?: string;
  barcode?: string;
  license_number?: string;
  batch_number?: string;
  mrp?: string;
  net_quantity?: string;
  mfg_date?: string;
  expiry_date?: string;
  manufacturer?: string;
  category?: string;
  overall_status?: "COMPLIANT" | "NON-COMPLIANT" | "REVIEW" | "PASS" | "FAIL";
  compliance_score?: number;
  analysis_status: "COMPLETED" | "FAILED";
  error_message?: string;
  identity_confidence?: number;
  is_merged_sides?: boolean;
  match_reason?: string;
  images: MultiScanImageItem[];
  inspection_id?: string;
  product_data?: Record<string, any>;
  compliance_result?: Record<string, any>;
  visual_analysis?: Record<string, any>;
  ocr_details?: any[];
}

export interface MultiScanComparisonRow {
  product_id: string;
  display_title: string;
  product_name: string;
  brand?: string;
  barcode?: string;
  batch_number?: string;
  license_number?: string;
  mrp?: string;
  net_quantity?: string;
  mfg_date?: string;
  expiry_date?: string;
  overall_status: string;
  compliance_score: number;
  is_merged_sides?: boolean;
}

export interface MultiScanSessionResult {
  id: string;
  created_by?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  total_images: number;
  total_products: number;
  completed_products: number;
  failed_products: number;
  products: MultiScanProduct[];
  comparison_data: MultiScanComparisonRow[];
  created_at: string;
  updated_at?: string;
}

export const multiScanService = {
  getAuthHeaders(): Record<string, string> {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("metriscan_consumer_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  async uploadAndAnalyze(files: File[], language: string = "en"): Promise<MultiScanSessionResult> {
    if (files.length > 5) {
      throw new Error("Maximum 5 images can be analyzed at once.");
    }
    if (files.length === 0) {
      throw new Error("Please select at least 1 image.");
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("language", language);

    const res = await fetch(`${BACKEND_URL}/api/multi-scan/analyze`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Multi-scan analysis failed" }));
      throw new Error(err.detail || `Server returned HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  async getSession(sessionId: string): Promise<MultiScanSessionResult> {
    const res = await fetch(`${BACKEND_URL}/api/multi-scan/${sessionId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to fetch session" }));
      throw new Error(err.detail || `Server returned HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  async downloadReport(sessionId: string, productId: string): Promise<Blob> {
    const res = await fetch(
      `${BACKEND_URL}/api/multi-scan/${sessionId}/products/${productId}/report`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to download report" }));
      throw new Error(err.detail || `Server returned HTTP ${res.status}`);
    }

    return await res.blob();
  },
};
