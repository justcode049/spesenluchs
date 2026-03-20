import { createHash } from "crypto";

export function computeReceiptHash(receipt: {
  date: string | null;
  total_amount: number | null;
  vendor_name: string | null;
  image_path: string;
  vat_positions: unknown;
}): string {
  const data = [
    receipt.date ?? "",
    String(receipt.total_amount ?? ""),
    receipt.vendor_name ?? "",
    receipt.image_path,
    JSON.stringify(receipt.vat_positions ?? []),
  ].join("|");

  return createHash("sha256").update(data).digest("hex");
}

export function computeTripHash(
  trip: {
    id: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    meal_deductions: unknown;
  },
  receipts: { content_hash: string | null }[],
  mileageEntries: {
    date: string;
    distance_km: number;
    total_amount: number;
  }[]
): string {
  const tripData = [
    trip.id,
    trip.destination,
    trip.start_datetime,
    trip.end_datetime,
    JSON.stringify(trip.meal_deductions ?? []),
  ].join("|");

  const receiptHashes = receipts
    .map((r) => r.content_hash ?? "")
    .sort()
    .join("|");

  const mileageData = mileageEntries
    .map((m) => `${m.date}:${m.distance_km}:${m.total_amount}`)
    .sort()
    .join("|");

  const fullData = [tripData, receiptHashes, mileageData].join("||");
  return createHash("sha256").update(fullData).digest("hex");
}
