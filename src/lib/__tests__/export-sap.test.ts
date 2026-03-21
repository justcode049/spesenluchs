import { describe, it, expect } from "vitest";
import { generateSapIDoc, SapExportData } from "../export-sap";

describe("generateSapIDoc", () => {
  const baseData: SapExportData = {
    title: "Kundentermin Berlin",
    destination: "Berlin",
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    userName: "Max Mustermann",
    costCenter: "4711",
    companyCode: "1000",
    allowances: [
      {
        date: "2024-03-15",
        hours: 10,
        base_allowance: 14,
        breakfast_deduction: 0,
        lunch_deduction: 0,
        dinner_deduction: 0,
        net_allowance: 14,
        is_arrival_departure: true,
      },
    ],
    receipts: [
      {
        date: "2024-03-15",
        vendor_name: "Hotel Central",
        total_amount: 120.5,
        currency: "EUR",
        receipt_type: "hotel",
      },
    ],
    mileage: [
      {
        date: "2024-03-15",
        start_location: "Hamburg",
        end_location: "Berlin",
        total_amount: 88.5,
      },
    ],
  };

  it("generates valid XML", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<BAPI_ACC_DOCUMENT_POST>");
    expect(xml).toContain("</BAPI_ACC_DOCUMENT_POST>");
  });

  it("contains document header with company code", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain("<COMP_CODE>1000</COMP_CODE>");
    expect(xml).toContain("<HEADER_TXT>Reisekosten Berlin</HEADER_TXT>");
  });

  it("maps hotel to GL account 6640", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain("<GL_ACCOUNT>6640</GL_ACCOUNT>");
  });

  it("includes cost center in line items", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain("<COSTCENTER>4711</COSTCENTER>");
  });

  it("includes mileage entries", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain("<GL_ACCOUNT>6673</GL_ACCOUNT>");
    expect(xml).toContain("<AMT_DOCCUR>88.50</AMT_DOCCUR>");
  });

  it("includes per diem entries", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain("<GL_ACCOUNT>6668</GL_ACCOUNT>");
    expect(xml).toContain("<AMT_DOCCUR>14.00</AMT_DOCCUR>");
  });

  it("generates sequential item numbers", () => {
    const xml = generateSapIDoc(baseData);
    expect(xml).toContain("<ITEMNO_ACC>0000000001</ITEMNO_ACC>");
    expect(xml).toContain("<ITEMNO_ACC>0000000002</ITEMNO_ACC>");
    expect(xml).toContain("<ITEMNO_ACC>0000000003</ITEMNO_ACC>");
  });
});
