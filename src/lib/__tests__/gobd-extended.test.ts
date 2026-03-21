import { describe, it, expect } from "vitest";
import { computeReceiptHash, computeTripHash } from "../gobd";

describe("computeReceiptHash – extended", () => {
  it("handles special characters in vendor name", () => {
    const hash = computeReceiptHash({
      date: "2024-03-15",
      total_amount: 42,
      vendor_name: 'Café "Müller" & Söhne <GmbH>',
      image_path: "test.jpg",
      vat_positions: [],
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles empty VAT positions", () => {
    const hash = computeReceiptHash({
      date: "2024-03-15",
      total_amount: 10,
      vendor_name: "V",
      image_path: "test.jpg",
      vat_positions: [],
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles large VAT positions array", () => {
    const vat = Array.from({ length: 50 }, (_, i) => ({
      rate: i % 2 === 0 ? 0.19 : 0.07,
      net: 100 + i,
      vat: 19 + i,
      gross: 119 + i,
    }));
    const hash = computeReceiptHash({
      date: "2024-03-15",
      total_amount: 1000,
      vendor_name: "V",
      image_path: "test.jpg",
      vat_positions: vat,
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hash when VAT positions change", () => {
    const base = {
      date: "2024-03-15",
      total_amount: 42,
      vendor_name: "V",
      image_path: "test.jpg",
    };
    const hash1 = computeReceiptHash({ ...base, vat_positions: [{ rate: 0.19, net: 35, vat: 7, gross: 42 }] });
    const hash2 = computeReceiptHash({ ...base, vat_positions: [{ rate: 0.07, net: 39, vat: 3, gross: 42 }] });
    expect(hash1).not.toBe(hash2);
  });

  it("is deterministic across calls with same data", () => {
    const receipt = {
      date: "2024-03-15",
      total_amount: 42.5,
      vendor_name: "Vendor",
      image_path: "path.jpg",
      vat_positions: [{ rate: 0.19, net: 35, vat: 7, gross: 42 }],
    };
    const hashes = Array.from({ length: 10 }, () => computeReceiptHash(receipt));
    expect(new Set(hashes).size).toBe(1);
  });
});

describe("computeTripHash – extended", () => {
  const baseTrip = {
    id: "trip-1",
    destination: "Berlin",
    start_datetime: "2024-03-15T08:00:00",
    end_datetime: "2024-03-17T18:00:00",
    meal_deductions: [],
  };

  it("handles null meal_deductions", () => {
    const hash = computeTripHash(
      { ...baseTrip, meal_deductions: null },
      [],
      []
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles special characters in destination", () => {
    const hash = computeTripHash(
      { ...baseTrip, destination: 'München "Hauptstadt" & Co.' },
      [],
      []
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is order-independent for receipts (sorted by hash)", () => {
    const receipts = [
      { content_hash: "bbb" },
      { content_hash: "aaa" },
      { content_hash: "ccc" },
    ];
    const reversed = [...receipts].reverse();

    const hash1 = computeTripHash(baseTrip, receipts, []);
    const hash2 = computeTripHash(baseTrip, reversed, []);
    expect(hash1).toBe(hash2);
  });

  it("is order-independent for mileage (sorted)", () => {
    const mileage = [
      { date: "2024-03-16", distance_km: 100, total_amount: 30 },
      { date: "2024-03-15", distance_km: 200, total_amount: 60 },
    ];
    const reversed = [...mileage].reverse();

    const hash1 = computeTripHash(baseTrip, [], mileage);
    const hash2 = computeTripHash(baseTrip, [], reversed);
    expect(hash1).toBe(hash2);
  });

  it("changes when mileage amount changes", () => {
    const hash1 = computeTripHash(baseTrip, [], [{ date: "2024-03-15", distance_km: 100, total_amount: 30 }]);
    const hash2 = computeTripHash(baseTrip, [], [{ date: "2024-03-15", distance_km: 100, total_amount: 31 }]);
    expect(hash1).not.toBe(hash2);
  });

  it("handles receipts with null content_hash", () => {
    const hash = computeTripHash(baseTrip, [{ content_hash: null }, { content_hash: "abc" }], []);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
