import { authService } from "./authService";
import type { ReportItem } from "../types/platform";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function getPreferredLanguage(overrideLang?: string): string {
  if (overrideLang) return overrideLang.toLowerCase();
  try {
    const saved = localStorage.getItem("metriscan_preferred_language");
    if (saved && ["en", "hi", "mr", "te", "ta", "kn"].includes(saved.toLowerCase())) {
      return saved.toLowerCase();
    }
  } catch {
    // Ignore storage errors
  }
  return "en";
}

export async function getReportsList(search?: string): Promise<ReportItem[]> {
  const query = new URLSearchParams();
  if (search) query.set("search", search);

  const response = await fetch(`${BACKEND_URL}/api/reports/?${query.toString()}`, {
    headers: authService.getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load reports repository (${response.status})`);
  }

  const json = await response.json();
  return json.data || [];
}

export async function viewReportPdf(idOrInspectionId: string, language?: string): Promise<void> {
  const lang = getPreferredLanguage(language);
  let response = await fetch(`${BACKEND_URL}/api/reports/${idOrInspectionId}/pdf?inline=true&lang=${lang}`, {
    headers: authService.getAuthHeaders(),
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BACKEND_URL}/api/reports/inspection/${idOrInspectionId}/pdf?inline=true&lang=${lang}`, {
      headers: authService.getAuthHeaders(),
    });
  }

  if (!response.ok) {
    let message = `Unable to open inspection compliance report (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) message = err.detail;
    } catch {
      // fallback
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const blobUrl = window.URL.createObjectURL(pdfBlob);
  const reportWindow = window.open(blobUrl, "_blank");
  if (!reportWindow) {
    window.location.href = blobUrl;
  }
}

export async function downloadStoredReport(
  reportId: string,
  format: "pdf" | "docx" = "pdf",
  customFilename?: string,
  language?: string
): Promise<void> {
  const lang = getPreferredLanguage(language);
  let response = await fetch(
    `${BACKEND_URL}/api/reports/${reportId}/${format}?lang=${lang}`,
    {
      headers: authService.getAuthHeaders(),
    }
  );

  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${BACKEND_URL}/api/reports/download/${reportId}?format=${format}&lang=${lang}`,
      {
        headers: authService.getAuthHeaders(),
      }
    );
  }

  if (!response.ok) {
    let message = `Failed to download certified report (${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) message = err.detail;
    } catch {
      // Use fallback
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const mediaType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const typedBlob = new Blob([blob], { type: mediaType });
  const url = window.URL.createObjectURL(typedBlob);
  const a = document.createElement("a");
  a.href = url;

  const disposition = response.headers.get("Content-Disposition");
  let filename = customFilename || `Legal_Metrology_Report_${reportId}_${lang}.${format}`;
  if (!customFilename && disposition && disposition.includes("filename=")) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, "");
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function downloadReportPdf(payload: any, customFilename?: string, language?: string): Promise<void> {
  const lang = getPreferredLanguage(language);
  // If payload has an inspection ID or is already in Supabase, retrieve stored report
  const scanId = payload?.id || payload?.inspection_id || payload?.inspection_number;
  if (scanId) {
    try {
      await downloadStoredReport(scanId, "pdf", customFilename, lang);
      return;
    } catch (e) {
      console.warn("Notice: Stored report download failed, falling back to ad-hoc generation:", e);
    }
  }

  const reqPayload = { ...payload, language: lang };
  const response = await fetch(`${BACKEND_URL}/api/reports/pdf?lang=${lang}`, {
    method: "POST",
    headers: {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqPayload),
  });

  if (!response.ok) {
    let message = `Failed to generate PDF report (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) message = err.detail;
    } catch {
      // Use fallback error message
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const disposition = response.headers.get("Content-Disposition");
  let filename = customFilename || `Legal_Metrology_Compliance_Report_${lang}.pdf`;
  if (!customFilename && disposition && disposition.includes("filename=")) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, "");
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function downloadReportDocx(payload: any, customFilename?: string, language?: string): Promise<void> {
  const lang = getPreferredLanguage(language);
  const scanId = payload?.id || payload?.inspection_id || payload?.inspection_number;
  if (scanId) {
    try {
      await downloadStoredReport(scanId, "docx", customFilename, lang);
      return;
    } catch (e) {
      console.warn("Notice: Stored report download failed, falling back to ad-hoc generation:", e);
    }
  }

  const reqPayload = { ...payload, language: lang };
  const response = await fetch(`${BACKEND_URL}/api/reports/docx?lang=${lang}`, {
    method: "POST",
    headers: {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqPayload),
  });

  if (!response.ok) {
    let message = `Failed to generate DOCX report (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) message = err.detail;
    } catch {
      // Use fallback error message
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const disposition = response.headers.get("Content-Disposition");
  let filename = customFilename || `Legal_Metrology_Compliance_Report_${lang}.docx`;
  if (!customFilename && disposition && disposition.includes("filename=")) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, "");
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export const reportService = {
  getReports: getReportsList,
  getReportsList,
  getPreferredLanguage,
  viewReportPdf,
  downloadStoredReport,
  downloadReportPdf,
  downloadReportDocx,
};
