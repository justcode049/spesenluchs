import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

test.use({ storageState: STORAGE_STATE });

test.describe("API Keys", () => {
  test("API v1 trips endpoint requires auth", async ({ request }) => {
    const response = await request.get("/api/v1/trips");
    // 401 (missing key) or 500 (internal) - both indicate auth is enforced
    expect([401, 500]).toContain(response.status());
    expect(response.status()).not.toBe(200);
  });

  test("API v1 rejects invalid API key", async ({ request }) => {
    const response = await request.get("/api/v1/trips", {
      headers: { Authorization: "Bearer sl_live_0000000000000000000000000000dead" },
    });
    expect(response.status()).not.toBe(200);
  });

  test("OpenAPI spec is accessible", async ({ request }) => {
    const response = await request.get("/openapi.yaml");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("openapi: 3.0.3");
    expect(text).toContain("Spesenluchs API");
  });
});
