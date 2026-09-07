import type { OCRComplianceResponse } from "./compliance";

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  productName: string;
  category: string;
  score: number;
  status: "PASS" | "FAIL" | "REVIEW" | string;
  filename: string;
  previewUrl?: string;
  fullData: OCRComplianceResponse;
}

export interface ScanFilterOptions {
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  sortBy: "newest" | "oldest" | "highest_score" | "lowest_score";
}

export interface DashboardStats {
  totalScans: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  averageScore: number;
}
