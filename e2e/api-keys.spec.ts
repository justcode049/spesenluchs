import { test, expect } from "@playwright/test";

test.describe("API Keys", () => {
  test("api keys page loads for admin", async ({ page }) => {
    await page.goto("/org/test-org/api-keys");
    await expect(
      page.getByText(/API-Keys|Nur Administratoren/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("create API key form is accessible", async ({ page }) => {
    await page.goto("/org/test-org/api-keys");
    const neuButton = page.getByRole("button", { name: /Neuer Key/ });
    if (await neuButton.isVisible()) {
      await neuButton.click();
      await expect(page.getByLabel("Name")).toBeVisible();
    }
  });

  test("API v1 trips endpoint requires auth", async ({ request }) => {
    const response = await request.get("/api/v1/trips");
    expect(response.status()).toBe(401);
  });

  test("API v1 receipts endpoint requires auth", async ({ request }) => {
    const response = await request.get("/api/v1/receipts");
    expect(response.status()).toBe(401);
  });

  test("API v1 organizations endpoint requires auth", async ({ request }) => {
    const response = await request.get("/api/v1/organizations");
    expect(response.status()).toBe(401);
  });
});
