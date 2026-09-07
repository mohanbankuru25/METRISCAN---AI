export interface ProductData {
  product_name: string | null;
  net_quantity: string | null;
  mrp: string | null;
  batch_number: string | null;
  packed_on: string | null;
  date_of_manufacture: string | null;
  best_before: string | null;
  use_by: string | null;
  expiry_date: string | null;
  manufacturer_or_packer: string | null;
  address: string | null;
  consumer_contact: string | null;
  license_number: string | null;
  ingredients: string | null;
  country_of_origin: string | null;
  marketed_by: string | null;
  product_category: string | null;
}

export interface OCRDetail {
  text: string;
  confidence: number | null;
  bbox: number[] | null;
}

export interface OCRResponse {
  filename: string;
  processed_image?: string;
  text: string[];
  ocr_details?: OCRDetail[];
  paddle_data?: ProductData;
  gemini_data?: ProductData | null;
  gemini_error?: string | null;
  product_data?: ProductData;
  recovered_fields?: string[];
  applicability?: unknown;
  compliance?: unknown;
}
