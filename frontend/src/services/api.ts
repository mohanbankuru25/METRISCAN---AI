import type { OCRResponse, ProductData, OCRDetail } from "../types/ocr";

export type { ProductData, OCRDetail, OCRResponse };

// FastAPI backend
const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

import { authService } from "./authService";

// ---------------------------------------------------------
// Backend health check
// ---------------------------------------------------------
export async function checkBackendHealth(): Promise<{
  status: string;
  online: boolean;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);

    if (response.ok) {
      return {
        status: "healthy",
        online: true,
      };
    }

    return {
      status: "offline",
      online: false,
    };
  } catch {
    return {
      status: "offline",
      online: false,
    };
  }
}

// ---------------------------------------------------------
// Process packaged commodity image through Metriscan OCR
// pipeline
// ---------------------------------------------------------
export async function processOCR(file: File): Promise<OCRResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const headers: Record<string, string> = {};
  const token = authService.getToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}/api/ocr/`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let message = `OCR request failed with status ${response.status}`;

    try {
      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {
      // Keep the default error message
    }

    throw new Error(message);
  }

  return response.json();
}