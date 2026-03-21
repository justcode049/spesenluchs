import { DayAllowance } from "./types";

export interface EnventaExportData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  userName: string;
  costCenter?: string;
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

export interface EnventaConfig {
  base_url: string;
  api_key: string;
  mandant_id: string;
}

interface EnventaBuchung {
  datum: string;
  betrag: number;
  waehrung: string;
  konto: string;
  gegenkonto: string;
  kostenstelle?: string;
  buchungstext: string;
  belegtyp: string;
}

export function generateEnventaPayload(data: EnventaExportData): EnventaBuchung[] {
  const buchungen: EnventaBuchung[] = [];

  // Receipts
  for (const receipt of data.receipts) {
    if (receipt.total_amount == null) continue;

    buchungen.push({
      datum: receipt.date || data.startDate,
      betrag: receipt.total_amount,
      waehrung: receipt.currency,
      konto: mapReceiptTypeToAccount(receipt.receipt_type),
      gegenkonto: "1590",
      kostenstelle: data.costCenter,
      buchungstext: [receipt.vendor_name, data.destination].filter(Boolean).join(", ").substring(0, 60),
      belegtyp: "Reisekosten",
    });
  }

  // Mileage
  for (const m of data.mileage) {
    buchungen.push({
      datum: m.date,
      betrag: m.total_amount,
      waehrung: "EUR",
      konto: "4673",
      gegenkonto: "1590",
      kostenstelle: data.costCenter,
      buchungstext: `Fahrt ${m.start_location}-${m.end_location}`.substring(0, 60),
      belegtyp: "Reisekosten",
    });
  }

  // Per diems
  for (const day of data.allowances) {
    if (day.net_allowance <= 0) continue;

    buchungen.push({
      datum: day.date,
      betrag: day.net_allowance,
      waehrung: "EUR",
      konto: "4668",
      gegenkonto: "1590",
      kostenstelle: data.costCenter,
      buchungstext: `Verpflegungspauschale ${data.destination}`.substring(0, 60),
      belegtyp: "Reisekosten",
    });
  }

  return buchungen;
}

export async function pushToEnventa(
  config: EnventaConfig,
  buchungen: EnventaBuchung[]
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${config.base_url}/api/v1/buchungen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.api_key,
      "X-Mandant-ID": config.mandant_id,
    },
    body: JSON.stringify({ buchungen }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`enventa API error: ${response.status} - ${error}`);
  }

  return response.json();
}

function mapReceiptTypeToAccount(type: string): string {
  const mapping: Record<string, string> = {
    hotel: "4666",
    restaurant: "4650",
    taxi: "4670",
    public_transport: "4670",
    train: "4670",
    flight: "4670",
    gas_station: "4530",
    parking: "4580",
    other: "4670",
  };
  return mapping[type] || "4670";
}
