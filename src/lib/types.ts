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
  trip_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealDeduction {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export type TripStatus = "draft" | "confirmed";

export interface Trip {
  id: string;
  user_id: string;
  title: string | null;
  purpose: string | null;
  destination: string;
  country: string;
  start_datetime: string;
  end_datetime: string;
  meal_deductions: MealDeduction[];
  status: TripStatus;
  created_at: string;
  updated_at: string;
}

export interface DayAllowance {
  date: string;
  hours: number;
  base_allowance: number;
  breakfast_deduction: number;
  lunch_deduction: number;
  dinner_deduction: number;
  net_allowance: number;
  is_arrival_departure: boolean;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
