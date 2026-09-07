import type { OCRResponse, ProductData, OCRDetail } from "../types/ocr";

export type { ProductData, OCRDetail, OCRResponse };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function checkBackendHealth(): Promise<{ status: string; online: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      return { status: data.status || "healthy", online: true };
    }
    return { status: "offline", online: false };
  } catch {
    return { status: "offline", online: false };
  }
}

export async function processOCR(file: File): Promise<OCRResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/ocr/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "OCR processing failed");
  }

  return response.json();
}