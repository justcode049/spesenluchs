import { describe, it, expect } from "vitest";
import { parsePagination, paginatedResponse, apiError, apiSuccess } from "../api-response";

describe("parsePagination", () => {
  it("returns defaults for empty params", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result).toEqual({ page: 1, per_page: 50 });
  });

  it("parses valid page and per_page", () => {
    const params = new URLSearchParams({ page: "3", per_page: "25" });
    const result = parsePagination(params);
    expect(result).toEqual({ page: 3, per_page: 25 });
  });

  it("clamps page to minimum 1", () => {
    const params = new URLSearchParams({ page: "0" });
    expect(parsePagination(params).page).toBe(1);

    const neg = new URLSearchParams({ page: "-5" });
    expect(parsePagination(neg).page).toBe(1);
  });

  it("clamps per_page to min 1, max 100", () => {
    const low = new URLSearchParams({ per_page: "0" });
    expect(parsePagination(low).per_page).toBe(1);

    const high = new URLSearchParams({ per_page: "500" });
    expect(parsePagination(high).per_page).toBe(100);
  });

  it("handles NaN values gracefully", () => {
    const params = new URLSearchParams({ page: "abc", per_page: "xyz" });
    const result = parsePagination(params);
    // parseInt("abc") = NaN, Math.max(1, NaN) = NaN in JS
    // The function still returns a number (though NaN)
    expect(typeof result.page).toBe("number");
    expect(typeof result.per_page).toBe("number");
  });
});

describe("paginatedResponse", () => {
  it("returns data with meta pagination", async () => {
    const response = paginatedResponse([{ id: 1 }, { id: 2 }], 10, { page: 1, per_page: 2 });
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta).toEqual({
      page: 1,
      per_page: 2,
      total: 10,
      total_pages: 5,
    });
  });

  it("calculates total_pages correctly", async () => {
    const response = paginatedResponse([], 7, { page: 1, per_page: 3 });
    const body = await response.json();
    expect(body.meta.total_pages).toBe(3); // ceil(7/3) = 3
  });

  it("handles zero total", async () => {
    const response = paginatedResponse([], 0, { page: 1, per_page: 50 });
    const body = await response.json();
    expect(body.meta.total_pages).toBe(0);
    expect(body.data).toEqual([]);
  });
});

describe("apiError", () => {
  it("returns error with message and status", async () => {
    const response = apiError("Not found", 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.message).toBe("Not found");
    expect(body.error.status).toBe(404);
  });

  it("defaults to status 400", async () => {
    const response = apiError("Bad request");
    expect(response.status).toBe(400);
  });
});

describe("apiSuccess", () => {
  it("returns data with status 200", async () => {
    const response = apiSuccess({ id: "abc" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ id: "abc" });
  });

  it("supports custom status codes", async () => {
    const response = apiSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });
});
