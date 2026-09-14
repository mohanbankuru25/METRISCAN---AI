import { authService } from "./authService";
import type { ReportItem } from "../types/platform";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

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

export async function viewReportPdf(idOrInspectionId: string): Promise<void> {
  let response = await fetch(`${BACKEND_URL}/api/reports/${idOrInspectionId}/pdf?inline=true`, {
    headers: authService.getAuthHeaders(),
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BACKEND_URL}/api/reports/inspection/${idOrInspectionId}/pdf?inline=true`, {
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
  customFilename?: string
): Promise<void> {
  let response = await fetch(
    `${BACKEND_URL}/api/reports/${reportId}/${format}`,
    {
      headers: authService.getAuthHeaders(),
    }
  );

  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${BACKEND_URL}/api/reports/download/${reportId}?format=${format}`,
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
  let filename = customFilename || `Legal_Metrology_Report_${reportId}.${format}`;
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

export async function downloadReportPdf(payload: any, customFilename?: string): Promise<void> {
  // If payload has an inspection ID or is already in Supabase, retrieve stored report
  const scanId = payload?.id || payload?.inspection_id || payload?.inspection_number;
  if (scanId) {
    try {
      await downloadStoredReport(scanId, "pdf", customFilename);
      return;
    } catch (e) {
      console.warn("Notice: Stored report download failed, falling back to ad-hoc generation:", e);
    }
  }

  const response = await fetch(`${BACKEND_URL}/api/reports/pdf`, {
    method: "POST",
    headers: authService.getAuthHeaders(),
    body: JSON.stringify(payload),
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
  let filename = customFilename || "Legal_Metrology_Compliance_Report.pdf";
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

export async function downloadReportDocx(payload: any, customFilename?: string): Promise<void> {
  const scanId = payload?.id || payload?.inspection_id || payload?.inspection_number;
  if (scanId) {
    try {
      await downloadStoredReport(scanId, "docx", customFilename);
      return;
    } catch (e) {
      console.warn("Notice: Stored report download failed, falling back to ad-hoc generation:", e);
    }
  }

  const response = await fetch(`${BACKEND_URL}/api/reports/docx`, {
    method: "POST",
    headers: authService.getAuthHeaders(),
    body: JSON.stringify(payload),
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
  let filename = customFilename || "Legal_Metrology_Compliance_Report.docx";
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
  viewReportPdf,
  downloadStoredReport,
  downloadReportPdf,
  downloadReportDocx,
};
