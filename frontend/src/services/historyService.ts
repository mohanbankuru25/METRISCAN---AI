import { authService } from "./authService";
import type { ScanHistoryItem, DashboardStats, ScanFilterOptions } from "../types/history";
import type { InspectionRecord } from "../types/platform";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function mapInspectionToScanItem(record: InspectionRecord): ScanHistoryItem {
  let product = (record as any).product || (record as any).products || {};
  if (Array.isArray(product) && product.length > 0) {
    product = product[0];
  } else if (!product || typeof product !== "object") {
    product = {};
  }
  const ocrResults = record.ocr_results && record.ocr_results[0] ? record.ocr_results[0] : null;
  const complianceResults = (record as any).compliance_results || [];

  return {
    id: record.id,
    timestamp: record.inspection_date || record.created_at || new Date().toISOString(),
    productName: product.product_name || "Not Detected",
    category: product.category || product.product_category || "General",
    score: record.compliance_score ?? 0,
    status: record.status || "REVIEW",
    filename: record.inspection_number || record.id.substring(0, 8),
    previewUrl: record.image_url || undefined,
    fullData: {
      id: record.id,
      inspection_id: record.inspection_number || record.id,
      inspection_number: record.inspection_number || record.id,
      filename: record.inspection_number || record.id.substring(0, 8),
      processed_image: undefined,
      text: ocrResults?.text_blocks ? ocrResults.text_blocks.map((b: any) => b.text || "") : [],
      ocr_details: ocrResults?.text_blocks || [],
      product_data: product,
      compliance: {
        overall_status: record.status,
        compliance_score: record.compliance_score ?? 0,
        score: record.compliance_score ?? 0,
        results: complianceResults,
      },
    } as any,
    scanType: (record as any).scan_type || "SINGLE_SCAN",
    multiScanSessionId: (record as any).multi_scan_session_id || undefined,
  };
}

export const historyService = {
  async getScans(filters?: Partial<ScanFilterOptions>): Promise<ScanHistoryItem[]> {
    try {
      const query = new URLSearchParams();
      query.set("limit", "100");

      if (filters?.statusFilter && filters.statusFilter !== "ALL") {
        query.set("status", filters.statusFilter);
      }
      if (filters?.searchQuery) {
        query.set("search", filters.searchQuery);
      }

      const res = await fetch(`${BACKEND_URL}/api/inspections/?${query.toString()}`, {
        headers: authService.getAuthHeaders(),
      });

      if (!res.ok) {
        console.warn(`Failed to load inspections (${res.status})`);
        return [];
      }

      const json = await res.json();
      const records: InspectionRecord[] = json.data || [];

      let items = records.map(mapInspectionToScanItem);

      if (filters?.categoryFilter && filters.categoryFilter !== "ALL") {
        items = items.filter(
          (i) => i.category.toLowerCase() === filters.categoryFilter?.toLowerCase()
        );
      }

      if (filters?.sortBy === "oldest") {
        items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      } else if (filters?.sortBy === "highest_score") {
        items.sort((a, b) => b.score - a.score);
      } else if (filters?.sortBy === "lowest_score") {
        items.sort((a, b) => a.score - b.score);
      } else {
        // Default: newest
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      return items;
    } catch (err) {
      console.error("Error fetching inspections from Supabase:", err);
      return [];
    }
  },

  async filterScans(filters?: Partial<ScanFilterOptions>): Promise<ScanHistoryItem[]> {
    return this.getScans(filters);
  },

  async getScanById(id: string): Promise<ScanHistoryItem | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/inspections/${id}`, {
        headers: authService.getAuthHeaders(),
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const record: InspectionRecord = json.data;
      if (!record) return null;

      const scan = mapInspectionToScanItem(record);

      if (record.visual_analysis && record.visual_analysis[0]) {
        scan.fullData.visual_analysis = record.visual_analysis[0].raw_analysis || record.visual_analysis[0];
      }

      if (record.inspection_evidence && record.inspection_evidence[0]) {
        const ev = record.inspection_evidence[0];
        scan.previewUrl = ev.public_url || scan.previewUrl || undefined;
      }

      return scan;
    } catch (err) {
      console.error(`Error loading inspection ${id} from Supabase:`, err);
      return null;
    }
  },

  async getStats(): Promise<DashboardStats> {
    const scans = await this.getScans();
    const total = scans.length;
    const passed = scans.filter((s) => String(s.status).toUpperCase() === "PASS").length;
    const failed = scans.filter((s) => String(s.status).toUpperCase() === "FAIL").length;
    const review = scans.filter((s) => String(s.status).toUpperCase() === "REVIEW").length;

    const scores = scans.map((s) => s.score).filter((s) => s != null && !isNaN(s));
    const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

    return {
      totalScans: total,
      passCount: passed,
      failCount: failed,
      reviewCount: review,
      averageScore: avg,
    };
  },

  saveScan(_data: any, _previewUrl?: string): void {
    // Inspections are persisted automatically inside FastAPI directly to Supabase.
    // No browser localStorage caching needed.
  },

  deleteScan(_id: string): void {
    // Permanent deletion disallowed to maintain statutory audit trail.
  },
};
