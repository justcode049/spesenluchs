import { MealDeduction, DayAllowance } from "./types";

// BMF-Pauschalen 2024 (Inland Deutschland)
const INLAND_FULL_DAY = 28.0; // 24h Abwesenheit
const INLAND_PARTIAL_DAY = 14.0; // >8h oder An-/Abreisetag

// Abzüge in Prozent der Tagespauschale
const BREAKFAST_DEDUCTION_RATE = 0.2; // 20%
const LUNCH_DEDUCTION_RATE = 0.4; // 40%
const DINNER_DEDUCTION_RATE = 0.4; // 40%

// Auslands-Tagespauschalen 2024 (Top-30 Länder)
// Format: { country_code: [partial_day, full_day] }
const FOREIGN_PER_DIEMS: Record<string, [number, number]> = {
  AT: [27, 40], // Österreich
  CH: [43, 64], // Schweiz
  FR: [39, 58], // Frankreich
  GB: [38, 56], // Großbritannien
  US: [39, 59], // USA
  NL: [32, 47], // Niederlande
  IT: [34, 52], // Italien
  ES: [29, 44], // Spanien
  PL: [20, 30], // Polen
  CZ: [22, 32], // Tschechien
  HU: [18, 28], // Ungarn
  BE: [33, 49], // Belgien
  DK: [45, 67], // Dänemark
  SE: [40, 59], // Schweden
  NO: [50, 74], // Norwegen
  FI: [35, 52], // Finnland
  PT: [27, 40], // Portugal
  GR: [28, 42], // Griechenland
  IE: [33, 50], // Irland
  JP: [37, 55], // Japan
  CN: [30, 45], // China
  SG: [36, 53], // Singapur
  AE: [36, 54], // VAE
  AU: [36, 54], // Australien
  LU: [40, 60], // Luxemburg
  HR: [23, 35], // Kroatien
  RO: [22, 32], // Rumänien
  BG: [18, 27], // Bulgarien
  TR: [22, 33], // Türkei
  IN: [21, 31], // Indien
};

function getPerDiemRates(country: string): [number, number] {
  if (country === "DE") {
    return [INLAND_PARTIAL_DAY, INLAND_FULL_DAY];
  }
  return FOREIGN_PER_DIEMS[country] || [INLAND_PARTIAL_DAY, INLAND_FULL_DAY];
}

/**
 * Berechnet die Tagespauschalen für eine Dienstreise gemäß § 9 Abs. 4a EStG.
 *
 * Regeln:
 * - Eintägige Reise: >8h Abwesenheit → Teilpauschale (14€ inland)
 * - Mehrtägige Reise: An-/Abreisetag → Teilpauschale, Zwischentage → Vollpauschale (28€)
 * - Mahlzeitenabzüge: Frühstück 20%, Mittag 40%, Abend 40% der jeweiligen Tagespauschale
 */
export function calculatePerDiems(
  startDatetime: string,
  endDatetime: string,
  country: string,
  mealDeductions: MealDeduction[]
): DayAllowance[] {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const [partialRate, fullRate] = getPerDiemRates(country);

  // Build a map of meal deductions by date
  const mealMap = new Map<string, MealDeduction>();
  for (const m of mealDeductions) {
    mealMap.set(m.date, m);
  }

  // Generate list of days
  const days: DayAllowance[] = [];
  const startDate = toDateString(start);
  const endDate = toDateString(end);

  // Single day trip
  if (startDate === endDate) {
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const baseAllowance = hours >= 8 ? partialRate : 0;
    const meals = mealMap.get(startDate);
    const deductions = calcMealDeductions(baseAllowance, meals);

    days.push({
      date: startDate,
      hours: Math.round(hours * 10) / 10,
      base_allowance: baseAllowance,
      ...deductions,
      net_allowance: Math.max(0, baseAllowance - deductions.breakfast_deduction - deductions.lunch_deduction - deductions.dinner_deduction),
      is_arrival_departure: false,
    });
    return days;
  }

  // Multi-day trip
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (current <= endDay) {
    const dateStr = toDateString(current);
    const isArrivalDay = dateStr === startDate;
    const isDepartureDay = dateStr === endDate;
    const isArrivalOrDeparture = isArrivalDay || isDepartureDay;

    // Arrival/departure days always get partial rate, full days get full rate
    const baseAllowance = isArrivalOrDeparture ? partialRate : fullRate;

    // Calculate hours for this day
    let hours: number;
    if (isArrivalDay) {
      const endOfDay = new Date(current);
      endOfDay.setHours(23, 59, 59, 999);
      hours = (endOfDay.getTime() - start.getTime()) / (1000 * 60 * 60);
    } else if (isDepartureDay) {
      const startOfDay = new Date(current);
      startOfDay.setHours(0, 0, 0, 0);
      hours = (end.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    } else {
      hours = 24;
    }

    const meals = mealMap.get(dateStr);
    const deductions = calcMealDeductions(baseAllowance, meals);

    days.push({
      date: dateStr,
      hours: Math.round(hours * 10) / 10,
      base_allowance: baseAllowance,
      ...deductions,
      net_allowance: Math.max(0, baseAllowance - deductions.breakfast_deduction - deductions.lunch_deduction - deductions.dinner_deduction),
      is_arrival_departure: isArrivalOrDeparture,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

function calcMealDeductions(
  baseAllowance: number,
  meals?: MealDeduction
): { breakfast_deduction: number; lunch_deduction: number; dinner_deduction: number } {
  if (!meals || baseAllowance === 0) {
    return { breakfast_deduction: 0, lunch_deduction: 0, dinner_deduction: 0 };
  }
  return {
    breakfast_deduction: meals.breakfast ? round2(baseAllowance * BREAKFAST_DEDUCTION_RATE) : 0,
    lunch_deduction: meals.lunch ? round2(baseAllowance * LUNCH_DEDUCTION_RATE) : 0,
    dinner_deduction: meals.dinner ? round2(baseAllowance * DINNER_DEDUCTION_RATE) : 0,
  };
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Get list of supported countries for the UI dropdown */
export function getSupportedCountries(): { code: string; name: string }[] {
  return [
    { code: "DE", name: "Deutschland" },
    { code: "AT", name: "Österreich" },
    { code: "CH", name: "Schweiz" },
    { code: "FR", name: "Frankreich" },
    { code: "GB", name: "Großbritannien" },
    { code: "US", name: "USA" },
    { code: "NL", name: "Niederlande" },
    { code: "IT", name: "Italien" },
    { code: "ES", name: "Spanien" },
    { code: "PL", name: "Polen" },
    { code: "CZ", name: "Tschechien" },
    { code: "HU", name: "Ungarn" },
    { code: "BE", name: "Belgien" },
    { code: "DK", name: "Dänemark" },
    { code: "SE", name: "Schweden" },
    { code: "NO", name: "Norwegen" },
    { code: "FI", name: "Finnland" },
    { code: "PT", name: "Portugal" },
    { code: "GR", name: "Griechenland" },
    { code: "IE", name: "Irland" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "SG", name: "Singapur" },
    { code: "AE", name: "VAE" },
    { code: "AU", name: "Australien" },
    { code: "LU", name: "Luxemburg" },
    { code: "HR", name: "Kroatien" },
    { code: "RO", name: "Rumänien" },
    { code: "BG", name: "Bulgarien" },
    { code: "TR", name: "Türkei" },
    { code: "IN", name: "Indien" },
  ];
}
