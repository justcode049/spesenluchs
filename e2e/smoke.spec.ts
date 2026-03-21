import { test, expect } from "@playwright/test";

test.describe("Smoke Tests (ohne Auth)", () => {
  test("Login-Seite wird angezeigt", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Spesenluchs")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden", exact: true })).toBeVisible();
  });

  test("Register-Seite wird angezeigt", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Konto erstellen")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
  });

  test("Unautorisierter Zugriff leitet zu Login weiter", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    await expect(page.getByText("Spesenluchs")).toBeVisible();
  });

  test("Login mit falschem Passwort zeigt Fehler", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("falsch@example.com");
    await page.getByLabel("Passwort").fill("falschespasswort");
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page.locator(".bg-red-50")).toBeVisible({ timeout: 10000 });
  });

  test("Register mit kurzem Passwort zeigt Fehler", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Test");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Passwort").fill("123");
    await page.getByRole("button", { name: "Registrieren" }).click();
    await expect(page.getByText("mindestens 6 Zeichen")).toBeVisible();
  });

  test("Navigation zwischen Login und Register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Registrieren" }).click();
    await expect(page.getByText("Konto erstellen")).toBeVisible();
    await page.getByRole("link", { name: "Anmelden" }).click();
    await expect(page.getByText("Melde dich an")).toBeVisible();
  });
});
