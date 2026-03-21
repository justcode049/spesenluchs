import { test, expect } from "@playwright/test";

test.describe("SSO", () => {
  test("SSO config page loads for admin", async ({ page }) => {
    await page.goto("/org/test-org/sso");
    await expect(
      page.getByText(/Enterprise SSO|Nur Administratoren/)
    ).toBeVisible({ timeout: 10000 });
  });

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
});
