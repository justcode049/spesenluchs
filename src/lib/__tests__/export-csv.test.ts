import { describe, it, expect } from "vitest";
import { generateCSV } from "../export-csv";

function makeData(overrides?: Record<string, unknown>) {
  return {
    title: "Berlin Trip",
    destination: "Berlin",
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    allowances: [],
    receipts: [],
    mileage: [],
    ...overrides,
  };
}

describe("generateCSV", () => {
  it("starts with UTF-8 BOM", () => {
    const csv = generateCSV(makeData());
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it("contains header section with title and period", () => {
    const csv = generateCSV(makeData());
    expect(csv).toContain("Reisekostenabrechnung");
    expect(csv).toContain("Reise;Berlin Trip");
  });

  it("includes cost center when provided", () => {
    const csv = generateCSV(makeData({ costCenter: "4711" }));
    expect(csv).toContain("Kostenstelle;4711");
  });

  it("omits cost center line when not provided", () => {
    const csv = generateCSV(makeData());
    expect(csv).not.toContain("Kostenstelle");
  });

  it("generates per diem section", () => {
    const csv = generateCSV(makeData({
      allowances: [{
        date: "2024-03-15", hours: 10, base_allowance: 14,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 14, is_arrival_departure: true,
      }],
    }));
    expect(csv).toContain("TAGESPAUSCHALEN");
    expect(csv).toContain("Datum;Stunden;Pauschale;Abzug Frühstück;Abzug Mittag;Abzug Abend;Netto");
    expect(csv).toContain("14.00");
  });

  it("calculates per diem total", () => {
    const csv = generateCSV(makeData({
      allowances: [
        { date: "2024-03-15", hours: 10, base_allowance: 14, breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0, net_allowance: 14, is_arrival_departure: true },
        { date: "2024-03-16", hours: 24, base_allowance: 28, breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0, net_allowance: 28, is_arrival_departure: false },
      ],
    }));
    expect(csv).toContain("42.00");
  });

  it("generates receipt section", () => {
    const csv = generateCSV(makeData({
      receipts: [{
        date: "2024-03-15", vendor_name: "Hotel Adlon",
        total_amount: 120.50, currency: "EUR",
        receipt_type: "hotel", vendor_city: "Berlin",
      }],
    }));
    expect(csv).toContain("BELEGE");
    expect(csv).toContain("Datum;Händler;Stadt;Belegart;Betrag;Währung");
    expect(csv).toContain("Hotel Adlon");
    expect(csv).toContain("120.50");
  });

  it("handles null receipt fields", () => {
    const csv = generateCSV(makeData({
      receipts: [{
        date: null, vendor_name: null,
        total_amount: null, currency: "EUR",
        receipt_type: "other", vendor_city: null,
      }],
    }));
    expect(csv).toContain("BELEGE");
    // Should not throw
  });

  it("generates mileage section when present", () => {
    const csv = generateCSV(makeData({
      mileage: [{
        date: "2024-03-15", start_location: "Hamburg", end_location: "Berlin",
        distance_km: 290, is_round_trip: false, vehicle_type: "car",
        rate_per_km: 0.30, total_amount: 87,
      }],
    }));
    expect(csv).toContain("FAHRTEN");
    expect(csv).toContain("Hamburg");
    expect(csv).toContain("Berlin");
    expect(csv).toContain("290.0");
    expect(csv).toContain("Nein"); // not round trip
  });

  it("doubles km for round trips", () => {
    const csv = generateCSV(makeData({
      mileage: [{
        date: "2024-03-15", start_location: "A", end_location: "B",
        distance_km: 100, is_round_trip: true, vehicle_type: "car",
        rate_per_km: 0.30, total_amount: 60,
      }],
    }));
    expect(csv).toContain("200.0"); // 100 * 2
    expect(csv).toContain("Ja"); // round trip
  });

  it("omits mileage section when empty", () => {
    const csv = generateCSV(makeData({ mileage: [] }));
    expect(csv).not.toContain("FAHRTEN");
  });

  it("calculates grand total", () => {
    const csv = generateCSV(makeData({
      allowances: [{ date: "2024-03-15", hours: 24, base_allowance: 28, breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0, net_allowance: 28, is_arrival_departure: false }],
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 100, currency: "EUR", receipt_type: "other", vendor_city: null }],
      mileage: [{ date: "2024-03-15", start_location: "A", end_location: "B", distance_km: 50, is_round_trip: false, vehicle_type: "car", rate_per_km: 0.30, total_amount: 15 }],
    }));
    expect(csv).toContain("GESAMTBETRAG;143.00 EUR");
  });

  it("escapes semicolons and quotes in CSV fields", () => {
    const csv = generateCSV(makeData({
      receipts: [{
        date: "2024-03-15", vendor_name: 'Hotel "Zur; Linde"',
        total_amount: 100, currency: "EUR", receipt_type: "hotel", vendor_city: null,
      }],
    }));
    // Semicolons and quotes should be escaped
    expect(csv).toContain('""');
  });

  it("uses semicolons as delimiter", () => {
    const csv = generateCSV(makeData());
    expect(csv).toContain(";");
    // Should not use commas as delimiter
    expect(csv).not.toContain("Reise,");
  });
});
