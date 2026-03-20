import { describe, it, expect } from "vitest";
import { computeReceiptHash, computeTripHash } from "../gobd";

describe("computeReceiptHash", () => {
  const baseReceipt = {
    date: "2026-03-15",
    total_amount: 42.5,
    vendor_name: "Restaurant Zum Wirt",
    image_path: "user123/receipt1.jpg",
    vat_positions: [{ rate: 0.19, net: 35.71, vat: 6.79, gross: 42.5 }],
  };

  it("produces a consistent SHA-256 hash", () => {
    const hash1 = computeReceiptHash(baseReceipt);
    const hash2 = computeReceiptHash(baseReceipt);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different data", () => {
    const hash1 = computeReceiptHash(baseReceipt);
    const hash2 = computeReceiptHash({ ...baseReceipt, total_amount: 43.0 });
    expect(hash1).not.toBe(hash2);
  });

  it("handles null values", () => {
    const hash = computeReceiptHash({
      date: null,
      total_amount: null,
      vendor_name: null,
      image_path: "user/file.jpg",
      vat_positions: [],
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when vendor_name changes", () => {
    const hash1 = computeReceiptHash(baseReceipt);
    const hash2 = computeReceiptHash({ ...baseReceipt, vendor_name: "Anderes Restaurant" });
    expect(hash1).not.toBe(hash2);
  });

  it("changes when image_path changes", () => {
    const hash1 = computeReceiptHash(baseReceipt);
    const hash2 = computeReceiptHash({ ...baseReceipt, image_path: "user123/other.jpg" });
    expect(hash1).not.toBe(hash2);
  });
});

describe("computeTripHash", () => {
  const baseTrip = {
    id: "trip-1",
    destination: "München",
    start_datetime: "2026-03-10T08:00:00",
    end_datetime: "2026-03-12T18:00:00",
    meal_deductions: [{ date: "2026-03-10", breakfast: false, lunch: true, dinner: false }],
  };

  const receipts = [
    { content_hash: "abc123" },
    { content_hash: "def456" },
  ];

  const mileage = [
    { date: "2026-03-10", distance_km: 150, total_amount: 45.0 },
  ];

  it("produces a consistent SHA-256 hash", () => {
    const hash1 = computeTripHash(baseTrip, receipts, mileage);
    const hash2 = computeTripHash(baseTrip, receipts, mileage);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when trip data changes", () => {
    const hash1 = computeTripHash(baseTrip, receipts, mileage);
    const hash2 = computeTripHash({ ...baseTrip, destination: "Berlin" }, receipts, mileage);
    expect(hash1).not.toBe(hash2);
  });

  it("changes when receipts change", () => {
    const hash1 = computeTripHash(baseTrip, receipts, mileage);
    const hash2 = computeTripHash(baseTrip, [{ content_hash: "xyz" }], mileage);
    expect(hash1).not.toBe(hash2);
  });

  it("changes when mileage changes", () => {
    const hash1 = computeTripHash(baseTrip, receipts, mileage);
    const hash2 = computeTripHash(baseTrip, receipts, [
      { date: "2026-03-10", distance_km: 200, total_amount: 60.0 },
    ]);
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty receipts and mileage", () => {
    const hash = computeTripHash(baseTrip, [], []);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("receipt order does not matter (sorted)", () => {
    const hash1 = computeTripHash(baseTrip, [{ content_hash: "aaa" }, { content_hash: "bbb" }], []);
    const hash2 = computeTripHash(baseTrip, [{ content_hash: "bbb" }, { content_hash: "aaa" }], []);
    expect(hash1).toBe(hash2);
  });
});
