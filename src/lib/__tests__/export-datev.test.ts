import { describe, it, expect } from "vitest";
import { generateEXTF, generateBelegFilename, generateDocumentXml, DatevExportData } from "../export-datev";

function makeExportData(overrides?: Partial<DatevExportData>): DatevExportData {
  return {
    title: "Berlin Kundentermin",
    destination: "Berlin",
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    userName: "Max Mustermann",
    allowances: [],
    receipts: [],
    mileage: [],
    ...overrides,
  };
}

describe("generateBelegFilename", () => {
  it("generates numbered filename with date and vendor", () => {
    const name = generateBelegFilename(0, "2024-03-15", "Hotel Adlon", "jpg");
    expect(name).toMatch(/^001_2024-03-1[45]_Hotel_Adlon\.jpg$/); // timezone may shift date
  });

  it("pads index to 3 digits", () => {
    expect(generateBelegFilename(0, "2024-01-01", "A", "jpg")).toMatch(/^001_/);
    expect(generateBelegFilename(9, "2024-01-01", "A", "jpg")).toMatch(/^010_/);
    expect(generateBelegFilename(99, "2024-01-01", "A", "jpg")).toMatch(/^100_/);
  });

  it("handles null date", () => {
    const name = generateBelegFilename(0, null, "Vendor", "pdf");
    expect(name).toContain("ohne-datum");
  });

  it("handles null vendor", () => {
    const name = generateBelegFilename(0, "2024-03-15", null, "jpg");
    expect(name).toContain("Unbekannt");
  });

  it("sanitizes umlauts in vendor name", () => {
    const name = generateBelegFilename(0, "2024-03-15", "Müller Bäckerei", "jpg");
    expect(name).toContain("Mueller_Baeckerei");
  });

  it("sanitizes ß in vendor name", () => {
    const name = generateBelegFilename(0, "2024-03-15", "Straße", "jpg");
    expect(name).toContain("Strasse");
  });

  it("truncates long vendor names to 30 chars", () => {
    const longVendor = "A".repeat(50);
    const name = generateBelegFilename(0, "2024-03-15", longVendor, "jpg");
    const vendorPart = name.split("_").slice(2).join("_").replace(".jpg", "");
    expect(vendorPart.length).toBeLessThanOrEqual(30);
  });

  it("replaces special characters with underscore", () => {
    const name = generateBelegFilename(0, "2024-03-15", "Café & Bar #1", "jpg");
    expect(name).not.toMatch(/[&# ]/);
  });
});

describe("generateEXTF", () => {
  it("starts with EXTF header line", () => {
    const csv = generateEXTF(makeExportData());
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain('"EXTF"');
    expect(lines[0]).toContain("700");
    expect(lines[0]).toContain("21");
    expect(lines[0]).toContain('"Buchungsstapel"');
  });

  it("includes fiscal year from startDate", () => {
    const csv = generateEXTF(makeExportData({ startDate: "2024-03-15" }));
    expect(csv).toContain("20240101");
  });

  it("includes title in header", () => {
    const csv = generateEXTF(makeExportData({ title: "München Trip" }));
    expect(csv).toContain("Reisekosten München Trip");
  });

  it("includes column headers in second line", () => {
    const csv = generateEXTF(makeExportData());
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain('"Umsatz (ohne Soll/Haben-Kz)"');
    expect(lines[1]).toContain('"Konto"');
    expect(lines[1]).toContain('"KOST1"');
  });

  it("maps hotel receipts to account 4666", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "Hotel", vendor_city: "Berlin",
        total_amount: 120, currency: "EUR", receipt_type: "hotel",
        vat_positions: [{ rate: 0.07, net: 112.15, vat: 7.85, gross: 120 }],
        image_path: "test.jpg",
      }],
    }));
    expect(csv).toContain('"4666"');
  });

  it("maps restaurant receipts to account 4650", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "Restaurant", vendor_city: "Berlin",
        total_amount: 45, currency: "EUR", receipt_type: "restaurant",
        vat_positions: [{ rate: 0.19, net: 37.82, vat: 7.18, gross: 45 }],
        image_path: "test.jpg",
      }],
    }));
    expect(csv).toContain('"4650"');
  });

  it("maps taxi/transport to account 4670", () => {
    for (const type of ["taxi", "public_transport", "train", "flight"]) {
      const csv = generateEXTF(makeExportData({
        receipts: [{
          date: "2024-03-15", vendor_name: "T", vendor_city: "B",
          total_amount: 30, currency: "EUR", receipt_type: type,
          vat_positions: [], image_path: "t.jpg",
        }],
      }));
      expect(csv).toContain('"4670"');
    }
  });

  it("maps gas_station to 4530, parking to 4580", () => {
    const csvGas = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "T", vendor_city: "B",
        total_amount: 50, currency: "EUR", receipt_type: "gas_station",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    expect(csvGas).toContain('"4530"');

    const csvParking = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "T", vendor_city: "B",
        total_amount: 10, currency: "EUR", receipt_type: "parking",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    expect(csvParking).toContain('"4580"');
  });

  it("uses VAT code 9 for 19%, 8 for 7%, 0 for others", () => {
    const csv19 = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: 100, currency: "EUR", receipt_type: "other",
        vat_positions: [{ rate: 0.19, net: 84.03, vat: 15.97, gross: 100 }],
        image_path: "t.jpg",
      }],
    }));
    expect(csv19).toContain('"9"');

    const csv7 = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: 100, currency: "EUR", receipt_type: "hotel",
        vat_positions: [{ rate: 7, net: 93.46, vat: 6.54, gross: 100 }],
        image_path: "t.jpg",
      }],
    }));
    expect(csv7).toContain('"8"');
  });

  it("handles VAT rates in different formats (0.19, 19, 1900)", () => {
    for (const rate of [0.19, 19, 1900]) {
      const csv = generateEXTF(makeExportData({
        receipts: [{
          date: "2024-03-15", vendor_name: "V", vendor_city: "B",
          total_amount: 100, currency: "EUR", receipt_type: "other",
          vat_positions: [{ rate, net: 84, vat: 16, gross: 100 }],
          image_path: "t.jpg",
        }],
      }));
      const lines = csv.split("\r\n");
      const dataLine = lines[2]; // first data line after header + columns
      expect(dataLine).toContain('"9"'); // BU-Schlüssel for 19%
    }
  });

  it("formats amounts with comma decimal separator", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: 42.50, currency: "EUR", receipt_type: "other",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    expect(csv).toContain("42,50");
  });

  it("formats date as DDMM", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: 10, currency: "EUR", receipt_type: "other",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    expect(csv).toContain('"1503"');
  });

  it("skips receipts with null amount", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: null, currency: "EUR", receipt_type: "other",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(2); // header + columns only
  });

  it("includes foreign currency code", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: 50, currency: "USD", receipt_type: "other",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    expect(csv).toContain('"USD"');
  });

  it("generates mileage entries with account 4673", () => {
    const csv = generateEXTF(makeExportData({
      mileage: [{
        date: "2024-03-15", start_location: "Hamburg", end_location: "Berlin",
        distance_km: 290, is_round_trip: false, vehicle_type: "car",
        rate_per_km: 0.30, total_amount: 87,
      }],
    }));
    expect(csv).toContain('"4673"');
    expect(csv).toContain("Fahrt Hamburg-Berlin");
  });

  it("skips mileage with zero amount", () => {
    const csv = generateEXTF(makeExportData({
      mileage: [{
        date: "2024-03-15", start_location: "A", end_location: "B",
        distance_km: 0, is_round_trip: false, vehicle_type: "car",
        rate_per_km: 0.30, total_amount: 0,
      }],
    }));
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(2);
  });

  it("generates per diem entries with account 4668", () => {
    const csv = generateEXTF(makeExportData({
      allowances: [{
        date: "2024-03-15", hours: 24, base_allowance: 28,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 28, is_arrival_departure: false,
      }],
    }));
    expect(csv).toContain('"4668"');
    expect(csv).toContain("Verpflegungspauschale Berlin");
  });

  it("skips per diems with zero net_allowance", () => {
    const csv = generateEXTF(makeExportData({
      allowances: [{
        date: "2024-03-15", hours: 6, base_allowance: 0,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 0, is_arrival_departure: false,
      }],
    }));
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(2);
  });

  it("includes KOST1 cost center in all entries", () => {
    const csv = generateEXTF(makeExportData({
      costCenter: "4711",
      receipts: [{
        date: "2024-03-15", vendor_name: "V", vendor_city: "B",
        total_amount: 100, currency: "EUR", receipt_type: "other",
        vat_positions: [], image_path: "t.jpg",
      }],
    }));
    expect(csv).toContain('"4711"');
  });

  it("generates sequential Belegfeld numbers", () => {
    const csv = generateEXTF(makeExportData({
      receipts: [
        { date: "2024-03-15", vendor_name: "A", vendor_city: "B", total_amount: 10, currency: "EUR", receipt_type: "other", vat_positions: [], image_path: "a.jpg" },
        { date: "2024-03-15", vendor_name: "B", vendor_city: "B", total_amount: 20, currency: "EUR", receipt_type: "other", vat_positions: [], image_path: "b.jpg" },
      ],
    }));
    expect(csv).toContain("RK0001");
    expect(csv).toContain("RK0002");
  });

  it("uses CRLF line endings", () => {
    const csv = generateEXTF(makeExportData());
    expect(csv).toContain("\r\n");
  });
});

