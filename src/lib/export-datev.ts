import { DayAllowance } from "./types";

export interface DatevReceipt {
  date: string | null;
  vendor_name: string | null;
  vendor_city: string | null;
  total_amount: number | null;
  currency: string;
  receipt_type: string;
  vat_positions: Array<{ rate: number; net: number; vat: number; gross: number }>;
  image_path: string;
  hospitality_occasion?: string | null;
  hospitality_attendees?: string | null;
  hospitality_tip?: number | null;
}

export interface DatevMileage {
  date: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  is_round_trip: boolean;
  vehicle_type: string;
  rate_per_km: number;
  total_amount: number;
}

export interface DatevExportData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  userName: string;
  costCenter?: string;
  allowances: DayAllowance[];
  receipts: DatevReceipt[];
  mileage: DatevMileage[];
}

// SKR03 Konten-Mapping
const RECEIPT_TYPE_ACCOUNTS: Record<string, { account: string; label: string }> = {
  hotel: { account: "4666", label: "Reisekosten Übernachtung" },
  restaurant: { account: "4650", label: "Bewirtungskosten" },
  taxi: { account: "4670", label: "Reisekosten Fahrtkosten" },
  public_transport: { account: "4670", label: "Reisekosten Fahrtkosten" },
  train: { account: "4670", label: "Reisekosten Fahrtkosten" },
  flight: { account: "4670", label: "Reisekosten Fahrtkosten" },
  gas_station: { account: "4530", label: "Kfz-Betriebskosten" },
  parking: { account: "4580", label: "Kfz-Nebenkosten" },
  other: { account: "4670", label: "Reisekosten sonstige" },
};

const COUNTER_ACCOUNT = "1590"; // Durchlaufende Posten / Verrechnungskonto

// USt-Schlüssel DATEV – handles rate as 0.19, 19, or 1900
function vatCode(rate: number): string {
  // Normalize to integer percentage
  let pct = rate;
  if (pct > 100) pct = pct / 100;
  if (pct <= 1) pct = pct * 100;
  pct = Math.round(pct);

  if (pct === 19) return "9"; // 19% USt
  if (pct === 7) return "8"; // 7% USt
  return "0"; // keine USt
}

