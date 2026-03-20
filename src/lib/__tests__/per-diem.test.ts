import { describe, it, expect } from "vitest";
import { calculatePerDiems, getSupportedCountries } from "../per-diem";

describe("calculatePerDiems", () => {
  // Use local times without Z suffix (matches how the app stores them)
  it("calculates full day allowance for inland multi-day trip", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T08:00:00",
      "2026-03-12T18:00:00",
      "DE",
      []
    );
    // 3 days: arrival, full day, departure
    expect(allowances).toHaveLength(3);
    expect(allowances[0].is_arrival_departure).toBe(true);
    expect(allowances[0].base_allowance).toBe(14);
    expect(allowances[1].is_arrival_departure).toBe(false);
    expect(allowances[1].base_allowance).toBe(28);
    expect(allowances[2].is_arrival_departure).toBe(true);
    expect(allowances[2].base_allowance).toBe(14);
  });

  it("applies meal deductions correctly", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T08:00:00",
      "2026-03-12T18:00:00",
      "DE",
      [{ date: "2026-03-11", breakfast: true, lunch: false, dinner: false }]
    );
    const fullDay = allowances.find((d) => d.date === "2026-03-11");
    expect(fullDay).toBeDefined();
    expect(fullDay!.breakfast_deduction).toBeCloseTo(5.6, 1);
    expect(fullDay!.net_allowance).toBeCloseTo(22.4, 1);
  });

  it("calculates single day trip (>8h = 14 EUR)", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T07:00:00",
      "2026-03-10T20:00:00",
      "DE",
      []
    );
    expect(allowances).toHaveLength(1);
    expect(allowances[0].base_allowance).toBe(14);
  });

  it("returns 0 for single day trip <8h", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T10:00:00",
      "2026-03-10T16:00:00",
      "DE",
      []
    );
    expect(allowances).toHaveLength(1);
    expect(allowances[0].base_allowance).toBe(0);
  });

  it("uses foreign rates for non-DE countries", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T08:00:00",
      "2026-03-12T18:00:00",
      "US",
      []
    );
    expect(allowances).toHaveLength(3);
    // US full day rate = 59€
    const fullDay = allowances[1];
    expect(fullDay.base_allowance).toBe(59);
  });

  it("meal deduction does not go below 0", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T08:00:00",
      "2026-03-12T18:00:00",
      "DE",
      [{ date: "2026-03-10", breakfast: true, lunch: true, dinner: true }]
    );
    // Arrival day (14€) with all meals: 20%+40%+40% = 100% → 0
    expect(allowances[0].net_allowance).toBe(0);
  });

  it("returns correct total without deductions", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T08:00:00",
      "2026-03-12T18:00:00",
      "DE",
      []
    );
    const total = allowances.reduce((sum, d) => sum + d.net_allowance, 0);
    // 14 + 28 + 14 = 56
    expect(total).toBe(56);
  });

  it("falls back to inland rates for unknown country", () => {
    const allowances = calculatePerDiems(
      "2026-03-10T08:00:00",
      "2026-03-11T18:00:00",
      "XX",
      []
    );
    expect(allowances[0].base_allowance).toBe(14);
    expect(allowances[1].base_allowance).toBe(14);
  });
});

describe("getSupportedCountries", () => {
  it("returns an array with Germany first", () => {
    const countries = getSupportedCountries();
    expect(countries.length).toBeGreaterThan(0);
    expect(countries[0].code).toBe("DE");
  });

  it("includes Germany", () => {
    const countries = getSupportedCountries();
    const de = countries.find((c) => c.code === "DE");
    expect(de).toBeDefined();
    expect(de!.name).toContain("Deutschland");
  });

  it("has code and name for each country", () => {
    const countries = getSupportedCountries();
    for (const c of countries) {
      expect(c.code).toBeTruthy();
      expect(c.name).toBeTruthy();
    }
  });
});
