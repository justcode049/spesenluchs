import { describe, it, expect } from "vitest";
import {
  parseCostCenterCsv,
  validateCostCenter,
  formatCostCenter,
  filterActiveCostCenters,
} from "../cost-center-utils";
import type { CostCenter } from "../types";

describe("parseCostCenterCsv", () => {
  it("parses valid CSV with required fields", () => {
    const csv = `Nummer;Name\n4711;Vertrieb\n4712;Marketing`;
    const result = parseCostCenterCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ number: "4711", name: "Vertrieb" });
    expect(result.rows[1]).toEqual({ number: "4712", name: "Marketing" });
  });

  it("parses CSV with optional fields", () => {
    const csv = `Nummer;Name;Kostenträger;Gültig_ab;Gültig_bis\n4711;Vertrieb;KT001;2024-01-01;2024-12-31`;
    const result = parseCostCenterCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toEqual({
      number: "4711",
      name: "Vertrieb",
      cost_object_number: "KT001",
      valid_from: "2024-01-01",
      valid_to: "2024-12-31",
    });
  });

  it("returns error for missing header fields", () => {
    const csv = `Foo;Bar\n1;Test`;
    const result = parseCostCenterCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it("returns error for too few lines", () => {
    const csv = `Nummer;Name`;
    const result = parseCostCenterCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns error for rows missing required data", () => {
    const csv = `Nummer;Name\n;Vertrieb\n4712;`;
    const result = parseCostCenterCsv(csv);
    expect(result.errors.length).toBe(2);
    expect(result.rows).toHaveLength(0);
  });

  it("skips empty lines", () => {
    const csv = `Nummer;Name\n4711;Vertrieb\n\n4712;Marketing`;
    const result = parseCostCenterCsv(csv);
    expect(result.rows).toHaveLength(2);
  });

  it("handles quoted fields", () => {
    const csv = `Nummer;Name\n"4711";"Vertrieb & Co"`;
    const result = parseCostCenterCsv(csv);
    expect(result.rows[0].number).toBe("4711");
    expect(result.rows[0].name).toBe("Vertrieb & Co");
  });
});

describe("validateCostCenter", () => {
  it("returns no errors for valid data", () => {
    expect(validateCostCenter({ number: "4711", name: "Vertrieb" })).toHaveLength(0);
  });

  it("returns errors for missing fields", () => {
    expect(validateCostCenter({}).length).toBeGreaterThan(0);
    expect(validateCostCenter({ number: "", name: "" }).length).toBeGreaterThan(0);
  });

  it("returns error for too long fields", () => {
    const errors = validateCostCenter({
      number: "x".repeat(21),
      name: "x".repeat(101),
    });
    expect(errors.length).toBe(2);
  });
});

describe("formatCostCenter", () => {
  it("formats number and name", () => {
    const cc = { number: "4711", name: "Vertrieb" } as CostCenter;
    expect(formatCostCenter(cc)).toBe("4711 – Vertrieb");
  });
});

describe("filterActiveCostCenters", () => {
  const baseCc: CostCenter = {
    id: "1",
    organization_id: "org1",
    cost_object_id: null,
    number: "4711",
    name: "Vertrieb",
    active: true,
    valid_from: null,
    valid_to: null,
    created_at: "",
    updated_at: "",
  };

  it("includes active centers without date restrictions", () => {
    const result = filterActiveCostCenters([baseCc]);
    expect(result).toHaveLength(1);
  });

  it("excludes inactive centers", () => {
    const result = filterActiveCostCenters([{ ...baseCc, active: false }]);
    expect(result).toHaveLength(0);
  });

  it("excludes centers not yet valid", () => {
    const result = filterActiveCostCenters(
      [{ ...baseCc, valid_from: "2099-01-01" }],
      "2024-06-15"
    );
    expect(result).toHaveLength(0);
  });

  it("excludes expired centers", () => {
    const result = filterActiveCostCenters(
      [{ ...baseCc, valid_to: "2020-12-31" }],
      "2024-06-15"
    );
    expect(result).toHaveLength(0);
  });
});
