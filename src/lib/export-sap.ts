import { DayAllowance } from "./types";

export interface SapExportData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  userName: string;
  costCenter?: string;
  companyCode: string;
  allowances: DayAllowance[];
  receipts: Array<{
    date: string | null;
    vendor_name: string | null;
    total_amount: number | null;
    currency: string;
    receipt_type: string;
  }>;
  mileage: Array<{
    date: string;
    start_location: string;
    end_location: string;
    total_amount: number;
  }>;
}

// SAP IDoc-like format for BAPI_ACC_DOCUMENT_POST
interface SapDocumentItem {
  ITEMNO_ACC: string;
  GL_ACCOUNT: string;
  COSTCENTER?: string;
  DOC_DATE: string;
  PSTNG_DATE: string;
  COMP_CODE: string;
  CURRENCY: string;
  AMT_DOCCUR: string;
  ITEM_TEXT: string;
}

// SKR mapping for SAP GL accounts
const SAP_GL_ACCOUNTS: Record<string, string> = {
  hotel: "6640",
  restaurant: "6650",
  taxi: "6670",
  public_transport: "6670",
  train: "6670",
  flight: "6670",
  gas_station: "6530",
  parking: "6580",
  other: "6670",
  mileage: "6673",
  per_diem: "6668",
};

function formatSapDate(dateStr: string): string {
  // SAP date format: YYYYMMDD
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

export function generateSapIDoc(data: SapExportData): string {
  const items: SapDocumentItem[] = [];
  let itemNo = 1;

  const docDate = formatSapDate(data.startDate);
  const postingDate = formatSapDate(new Date().toISOString());

  // Receipts
  for (const receipt of data.receipts) {
    if (receipt.total_amount == null) continue;

    const glAccount = SAP_GL_ACCOUNTS[receipt.receipt_type] || SAP_GL_ACCOUNTS.other;
    const text = [receipt.vendor_name, receipt.date].filter(Boolean).join(" ");

    items.push({
      ITEMNO_ACC: String(itemNo).padStart(10, "0"),
      GL_ACCOUNT: glAccount,
      COSTCENTER: data.costCenter,
      DOC_DATE: docDate,
      PSTNG_DATE: postingDate,
      COMP_CODE: data.companyCode,
      CURRENCY: receipt.currency,
      AMT_DOCCUR: receipt.total_amount.toFixed(2),
      ITEM_TEXT: text.substring(0, 50),
    });
    itemNo++;
  }

  // Mileage
  for (const m of data.mileage) {
    items.push({
      ITEMNO_ACC: String(itemNo).padStart(10, "0"),
      GL_ACCOUNT: SAP_GL_ACCOUNTS.mileage,
      COSTCENTER: data.costCenter,
      DOC_DATE: docDate,
      PSTNG_DATE: postingDate,
      COMP_CODE: data.companyCode,
      CURRENCY: "EUR",
      AMT_DOCCUR: m.total_amount.toFixed(2),
      ITEM_TEXT: `Fahrt ${m.start_location}-${m.end_location}`.substring(0, 50),
    });
    itemNo++;
  }

  // Per diems
  for (const day of data.allowances) {
    if (day.net_allowance <= 0) continue;

    items.push({
      ITEMNO_ACC: String(itemNo).padStart(10, "0"),
      GL_ACCOUNT: SAP_GL_ACCOUNTS.per_diem,
      COSTCENTER: data.costCenter,
      DOC_DATE: docDate,
      PSTNG_DATE: postingDate,
      COMP_CODE: data.companyCode,
      CURRENCY: "EUR",
      AMT_DOCCUR: day.net_allowance.toFixed(2),
      ITEM_TEXT: `Verpflegungspauschale ${formatSapDate(day.date)}`.substring(0, 50),
    });
    itemNo++;
  }

  // Generate XML IDoc
  const xmlLines: string[] = [];
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlLines.push('<BAPI_ACC_DOCUMENT_POST>');
  xmlLines.push('  <DOCUMENTHEADER>');
  xmlLines.push(`    <OBJ_TYPE>BKPFF</OBJ_TYPE>`);
  xmlLines.push(`    <OBJ_KEY>${escapeXml(data.title)}</OBJ_KEY>`);
  xmlLines.push(`    <BUS_ACT>RFBU</BUS_ACT>`);
  xmlLines.push(`    <USERNAME>${escapeXml(data.userName)}</USERNAME>`);
  xmlLines.push(`    <HEADER_TXT>${escapeXml(`Reisekosten ${data.destination}`)}</HEADER_TXT>`);
  xmlLines.push(`    <COMP_CODE>${data.companyCode}</COMP_CODE>`);
  xmlLines.push(`    <DOC_DATE>${docDate}</DOC_DATE>`);
  xmlLines.push(`    <PSTNG_DATE>${postingDate}</PSTNG_DATE>`);
  xmlLines.push(`    <DOC_TYPE>KR</DOC_TYPE>`);
  xmlLines.push('  </DOCUMENTHEADER>');
  xmlLines.push('  <ACCOUNTGL>');

  for (const item of items) {
    xmlLines.push('    <item>');
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        xmlLines.push(`      <${key}>${escapeXml(value)}</${key}>`);
      }
    }
    xmlLines.push('    </item>');
  }

  xmlLines.push('  </ACCOUNTGL>');
  xmlLines.push('  <CURRENCYAMOUNT>');

  for (const item of items) {
    xmlLines.push('    <item>');
    xmlLines.push(`      <ITEMNO_ACC>${item.ITEMNO_ACC}</ITEMNO_ACC>`);
    xmlLines.push(`      <CURRENCY>${item.CURRENCY}</CURRENCY>`);
    xmlLines.push(`      <AMT_DOCCUR>${item.AMT_DOCCUR}</AMT_DOCCUR>`);
    xmlLines.push('    </item>');
  }

  xmlLines.push('  </CURRENCYAMOUNT>');
  xmlLines.push('</BAPI_ACC_DOCUMENT_POST>');

  return xmlLines.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
