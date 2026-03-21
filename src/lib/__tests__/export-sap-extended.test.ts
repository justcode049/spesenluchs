import { describe, it, expect } from "vitest";
import { generateSapIDoc, SapExportData } from "../export-sap";

function makeData(overrides?: Partial<SapExportData>): SapExportData {
  return {
    title: "Test",
    destination: "Berlin",
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    userName: "Max",
    companyCode: "1000",
    allowances: [],
    receipts: [],
    mileage: [],
    ...overrides,
  };
}

describe("generateSapIDoc – GL account mapping for all receipt types", () => {
  const typeToAccount: Record<string, string> = {
    hotel: "6640",
    restaurant: "6650",
    taxi: "6670",
    public_transport: "6670",
    train: "6670",
    flight: "6670",
    gas_station: "6530",
    parking: "6580",
    other: "6670",
  };

  for (const [type, account] of Object.entries(typeToAccount)) {
    it(`maps ${type} to GL account ${account}`, () => {
      const xml = generateSapIDoc(makeData({
        receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 100, currency: "EUR", receipt_type: type }],
      }));
      expect(xml).toContain(`<GL_ACCOUNT>${account}</GL_ACCOUNT>`);
    });
  }
});

describe("generateSapIDoc – edge cases", () => {
  it("handles null cost center (omits COSTCENTER tag)", () => {
    const xml = generateSapIDoc(makeData({
      costCenter: undefined,
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 100, currency: "EUR", receipt_type: "other" }],
    }));
    expect(xml).not.toContain("<COSTCENTER>");
  });

  it("truncates long text to 50 chars", () => {
    const longVendor = "A".repeat(80);
    const xml = generateSapIDoc(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: longVendor, total_amount: 100, currency: "EUR", receipt_type: "other" }],
    }));
    const match = xml.match(/<ITEM_TEXT>([^<]+)<\/ITEM_TEXT>/);
    expect(match).toBeTruthy();
    expect(match![1].length).toBeLessThanOrEqual(50);
  });

  it("formats date as YYYYMMDD in DOC_DATE", () => {
    const xml = generateSapIDoc(makeData({
      startDate: "2024-12-25",
      receipts: [{ date: "2024-12-25", vendor_name: "V", total_amount: 10, currency: "EUR", receipt_type: "other" }],
    }));
    // DOC_DATE uses startDate formatted
    expect(xml).toMatch(/DOC_DATE.*2024/);
  });

  it("escapes XML special characters in header text", () => {
    const xml = generateSapIDoc(makeData({
      destination: "Berlin & München",
    }));
    expect(xml).toContain("Berlin &amp; M");
  });

  it("handles zero-amount receipts (still included)", () => {
    const xml = generateSapIDoc(makeData({
      receipts: [{ date: "2024-03-15", vendor_name: "V", total_amount: 0, currency: "EUR", receipt_type: "other" }],
    }));
    expect(xml).toContain("<AMT_DOCCUR>0.00</AMT_DOCCUR>");
  });

  it("generates CURRENCYAMOUNT section matching ACCOUNTGL", () => {
    const xml = generateSapIDoc(makeData({
      receipts: [
        { date: "2024-03-15", vendor_name: "A", total_amount: 50, currency: "EUR", receipt_type: "hotel" },
        { date: "2024-03-15", vendor_name: "B", total_amount: 30, currency: "USD", receipt_type: "taxi" },
      ],
    }));
    expect(xml).toContain("<ACCOUNTGL>");
    expect(xml).toContain("<CURRENCYAMOUNT>");
    // Should have matching item numbers
    expect(xml).toContain("<ITEMNO_ACC>0000000001</ITEMNO_ACC>");
    expect(xml).toContain("<ITEMNO_ACC>0000000002</ITEMNO_ACC>");
    // Should have both currencies
    expect(xml).toContain("<CURRENCY>EUR</CURRENCY>");
    expect(xml).toContain("<CURRENCY>USD</CURRENCY>");
  });

  it("includes per diem and mileage GL accounts", () => {
    const xml = generateSapIDoc(makeData({
      mileage: [{ date: "2024-03-15", start_location: "A", end_location: "B", total_amount: 30 }],
      allowances: [{
        date: "2024-03-15", hours: 24, base_allowance: 28,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 28, is_arrival_departure: false,
      }],
    }));
    expect(xml).toContain("<GL_ACCOUNT>6673</GL_ACCOUNT>"); // mileage
    expect(xml).toContain("<GL_ACCOUNT>6668</GL_ACCOUNT>"); // per diem
  });

  it("skips per diems with zero net_allowance", () => {
    const xml = generateSapIDoc(makeData({
      allowances: [{
        date: "2024-03-15", hours: 4, base_allowance: 0,
        breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0,
        net_allowance: 0, is_arrival_departure: false,
      }],
    }));
    expect(xml).not.toContain("<GL_ACCOUNT>6668</GL_ACCOUNT>");
  });

  it("uses OBJ_TYPE BKPFF and BUS_ACT RFBU", () => {
    const xml = generateSapIDoc(makeData());
    expect(xml).toContain("<OBJ_TYPE>BKPFF</OBJ_TYPE>");
    expect(xml).toContain("<BUS_ACT>RFBU</BUS_ACT>");
  });

  it("uses DOC_TYPE KR", () => {
    const xml = generateSapIDoc(makeData());
    expect(xml).toContain("<DOC_TYPE>KR</DOC_TYPE>");
  });
});
