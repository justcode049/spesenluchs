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

export type VehicleType = "car" | "motorcycle" | "ebike";

export const VEHICLE_RATES: Record<VehicleType, number> = {
  car: 0.30,
  motorcycle: 0.20,
  ebike: 0.20,
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: "PKW (0,30 €/km)",
  motorcycle: "Motorrad (0,20 €/km)",
  ebike: "E-Bike (0,20 €/km)",
};

export interface Mileage {
  id: string;
  user_id: string;
  trip_id: string | null;
  date: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  is_round_trip: boolean;
  notes: string | null;
  vehicle_type: VehicleType;
  rate_per_km: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
