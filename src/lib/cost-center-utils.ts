import type { CostCenter, CostObject } from "./types";

export interface CsvRow {
  number: string;
  name: string;
  cost_object_number?: string;
  valid_from?: string;
  valid_to?: string;
}

export interface CsvParseResult {
  rows: CsvRow[];
  errors: string[];
}

export function parseCostCenterCsv(content: string): CsvParseResult {
  const lines = content.trim().split(/\r?\n/);
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push("CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten.");
    return { rows, errors };
  }

  const header = lines[0].split(";").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const numIdx = header.indexOf("nummer");
  const nameIdx = header.indexOf("name");
  const coIdx = header.indexOf("kostenträger");
  const fromIdx = header.indexOf("gültig_ab");
  const toIdx = header.indexOf("gültig_bis");

  if (numIdx === -1 || nameIdx === -1) {
    errors.push('Pflichtfelder "Nummer" und "Name" fehlen in der Kopfzeile.');
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    const number = cols[numIdx];
    const name = cols[nameIdx];

    if (!number || !name) {
      errors.push(`Zeile ${i + 1}: Nummer und Name sind Pflichtfelder.`);
      continue;
    }

    const row: CsvRow = { number, name };
    if (coIdx !== -1 && cols[coIdx]) row.cost_object_number = cols[coIdx];
    if (fromIdx !== -1 && cols[fromIdx]) row.valid_from = cols[fromIdx];
    if (toIdx !== -1 && cols[toIdx]) row.valid_to = cols[toIdx];

    rows.push(row);
  }

  return { rows, errors };
}

export function validateCostCenter(data: {
  number?: string;
  name?: string;
}): string[] {
  const errors: string[] = [];
  if (!data.number?.trim()) errors.push("Nummer ist ein Pflichtfeld.");
  if (!data.name?.trim()) errors.push("Name ist ein Pflichtfeld.");
  if (data.number && data.number.length > 20) errors.push("Nummer darf maximal 20 Zeichen lang sein.");
  if (data.name && data.name.length > 100) errors.push("Name darf maximal 100 Zeichen lang sein.");
  return errors;
}

export function formatCostCenter(cc: CostCenter): string {
  return `${cc.number} – ${cc.name}`;
}

export function filterActiveCostCenters(centers: CostCenter[], date?: string): CostCenter[] {
  const checkDate = date ? new Date(date) : new Date();
  return centers.filter((cc) => {
    if (!cc.active) return false;
    if (cc.valid_from && new Date(cc.valid_from) > checkDate) return false;
    if (cc.valid_to && new Date(cc.valid_to) < checkDate) return false;
    return true;
  });
}
