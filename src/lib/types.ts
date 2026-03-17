export interface VatPosition {
  rate: number;
  net: number;
  vat: number;
  gross: number;
}

export interface ConfidenceScores {
  date: number;
  total_amount: number;
  vendor_name: number;
  vat_positions: number;
  receipt_type: number;
}

export interface ReceiptExtraction {
  date: string | null;
  total_amount: number | null;
  currency: string;
  vat_positions: VatPosition[];
  vendor_name: string | null;
  vendor_city: string | null;
  receipt_type: ReceiptType;
  confidence: ConfidenceScores;
}

export type ReceiptType =
  | "hotel"
  | "restaurant"
  | "taxi"
  | "public_transport"
  | "gas_station"
  | "parking"
  | "train"
  | "flight"
  | "other";

export type ReceiptStatus = "draft" | "confirmed";

export interface Receipt {
  id: string;
  user_id: string;
  image_path: string;
  date: string | null;
  total_amount: number | null;
  currency: string;
  vendor_name: string | null;
  vendor_city: string | null;
  receipt_type: ReceiptType;
  vat_positions: VatPosition[];
  confidence: ConfidenceScores;
  raw_extraction: ReceiptExtraction | null;
  status: ReceiptStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