function formatDateDATEV(d: string): string {
  // DATEV format: DDMM (4-stellig, ohne Jahr, ohne Trennzeichen)
  const date = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}${month}`;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-zA-Z0-9_\-.]/g, "_")
    .replace(/_+/g, "_");
}

export function generateBelegFilename(
  index: number,
  date: string | null,
  vendor: string | null,
  ext: string
): string {
  const num = String(index + 1).padStart(3, "0");
  const dateStr = date
    ? new Date(date + (date.includes("T") ? "" : "T00:00:00")).toISOString().split("T")[0]
    : "ohne-datum";
  const vendorStr = sanitizeFilename(vendor || "Unbekannt").substring(0, 30);
  return `${num}_${dateStr}_${vendorStr}.${ext}`;
}

function csvEscape(s: string): string {
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
}

export function generateEXTF(data: DatevExportData): string {
  const lines: string[] = [];

  // EXTF Header (Zeile 1)
  const now = new Date();
  const dateCreated = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  // Wirtschaftsjahr-Beginn aus startDate
  const startYear = new Date(data.startDate + "T00:00:00").getFullYear();
  const fiscalYearStart = `${startYear}0101`;

  lines.push([
    '"EXTF"', // Format
    '700',    // Versionsnummer
    '21',     // Kategorie (Buchungsstapel)
    '"Buchungsstapel"',
    '12',     // Format-Version
    `${dateCreated}`,  // Erzeugt am
    '',       // Importiert
    '"SP"',   // Herkunft (Spesenluchs)
    '',       // Exportiert von
    '',       // Importiert von
    '',       // Berater-Nr
    '',       // Mandanten-Nr
    `${fiscalYearStart}`, // WJ-Beginn
    '4',      // Sachkontenlänge
    '',       // Datum von
    '',       // Datum bis
    csvEscape(`Reisekosten ${data.title}`), // Bezeichnung
    '',       // Diktatkürzel
    '1',      // Buchungstyp (1=Fibu)
    '0',      // Rechnungslegungszweck
    '',       // Festschreibung
    '"EUR"',  // WKZ
  ].join(";"));

  // Spalten-Header (Zeile 2)
  lines.push([
    '"Umsatz (ohne Soll/Haben-Kz)"',
    '"Soll/Haben-Kennzeichen"',
    '"WKZ Umsatz"',
    '"Kurs"',
    '"Basis-Umsatz"',
    '"WKZ Basis-Umsatz"',
    '"Konto"',
    '"Gegenkonto (ohne BU-Schlüssel)"',
    '"BU-Schlüssel"',
    '"Belegdatum"',
    '"Belegfeld 1"',
    '"Buchungstext"',
    '"KOST1"',
  ].join(";"));

  let belegNr = 1;

  // Belege
  for (const receipt of data.receipts) {
    if (receipt.total_amount == null) continue;

    const amount = Math.abs(Number(receipt.total_amount));
    const mapping = RECEIPT_TYPE_ACCOUNTS[receipt.receipt_type] || RECEIPT_TYPE_ACCOUNTS.other;
    const belegDate = receipt.date ? formatDateDATEV(receipt.date) : "";
    const text = [receipt.vendor_name, receipt.vendor_city].filter(Boolean).join(", ");

    // Hauptbuchung
    const buKey = receipt.vat_positions?.length > 0
      ? vatCode(receipt.vat_positions[0].rate)
      : "0";

    const isFremdwaehrung = receipt.currency !== "EUR";

    lines.push([
      amount.toFixed(2).replace(".", ","), // Umsatz
      '"S"',                               // Soll
      isFremdwaehrung ? csvEscape(receipt.currency) : '""',
      '""',                                // Kurs
      '""',                                // Basis-Umsatz
      '""',                                // WKZ Basis
      csvEscape(mapping.account),          // Konto
      csvEscape(COUNTER_ACCOUNT),          // Gegenkonto
      csvEscape(buKey),                    // BU-Schlüssel
      csvEscape(belegDate),               // Belegdatum
      csvEscape(`RK${String(belegNr).padStart(4, "0")}`), // Belegfeld 1
      csvEscape(text.substring(0, 60)),    // Buchungstext
      csvEscape(data.costCenter || ""),    // KOST1
    ].join(";"));

    belegNr++;
  }

  // Kilometergeld
  for (const m of data.mileage) {
    const amount = Number(m.total_amount);
    if (amount <= 0) continue;

    const belegDate = formatDateDATEV(m.date);
    const text = `Fahrt ${m.start_location}-${m.end_location}`;

    lines.push([
      amount.toFixed(2).replace(".", ","),
      '"S"',
      '""',
      '""',
      '""',
      '""',
      '"4673"', // Reisekosten Fahrtkosten Arbeitnehmer
      csvEscape(COUNTER_ACCOUNT),
      '"0"',
      csvEscape(belegDate),
      csvEscape(`RK${String(belegNr).padStart(4, "0")}`),
      csvEscape(text.substring(0, 60)),
      csvEscape(data.costCenter || ""),    // KOST1
    ].join(";"));

    belegNr++;
  }

  // Tagespauschalen
  for (const day of data.allowances) {
    if (day.net_allowance <= 0) continue;

    const belegDate = formatDateDATEV(day.date);

    lines.push([
      day.net_allowance.toFixed(2).replace(".", ","),
      '"S"',
      '""',
      '""',
      '""',
      '""',
      '"4668"', // Verpflegungsmehraufwand
      csvEscape(COUNTER_ACCOUNT),
      '"0"',    // keine USt auf Pauschalen
      csvEscape(belegDate),
      csvEscape(`RK${String(belegNr).padStart(4, "0")}`),
      csvEscape(`Verpflegungspauschale ${data.destination}`),
      csvEscape(data.costCenter || ""),    // KOST1
    ].join(";"));

    belegNr++;
  }

  return lines.join("\r\n");
}

export function generateDocumentXml(
  data: DatevExportData,
  belegFiles: Array<{ filename: string; vendor: string | null }>
): string {
  const xmlLines: string[] = [];
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlLines.push("<archive>");
  xmlLines.push("  <header>");
  xmlLines.push(`    <date>${new Date().toISOString().split("T")[0]}</date>`);
  xmlLines.push(`    <description>Reisekostenabrechnung: ${escapeXml(data.title || data.destination)}</description>`);
  xmlLines.push(`    <created_by>Spesenluchs</created_by>`);
  xmlLines.push("  </header>");
  xmlLines.push("  <content>");

  for (const beleg of belegFiles) {
    const ext = beleg.filename.split(".").pop() || "pdf";
    xmlLines.push("    <document>");
    xmlLines.push(`      <extension>${ext}</extension>`);
    xmlLines.push(`      <filename>${escapeXml(beleg.filename)}</filename>`);
    xmlLines.push("      <keywords>");
    xmlLines.push(`        <keyword>${escapeXml(beleg.vendor || "Beleg")}</keyword>`);
    xmlLines.push("      </keywords>");
    xmlLines.push("    </document>");
  }

  xmlLines.push("  </content>");
  xmlLines.push("</archive>");

  return xmlLines.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
