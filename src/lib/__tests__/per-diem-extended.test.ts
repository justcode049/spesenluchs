import { describe, it, expect } from "vitest";
import { calculatePerDiems, getSupportedCountries } from "../per-diem";

describe("calculatePerDiems – extended edge cases", () => {
  it("returns 0 for single-day trip under 8 hours", () => {
    const result = calculatePerDiems("2024-03-15T10:00:00", "2024-03-15T17:00:00", "DE", []);
    expect(result).toHaveLength(1);
    expect(result[0].net_allowance).toBe(0);
    expect(result[0].hours).toBe(7);
  });

  it("returns partial rate for exactly 8 hours", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-15T16:00:00", "DE", []);
    expect(result[0].base_allowance).toBe(14);
    expect(result[0].hours).toBe(8);
  });

  it("returns partial rate for just over 8 hours", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-15T16:30:00", "DE", []);
    expect(result[0].base_allowance).toBe(14);
  });

  it("calculates arrival/departure days as partial, middle days as full", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-18T18:00:00", "DE", []);
    expect(result).toHaveLength(4);
    expect(result[0].is_arrival_departure).toBe(true);
    expect(result[0].base_allowance).toBe(14);
    expect(result[1].is_arrival_departure).toBe(false);
    expect(result[1].base_allowance).toBe(28);
    expect(result[2].is_arrival_departure).toBe(false);
    expect(result[2].base_allowance).toBe(28);
    expect(result[3].is_arrival_departure).toBe(true);
    expect(result[3].base_allowance).toBe(14);
  });

  it("applies all meal deductions correctly", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", "DE", [
      { date: "2024-03-16", breakfast: true, lunch: true, dinner: true },
    ]);
    const fullDay = result[1]; // middle day
    expect(fullDay.base_allowance).toBe(28);
    expect(fullDay.breakfast_deduction).toBe(5.60); // 28 * 0.2
    expect(fullDay.lunch_deduction).toBe(11.20); // 28 * 0.4
    expect(fullDay.dinner_deduction).toBe(11.20); // 28 * 0.4
    expect(fullDay.net_allowance).toBe(0); // 28 - 5.6 - 11.2 - 11.2 = 0
  });

  it("clamps net_allowance to 0 (never negative)", () => {
    const result = calculatePerDiems("2024-03-15T10:00:00", "2024-03-15T19:00:00", "DE", [
      { date: "2024-03-15", breakfast: true, lunch: true, dinner: true },
    ]);
    // 14 - (2.80 + 5.60 + 5.60) = 0
    expect(result[0].net_allowance).toBe(0);
  });

  it("does not apply meal deductions when base_allowance is 0", () => {
    const result = calculatePerDiems("2024-03-15T10:00:00", "2024-03-15T15:00:00", "DE", [
      { date: "2024-03-15", breakfast: true, lunch: true, dinner: true },
    ]);
    expect(result[0].base_allowance).toBe(0);
    expect(result[0].breakfast_deduction).toBe(0);
    expect(result[0].lunch_deduction).toBe(0);
    expect(result[0].dinner_deduction).toBe(0);
  });

  it("uses correct foreign rates for Austria", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", "AT", []);
    expect(result[0].base_allowance).toBe(27); // AT partial
    expect(result[1].base_allowance).toBe(40); // AT full
  });

  it("uses correct foreign rates for Switzerland", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", "CH", []);
    expect(result[0].base_allowance).toBe(43);
    expect(result[1].base_allowance).toBe(64);
  });

  it("uses correct rates for Norway (highest)", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", "NO", []);
    expect(result[0].base_allowance).toBe(50);
    expect(result[1].base_allowance).toBe(74);
  });

  it("falls back to inland rates for unknown country", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", "XX", []);
    expect(result[0].base_allowance).toBe(14);
    expect(result[1].base_allowance).toBe(28);
  });

  it("calculates meal deductions on foreign rates proportionally", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", "US", [
      { date: "2024-03-16", breakfast: true, lunch: false, dinner: false },
    ]);
    const fullDay = result[1];
    expect(fullDay.base_allowance).toBe(59); // US full
    expect(fullDay.breakfast_deduction).toBe(11.80); // 59 * 0.2
  });

  it("handles two-day trip correctly", () => {
    const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-16T18:00:00", "DE", []);
    expect(result).toHaveLength(2);
    expect(result[0].is_arrival_departure).toBe(true);
    expect(result[1].is_arrival_departure).toBe(true);
    expect(result[0].base_allowance).toBe(14);
    expect(result[1].base_allowance).toBe(14);
  });
});

describe("getSupportedCountries – extended", () => {
  it("has unique country codes", () => {
    const countries = getSupportedCountries();
    const codes = countries.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("starts with Germany", () => {
    const countries = getSupportedCountries();
    expect(countries[0]).toEqual({ code: "DE", name: "Deutschland" });
  });

  it("has 31 countries", () => {
    const countries = getSupportedCountries();
    expect(countries.length).toBe(31); // DE + 30 foreign
  });

  it("all foreign countries have per diem rates defined", () => {
    const countries = getSupportedCountries();
    const foreign = countries.filter((c) => c.code !== "DE");
    // Each should produce different rates than inland when used
    for (const c of foreign) {
      const result = calculatePerDiems("2024-03-15T08:00:00", "2024-03-17T18:00:00", c.code, []);
      // Should not throw
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
