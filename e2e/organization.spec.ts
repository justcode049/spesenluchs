import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

test.use({ storageState: STORAGE_STATE });

test.describe("Organisation – kompletter Lifecycle", () => {
  let orgSlug: string;

  test("Organisation erstellen", async ({ page }) => {
    await page.goto("/org/new");
    await expect(page.getByRole("heading", { name: "Organisation erstellen" })).toBeVisible();

    // Eindeutigen Namen generieren
    const orgName = `E2E Test Org ${Date.now()}`;
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(orgName);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();

    // Sollte zu den Org-Settings weiterleiten
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    // Org-Name sollte angezeigt werden
    await expect(page.getByRole("heading", { name: orgName })).toBeVisible();

    // Slug aus URL extrahieren für Folge-Tests
    const url = page.url();
    orgSlug = url.match(/\/org\/([^/]+)\/settings/)?.[1] || "";
    expect(orgSlug).toBeTruthy();
  });

  test("Org-Settings zeigt Admin-Funktionen", async ({ page }) => {
    // Zuerst eine Org erstellen
    await page.goto("/org/new");
    const orgName = `E2E Settings Test ${Date.now()}`;
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(orgName);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    // Admin-Links sollten sichtbar sein
    await expect(page.getByRole("link", { name: "Mitglieder" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Team-Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Genehmigungen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit-Log" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kostenstellen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "API-Keys" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Webhooks" })).toBeVisible();
    await expect(page.getByRole("link", { name: "SSO" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Integrationen" })).toBeVisible();

    // Org-Name Input sollte editierbar sein
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(orgName);

    // Kostenstellen-Pflichtfeld Toggle
    await expect(page.getByText("Kostenstelle bei Reisen als Pflichtfeld")).toBeVisible();
  });

  test("Kostenstellen-Seite über Settings erreichbar", async ({ page }) => {
    // Org erstellen
    await page.goto("/org/new");
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(`E2E KST Test ${Date.now()}`);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    // Zu Kostenstellen navigieren
    await page.getByRole("link", { name: "Kostenstellen" }).click();
    await page.waitForURL(/\/cost-centers/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Kostenstellen" })).toBeVisible();

    // Leerer Zustand
    await expect(page.getByText("Noch keine Kostenstellen angelegt")).toBeVisible();

    // Kostenstelle anlegen
    await page.getByRole("button", { name: "+ Neu" }).click();
    await page.locator('input[placeholder="z.B. 4711"]').fill("1001");
    await page.locator('input[placeholder="z.B. Vertrieb"]').fill("Vertrieb");
    await page.getByRole("button", { name: "Erstellen" }).click();

    // Kostenstelle sollte in der Liste erscheinen
    await expect(page.getByText("1001 – Vertrieb")).toBeVisible({ timeout: 5000 });
  });

  test("API-Keys-Seite über Settings erreichbar", async ({ page }) => {
    await page.goto("/org/new");
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(`E2E API Test ${Date.now()}`);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    await page.getByRole("link", { name: "API-Keys" }).click();
    await page.waitForURL(/\/api-keys/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "API-Keys" })).toBeVisible();
    await expect(page.getByText("Noch keine API-Keys erstellt")).toBeVisible();
  });

  test("Webhooks-Seite über Settings erreichbar", async ({ page }) => {
    await page.goto("/org/new");
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(`E2E WH Test ${Date.now()}`);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    await page.getByRole("link", { name: "Webhooks" }).click();
    await page.waitForURL(/\/webhooks/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();
    await expect(page.getByText("Noch keine Webhooks konfiguriert")).toBeVisible();
  });

  test("SSO-Seite über Settings erreichbar", async ({ page }) => {
    await page.goto("/org/new");
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(`E2E SSO Test ${Date.now()}`);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    await page.getByRole("link", { name: "SSO" }).click();
    await page.waitForURL(/\/sso/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Enterprise SSO/ })).toBeVisible();
  });

  test("Integrationen-Seite über Settings erreichbar", async ({ page }) => {
    await page.goto("/org/new");
    await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(`E2E ERP Test ${Date.now()}`);
    await page.getByRole("button", { name: "Organisation erstellen" }).click();
    await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });

    await page.getByRole("link", { name: "Integrationen" }).click();
    await page.waitForURL(/\/integrations/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "ERP-Integrationen" })).toBeVisible();
    await expect(page.getByText("Noch keine ERP-Integrationen konfiguriert")).toBeVisible();
  });
});