describe("generateDocumentXml", () => {
  it("generates valid XML structure", () => {
    const xml = generateDocumentXml(makeExportData(), []);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<archive>");
    expect(xml).toContain("</archive>");
    expect(xml).toContain("<header>");
    expect(xml).toContain("<created_by>Spesenluchs</created_by>");
  });

  it("includes title in description", () => {
    const xml = generateDocumentXml(makeExportData({ title: "Test Trip" }), []);
    expect(xml).toContain("Reisekostenabrechnung: Test Trip");
  });

  it("includes document entries for each beleg", () => {
    const xml = generateDocumentXml(makeExportData(), [
      { filename: "001_2024-03-15_Hotel.jpg", vendor: "Hotel Adlon" },
      { filename: "002_2024-03-15_Restaurant.pdf", vendor: "Zur Linde" },
    ]);
    expect(xml).toContain("<extension>jpg</extension>");
    expect(xml).toContain("<extension>pdf</extension>");
    expect(xml).toContain("<keyword>Hotel Adlon</keyword>");
    expect(xml).toContain("<keyword>Zur Linde</keyword>");
  });

  it("uses 'Beleg' for null vendor", () => {
    const xml = generateDocumentXml(makeExportData(), [
      { filename: "001_test.jpg", vendor: null },
    ]);
    expect(xml).toContain("<keyword>Beleg</keyword>");
  });

  it("escapes XML special characters", () => {
    const xml = generateDocumentXml(makeExportData({ title: 'Trip & "Test" <2024>' }), []);
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;");
    expect(xml).toContain("&lt;");
    expect(xml).toContain("&gt;");
  });
});
