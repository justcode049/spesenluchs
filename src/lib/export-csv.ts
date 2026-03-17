import { DayAllowance } from "./types";

interface ExportReceipt {
  date: string | null;
  vendor_name: string | null;
  total_amount: number | null;
  currency: string;
  receipt_type: string;
  vendor_city: string | null;
}

interface ExportMileage {
  date: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  is_round_trip: boolean;
  vehicle_type: string;
  rate_per_km: number;
  total_amount: number;
}

interface TripExportData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  allowances: DayAllowance[];
  receipts: ExportReceipt[];
  mileage: ExportMileage[];
}

export function generateCSV(data: TripExportData): string {
  const lines: string[] = [];

  // Header info
  lines.push(`Reisekostenabrechnung`);
  lines.push(`Reise;${data.title || data.destination}`);
  lines.push(`Zeitraum;${formatDate(data.startDate)} - ${formatDate(data.endDate)}`);
  lines.push("");

  // Per diems
  lines.push("TAGESPAUSCHALEN");
  lines.push("Datum;Stunden;Pauschale;Abzug Frühstück;Abzug Mittag;Abzug Abend;Netto");
  for (const d of data.allowances) {
    lines.push([
      formatDate(d.date),
      d.hours.toFixed(1),
      d.base_allowance.toFixed(2),
      d.breakfast_deduction.toFixed(2),
      d.lunch_deduction.toFixed(2),
      d.dinner_deduction.toFixed(2),
      d.net_allowance.toFixed(2),
    ].join(";"));
  }
  const totalAllowance = data.allowances.reduce((s, d) => s + d.net_allowance, 0);
  lines.push(`Gesamt;;;;;&nbsp;${totalAllowance.toFixed(2)}`);
  lines.push("");

  // Receipts
  lines.push("BELEGE");
  lines.push("Datum;Händler;Stadt;Belegart;Betrag;Währung");
  for (const r of data.receipts) {
    lines.push([
      r.date ? formatDate(r.date) : "",
      csvEscape(r.vendor_name || ""),
      csvEscape(r.vendor_city || ""),
      r.receipt_type,
      r.total_amount != null ? Number(r.total_amount).toFixed(2) : "",
      r.currency,
    ].join(";"));
  }
  const totalReceipts = data.receipts.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  lines.push(`Gesamt;;;;${totalReceipts.toFixed(2)};EUR`);
  lines.push("");

  // Mileage
  if (data.mileage.length > 0) {
    lines.push("FAHRTEN");
    lines.push("Datum;Von;Nach;km;H+R;Fahrzeug;€/km;Betrag");
    for (const m of data.mileage) {
      const effectiveKm = m.is_round_trip ? m.distance_km * 2 : m.distance_km;
      lines.push([
        formatDate(m.date),
        csvEscape(m.start_location),
        csvEscape(m.end_location),
        effectiveKm.toFixed(1),
        m.is_round_trip ? "Ja" : "Nein",
        m.vehicle_type,
        Number(m.rate_per_km).toFixed(2),
        Number(m.total_amount).toFixed(2),
      ].join(";"));
    }
    const totalMileage = data.mileage.reduce((s, m) => s + Number(m.total_amount), 0);
    lines.push(`Gesamt;;;;;;;${totalMileage.toFixed(2)}`);
    lines.push("");
  }

  // Grand total
  const totalMileage = data.mileage.reduce((s, m) => s + Number(m.total_amount), 0);
  lines.push(`GESAMTBETRAG;${(totalAllowance + totalReceipts + totalMileage).toFixed(2)} EUR`);

  return "\uFEFF" + lines.join("\n"); // BOM for Excel
}

function formatDate(d: string): string {
  return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("de-DE");
}

function csvEscape(s: string): string {
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
