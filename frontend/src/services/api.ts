import type { OCRResponse, ProductData, OCRDetail } from "../types/ocr";

export type { ProductData, OCRDetail, OCRResponse };

const HF_SPACE_URL =
  "https://Mohanbankuru-metriscan-ai.hf.space";

export async function checkBackendHealth(): Promise<{
  status: string;
  online: boolean;
}> {
  try {
    const response = await fetch(HF_SPACE_URL);

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
