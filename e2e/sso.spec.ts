import { test, expect } from "@playwright/test";

test.describe("SSO", () => {
  test("SSO login button is visible on login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Oder mit Firmen-SSO anmelden")).toBeVisible();
    await expect(page.getByText("Mit Microsoft anmelden")).toBeVisible();
  });

  test("SSO authorize requires email parameter", async ({ request }) => {
    const response = await request.get("/api/auth/sso/authorize");
    expect(response.status()).toBe(400);
  });

  test("SSO authorize returns 404 for unknown domain", async ({ request }) => {
    const response = await request.get("/api/auth/sso/authorize?email=test@unknown-domain-xyz.com");
    expect(response.status()).toBe(404);
  });

  test("SSO config API requires auth", async ({ request }) => {
    const response = await request.get("/api/sso-configs");
    // Returns 400 (missing org_id) or 401
    expect([400, 401]).toContain(response.status());
  });
});
