import { describe, it, expect } from "vitest";
import { generateEnventaPayload } from "../export-enventa";
import type { DayAllowance } from "../types";

function makeData(overrides?: Record<string, unknown>) {
  return {
    title: "Berlin Trip",
    destination: "Berlin",
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    userName: "Max",
    allowances: [] as DayAllowance[],
    receipts: [] as Array<{ date: string | null; vendor_name: string | null; total_amount: number | null; currency: string; receipt_type: string }>,
    mileage: [] as Array<{ date: string; start_location: string; end_location: string; total_amount: number }>,
    ...overrides,
  };
}

describe("generateEnventaPayload", () => {
  it("returns empty array for empty data", () => {
    const result = generateEnventaPayload(makeData());
    expect(result).toEqual([]);
  });

  it("maps hotel to account 4666", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "Hotel", total_amount: 120, currency: "EUR", receipt_type: "hotel" }],
    }));
    expect(result[0].konto).toBe("4666");
  });

  it("maps restaurant to account 4650", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "Rest", total_amount: 45, currency: "EUR", receipt_type: "restaurant" }],
    }));
    expect(result[0].konto).toBe("4650");
  });

  it("maps all transport types to 4670", () => {
    for (const type of ["taxi", "public_transport", "train", "flight"]) {
      const result = generateEnventaPayload(makeData({
        receipts: [{ date: "2024-03-15", vendor_name: "T", total_amount: 30, currency: "EUR", receipt_type: type }],
      }));
      expect(result[0].konto).toBe("4670");
    }
  });

  it("maps gas_station to 4530, parking to 4580", () => {
    const gas = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "T", total_amount: 50, currency: "EUR", receipt_type: "gas_station" }],
    }));
    expect(gas[0].konto).toBe("4530");

    const parking = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "T", total_amount: 10, currency: "EUR", receipt_type: "parking" }],
    }));
    expect(parking[0].konto).toBe("4580");
  });

  it("defaults unknown receipt types to 4670", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "X", total_amount: 10, currency: "EUR", receipt_type: "unknown_type" }],
    }));
    expect(result[0].konto).toBe("4670");
  });

  it("skips receipts with null amount", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: null, currency: "EUR", receipt_type: "other" }],
    }));
    expect(result).toEqual([]);
  });

  it("uses startDate when receipt date is null", () => {
    const result = generateEnventaPayload(makeData({
      startDate: "2024-03-15",
      receipts: [{ date: null, vendor_name: "V", total_amount: 10, currency: "EUR", receipt_type: "other" }],
    }));
    expect(result[0].datum).toBe("2024-03-15");
  });

  it("includes cost center in all entries", () => {
    const result = generateEnventaPayload(makeData({
      costCenter: "4711",
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 10, currency: "EUR", receipt_type: "other" }],
      mileage: [{ date: "2024-03-15", start_location: "A", end_location: "B", total_amount: 30 }],
    }));
    expect(result.every((b) => b.kostenstelle === "4711")).toBe(true);
  });

  it("uses gegenkonto 1590 for all entries", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 10, currency: "EUR", receipt_type: "other" }],
    }));
    expect(result[0].gegenkonto).toBe("1590");
  });

  it("generates mileage with account 4673", () => {
    const result = generateEnventaPayload(makeData({
      mileage: [{ date: "2024-03-15", start_location: "Hamburg", end_location: "Berlin", total_amount: 87 }],
    }));
    expect(result[0].konto).toBe("4673");
    expect(result[0].buchungstext).toContain("Hamburg-Berlin");
    expect(result[0].waehrung).toBe("EUR");
  });

  it("generates per diem entries with account 4668", () => {
    const result = generateEnventaPayload(makeData({
      allowances: [{
        date: "2024-03-15", hours: 24, base_allowance: 28,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 28, is_arrival_departure: false,
      }],
    }));
    expect(result[0].konto).toBe("4668");
    expect(result[0].betrag).toBe(28);
    expect(result[0].buchungstext).toContain("Verpflegungspauschale Berlin");
  });

  it("skips per diems with zero net_allowance", () => {
    const result = generateEnventaPayload(makeData({
      allowances: [{
        date: "2024-03-15", hours: 6, base_allowance: 0,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 0, is_arrival_departure: false,
      }],
    }));
    expect(result).toEqual([]);
  });

  it("truncates buchungstext to 60 chars", () => {
    const longName = "A".repeat(100);
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: longName, total_amount: 10, currency: "EUR", receipt_type: "other" }],
    }));
    expect(result[0].buchungstext.length).toBeLessThanOrEqual(60);
  });

  it("sets belegtyp to Reisekosten for all entries", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 10, currency: "EUR", receipt_type: "hotel" }],
      mileage: [{ date: "2024-03-15", start_location: "A", end_location: "B", total_amount: 30 }],
      allowances: [{ date: "2024-03-15", hours: 24, base_allowance: 28, breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0, net_allowance: 28, is_arrival_departure: false }],
    }));
    expect(result.every((b) => b.belegtyp === "Reisekosten")).toBe(true);
  });

  it("preserves receipt currency", () => {
    const result = generateEnventaPayload(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 50, currency: "USD", receipt_type: "other" }],
    }));
    expect(result[0].waehrung).toBe("USD");
  });
});
