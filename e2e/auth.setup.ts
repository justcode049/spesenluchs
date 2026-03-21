import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@spesenluchs.de";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "testpass123!";
const TEST_NAME = "E2E Testuser";

setup("authenticate", async ({ page }) => {
  // Try to login first
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Passwort").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  // If login succeeds, we land on /dashboard
  // If it fails (user doesn't exist), register first
  const response = await Promise.race([
    page.waitForURL("**/dashboard", { timeout: 5000 }).then(() => "dashboard"),
    page.waitForSelector(".bg-red-50", { timeout: 5000 }).then(() => "error"),
  ]);

  if (response === "error") {
    // Register new user
    await page.goto("/register");
    await page.getByLabel("Name").fill(TEST_NAME);
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Registrieren" }).click();

    // Wait for success message or redirect
    await expect(
      page.getByText("Konto erstellt").or(page.locator("[data-testid='dashboard']"))
    ).toBeVisible({ timeout: 10000 });

    // If email confirmation is required, we need to login via Supabase Admin API
    // For now, try logging in directly (works if email confirmation is disabled)
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  }

  // Save auth state
  await page.context().storageState({ path: STORAGE_STATE });
});
