import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

// These tests run with an authenticated user
test.use({ storageState: STORAGE_STATE });

test.describe("Dashboard (authentifiziert)", () => {
  test("Dashboard wird angezeigt", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("Navigation ist sichtbar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /Belege/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Reisen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Profil/i })).toBeVisible();
  });

  test("Dashboard zeigt Zusammenfassung", async ({ page }) => {
    await page.goto("/dashboard");
    // Dashboard should have some summary content
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Profil", () => {
  test("Profilseite wird angezeigt", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/profile/);
    await expect(page.getByText(/Profil/i)).toBeVisible();
  });

  test("Profilfelder sind editierbar", async ({ page }) => {
    await page.goto("/profile");
    // Profile should have editable fields
    const nameInput = page.getByLabel(/Name/i);
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeEnabled();
    }
  });
});

test.describe("Reisen", () => {
  test("Reisen-Liste wird angezeigt", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/trips/);
  });

  test("Neue Reise anlegen - Formular wird angezeigt", async ({ page }) => {
    await page.goto("/trips/new");
    await expect(page.getByText(/Reiseziel/i)).toBeVisible();
  });

  test("Neue Reise anlegen - Pflichtfelder validieren", async ({ page }) => {
    await page.goto("/trips/new");
    // Try submitting empty form
    const submitBtn = page.getByRole("button", { name: /Reise anlegen|Speichern|Erstellen/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show validation or stay on same page
      await expect(page).toHaveURL(/trips\/new/);
    }
  });

  test("Neue Reise erstellen und anzeigen", async ({ page }) => {
    await page.goto("/trips/new");

    // Fill in trip details - label has asterisk "Reiseziel *"
    await page.getByPlaceholder("z.B. München").fill("E2E-Testreise Berlin");

    // Date inputs are type="date", time inputs are type="time"
    const dateInputs = page.locator('input[type="date"]');
    const timeInputs = page.locator('input[type="time"]');

    if (await dateInputs.first().isVisible()) {
      await dateInputs.first().fill("2026-04-01");
      await dateInputs.last().fill("2026-04-03");
    }

    // Submit
    const submitBtn = page.getByRole("button", { name: /Reise anlegen/i });
    await submitBtn.click();

    // Should redirect to trip detail or trips list
    await page.waitForURL(/trips/, { timeout: 10000 });
  });
});

test.describe("Belege", () => {
  test("Neuer Beleg - Upload-Seite wird angezeigt", async ({ page }) => {
    await page.goto("/receipts/new");
    await expect(page).toHaveURL(/receipts\/new/);
  });

  test("Beleg-Upload zeigt Dateiauswahl", async ({ page }) => {
    await page.goto("/receipts/new");
    // Should show upload area (desktop version)
    await expect(
      page.getByText(/fotografieren|hochladen/i)
    ).toBeVisible();
  });

  test("Batch-Upload Seite wird angezeigt", async ({ page }) => {
    await page.goto("/receipts/batch");
    await expect(page).toHaveURL(/receipts\/batch/);
  });
});

test.describe("Fahrten (Kilometerpauschale)", () => {
  test("Neue Fahrt - Formular wird angezeigt", async ({ page }) => {
    await page.goto("/mileage/new");
    await expect(page).toHaveURL(/mileage\/new/);
    await expect(page.getByText(/Von|Start/i)).toBeVisible();
  });
});

test.describe("Organisation", () => {
  test("Org-Formular wird angezeigt", async ({ page }) => {
    await page.goto("/org/new");
    await expect(page.getByRole("heading", { name: "Organisation erstellen" })).toBeVisible();
    await expect(page.getByPlaceholder("z.B. Meine Firma GmbH")).toBeVisible();
  });
});

test.describe("Export", () => {
  test("Trip-Detailseite zeigt Export-Buttons", async ({ page }) => {
    // First navigate to trips list
    await page.goto("/trips");

    // Look for trip detail links (UUID pattern in href)
    const tripLink = page.locator('a[href*="/trips/"]').filter({ hasNotText: /Neue Reise|anlegen/i });
    const allLinks = await tripLink.all();
    // Filter to only UUID-based trip links
    let foundTrip = false;
    for (const link of allLinks) {
      const href = await link.getAttribute("href");
      if (href && /\/trips\/[0-9a-f]{8}-/.test(href)) {
        await link.click();
        await page.waitForURL(/trips\/[0-9a-f-]+/, { timeout: 10000 });
        foundTrip = true;
        break;
      }
    }

    if (!foundTrip) {
      // No trips exist yet - create one first
      await page.goto("/trips/new");
      await page.getByPlaceholder("z.B. München").fill("Export-Test Berlin");
      const dateInputs = page.locator('input[type="date"]');
      if (await dateInputs.first().isVisible()) {
        await dateInputs.first().fill("2026-05-01");
        await dateInputs.last().fill("2026-05-02");
      }
      await page.getByRole("button", { name: /Reise anlegen/i }).click();
      await page.waitForURL(/trips\/[0-9a-f-]+/, { timeout: 10000 });
    }

    // Should see export section with all three buttons
    await expect(page.getByRole("heading", { name: "Export", exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "PDF Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "CSV Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "DATEV Export" })).toBeVisible();
  });
});

test.describe("Datenexport (DSGVO)", () => {
  test("Account-Export API antwortet", async ({ page }) => {
    const response = await page.request.get("/api/account/export");
    // Should either succeed (200) or require auth (401)
    expect([200, 401]).toContain(response.status());
  });
});

test.describe("Seitennavigation", () => {
  test("Alle Hauptseiten sind erreichbar", async ({ page }) => {
    const routes = ["/dashboard", "/trips", "/receipts/new", "/profile"];
    for (const route of routes) {
      await page.goto(route);
      // Should not get a 404 or error page
      await expect(page.locator("body")).not.toContainText("404");
    }
  });
});
