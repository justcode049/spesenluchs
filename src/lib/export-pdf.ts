import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  userName: string;
  costCenter?: string;
  allowances: DayAllowance[];
  receipts: ExportReceipt[];
  mileage: ExportMileage[];
}

function formatDate(d: string): string {
  return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("de-DE");
}

export function generatePDF(data: TripExportData): jsPDF {
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text("Reisekostenabrechnung", 14, y);
  y += 10;

  // Meta
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Reise: ${data.title || data.destination}`, 14, y);
  y += 5;
  doc.text(`Zeitraum: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}`, 14, y);
  y += 5;
  doc.text(`Mitarbeiter: ${data.userName}`, 14, y);
  y += 5;
  if (data.costCenter) {
    doc.text(`Kostenstelle: ${data.costCenter}`, 14, y);
    y += 5;
  }
  doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}`, 14, y);
  y += 10;

  // Summary box
  const totalAllowance = data.allowances.reduce((s, d) => s + d.net_allowance, 0);
  const totalReceipts = data.receipts.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const totalMileage = data.mileage.reduce((s, m) => s + Number(m.total_amount), 0);
  const grandTotal = totalAllowance + totalReceipts + totalMileage;

  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 24, "F");
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`Tagespauschalen: ${totalAllowance.toFixed(2)} EUR`, 18, y + 6);
  doc.text(`Belege: ${totalReceipts.toFixed(2)} EUR`, 18, y + 12);
  doc.text(`Fahrten: ${totalMileage.toFixed(2)} EUR`, 18, y + 18);
  doc.setFontSize(12);
  doc.text(`Gesamt: ${grandTotal.toFixed(2)} EUR`, 120, y + 14);
  y += 32;

  // Per Diems Table
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Tagespauschalen (Verpflegungsmehraufwand)", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Datum", "Stunden", "Pauschale", "Abzüge", "Netto"]],
    body: data.allowances.map((d) => {
      const deductions = d.breakfast_deduction + d.lunch_deduction + d.dinner_deduction;
      return [
        formatDate(d.date) + (d.is_arrival_departure ? " *" : ""),
        d.hours.toFixed(1) + "h",
        d.base_allowance.toFixed(2) + " €",
        deductions > 0 ? `-${deductions.toFixed(2)} €` : "–",
        d.net_allowance.toFixed(2) + " €",
      ];
    }),
    foot: [["", "", "", "Gesamt", totalAllowance.toFixed(2) + " €"]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Receipts Table
  if (data.receipts.length > 0) {
    doc.setFontSize(12);
    doc.text("Belege", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Datum", "Händler", "Belegart", "Betrag"]],
      body: data.receipts.map((r) => [
        r.date ? formatDate(r.date) : "–",
        r.vendor_name || "Unbekannt",
        r.receipt_type,
        r.total_amount != null ? `${Number(r.total_amount).toFixed(2)} ${r.currency}` : "–",
      ]),
      foot: [["", "", "Gesamt", totalReceipts.toFixed(2) + " EUR"]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Mileage Table
  if (data.mileage.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.text("Fahrten (Kilometerpauschale)", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Datum", "Strecke", "km", "€/km", "Betrag"]],
      body: data.mileage.map((m) => {
        const effectiveKm = m.is_round_trip ? Number(m.distance_km) * 2 : Number(m.distance_km);
        return [
          formatDate(m.date),
          `${m.start_location} → ${m.end_location}${m.is_round_trip ? " (H+R)" : ""}`,
          effectiveKm.toFixed(1),
          Number(m.rate_per_km).toFixed(2) + " €",
          Number(m.total_amount).toFixed(2) + " €",
        ];
      }),
      foot: [["", "", "", "Gesamt", totalMileage.toFixed(2) + " €"]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
    });
  }

  // Footer note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 15;
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("* An-/Abreisetag | Erstellt mit Spesenluchs (spesenluchs.de)", 14, y);

  return doc;
}
