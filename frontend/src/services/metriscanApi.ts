import { Client, handle_file } from "@gradio/client";
import type { OCRResponse } from "./api";

const SPACE_ID = "Mohanbankuru/metriscan-ai";

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Client.connect(SPACE_ID);
  }

  return clientPromise;
}

export async function processOCR(file: File): Promise<OCRResponse> {
  const client = await getClient();

  const result = await client.predict("/process_image", [
    handle_file(file),
  ]);

  const responseData = result.data as unknown[];

  if (!responseData || responseData.length === 0) {
    throw new Error("Metriscan AI returned an empty result.");
  }

  return responseData[0] as OCRResponse;
}
