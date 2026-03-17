// ECB exchange rate fetcher
// Uses the European Central Bank's public API for daily rates

const ECB_API = "https://data-api.ecb.europa.eu/service/data/EXR/D.{currency}.EUR.SP00.A?format=csvdata&lastNObservations=1";

// Fallback rates (approximate, updated 2024)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.95,
  JPY: 162.0,
  CNY: 7.85,
  SEK: 11.2,
  NOK: 11.5,
  DKK: 7.46,
  PLN: 4.32,
  CZK: 25.2,
  HUF: 395.0,
  RON: 4.97,
  BGN: 1.96,
  TRY: 35.0,
  AUD: 1.65,
  SGD: 1.46,
  AED: 3.97,
  INR: 90.5,
};

/**
 * Get exchange rate from a foreign currency to EUR.
 * Returns how many units of foreign currency = 1 EUR.
 * To convert foreign amount to EUR: amount / rate
 */
export async function getExchangeRate(currency: string): Promise<number | null> {
  if (currency === "EUR") return 1;

  try {
    const url = ECB_API.replace("{currency}", currency);
    const response = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h

    if (!response.ok) {
      return FALLBACK_RATES[currency] || null;
    }

    const text = await response.text();
    // Parse CSV - last line contains the rate
    const lines = text.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    const columns = lastLine.split(",");
    // OBS_VALUE is typically the 7th column in ECB CSV format
    const rate = parseFloat(columns[columns.length - 1]);

    if (isNaN(rate)) {
      return FALLBACK_RATES[currency] || null;
    }

    return rate;
  } catch {
    return FALLBACK_RATES[currency] || null;
  }
}

/**
 * Convert an amount from foreign currency to EUR
 */
export function convertToEur(amount: number, rate: number): number {
  return Math.round((amount / rate) * 100) / 100;
}
