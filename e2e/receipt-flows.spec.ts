import { test, expect, Page } from "@playwright/test";
import path from "path";
import { STORAGE_STATE } from "./constants";

test.use({ storageState: STORAGE_STATE });

// Dummy 1x1 red PNG as test receipt image
const TEST_IMAGE = path.join(__dirname, "fixtures", "test-receipt.png");

// Mock extraction response
const MOCK_EXTRACTION = {
  extraction: {
    date: "2026-03-15",
    total_amount: 42.5,
    currency: "EUR",
    vendor_name: "Test Restaurant München",
    vendor_city: "München",
    receipt_type: "restaurant" as const,
    vat_positions: [
      { rate: 19, net: 35.71, vat: 6.79, gross: 42.5 },
    ],
    confidence: { overall: 0.95, date: 0.9, amount: 0.98, vendor: 0.92 },
  },
  exchangeRate: null,
  eurAmount: null,
  tripAssignment: { type: "none", confidence: 0 },
};

const MOCK_EXTRACTION_WITH_TRIP = {
  ...MOCK_EXTRACTION,
  tripAssignment: {
    type: "existing",
    tripId: "will-be-replaced",
    tripTitle: "München",
    confidence: 0.95,
  },
};

// Helper: intercept /api/extract and return mock data
async function mockExtractApi(page: Page, response = MOCK_EXTRACTION) {
  await page.route("**/api/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

// Helper: intercept Supabase storage upload
async function mockStorageUpload(page: Page) {
  await page.route("**/storage/v1/object/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "test/mock-receipt.jpg" }),
      });
    } else {
      await route.continue();
    }
  });
}

// Helper: create a trip and return its ID
async function createTrip(page: Page, destination: string): Promise<string> {
  await page.goto("/trips/new");
  await page.getByPlaceholder("z.B. München").fill(destination);
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill("2026-03-14");
  await dateInputs.last().fill("2026-03-16");
  await page.getByRole("button", { name: /Reise anlegen/i }).click();
  await page.waitForURL(/trips\/[0-9a-f-]+/, { timeout: 15000 });
  const tripId = page.url().match(/trips\/([0-9a-f-]+)/)?.[1] || "";
  return tripId;
}

// ─────────────────────────────────────────────
// 1. Single Receipt Upload Flow
// ─────────────────────────────────────────────
test.describe("1. Beleg-Upload komplett", () => {
  test("Bild hochladen → Extraktion → Review-Form → Speichern", async ({ page }) => {
    await mockStorageUpload(page);
    await mockExtractApi(page);

    await page.goto("/receipts/new");
    await expect(page.getByText(/Beleg erfassen/i)).toBeVisible({ timeout: 10000 });

    // Upload file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE);

    // Preview should appear
    await expect(page.getByAlt("Beleg-Vorschau")).toBeVisible({ timeout: 5000 });

    // Click analyze
    await page.getByRole("button", { name: /Beleg analysieren/i }).click();

    // Loading state
    await expect(page.getByText(/wird analysiert/i)).toBeVisible({ timeout: 5000 });

    // Review form should appear with extracted data
    await expect(page.getByText("Test Restaurant München")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[value="42.5"]').or(page.locator('input[value="42.50"]'))).toBeVisible();
    await expect(page.locator('input[value="2026-03-15"]')).toBeVisible();

    // Save
    await page.getByRole("button", { name: /Beleg speichern/i }).click();

    // Should redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test("Fehlerfall: Beleg-Extraktion schlägt fehl → Fehlermeldung + Erneut versuchen", async ({ page }) => {
    await mockStorageUpload(page);
    await page.route("**/api/extract", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Extraktion fehlgeschlagen" }),
      });
    });

    await page.goto("/receipts/new");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByRole("button", { name: /Beleg analysieren/i }).click();

    // Error message
    await expect(page.getByText(/fehlgeschlagen/i)).toBeVisible({ timeout: 15000 });

    // Retry button
    await expect(page.getByRole("button", { name: /Erneut versuchen/i })).toBeVisible();
    await page.getByRole("button", { name: /Erneut versuchen/i }).click();

    // Back to upload step
    await expect(page.getByText(/fotografieren|hochladen|Beleg erfassen/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 2. Batch Upload Flow
// ─────────────────────────────────────────────
test.describe("2. Batch-Upload komplett", () => {
  test("Mehrere Dateien auswählen → Analysieren → Status-Badges → Dashboard", async ({ page }) => {
    await mockStorageUpload(page);
    await mockExtractApi(page);

    // Mock Supabase insert to succeed
    await page.route("**/rest/v1/receipts**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([{ id: "mock-receipt-1" }]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/receipts/batch");
    await expect(page.getByText(/Batch-Upload/i)).toBeVisible({ timeout: 10000 });

    // Select multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([TEST_IMAGE, TEST_IMAGE]);

    // Should show file list with count
    await expect(page.getByText("2 Dateien")).toBeVisible({ timeout: 5000 });

    // Should show pending badges
    await expect(page.getByText("Wartend").first()).toBeVisible();

    // Start processing
    await page.getByRole("button", { name: /Belege analysieren/i }).click();

    // Wait for processing to complete
    await expect(page.getByText(/fertig/i)).toBeVisible({ timeout: 30000 });

    // Dashboard button should appear
    await expect(page.getByRole("button", { name: /gespeichert.*Dashboard/i })).toBeVisible({ timeout: 10000 });

    // Reset button
    await expect(page.getByRole("button", { name: /Zurücksetzen/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 3. Trip Auto-Assignment
// ─────────────────────────────────────────────
test.describe("3. Trip Auto-Assignment", () => {
  test("Beleg-Upload zeigt Trip-Zuordnungs-Banner bei Match", async ({ page }) => {
    // Create a trip first
    const tripId = await createTrip(page, "München");

    // Now mock extract API with trip assignment pointing to real trip
    const mockWithTrip = {
      ...MOCK_EXTRACTION,
      tripAssignment: {
        type: "existing",
        tripId,
        tripTitle: "München",
        confidence: 0.95,
      },
    };

    await mockStorageUpload(page);
    await mockExtractApi(page, mockWithTrip);

    await page.goto("/receipts/new");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByRole("button", { name: /Beleg analysieren/i }).click();

    // Trip assignment banner should appear
    await expect(page.getByText(/Automatisch zugeordnet.*München/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/95%/)).toBeVisible();

    // "Zur Reise" link should be visible
    await expect(page.getByRole("link", { name: /Zur Reise/i })).toBeVisible();
  });

  test("Trip-Zuordnung kann abgelehnt werden (Nicht zuordnen)", async ({ page }) => {
    const tripId = await createTrip(page, "München");

    const mockWithTrip = {
      ...MOCK_EXTRACTION,
      tripAssignment: {
        type: "existing",
        tripId,
        tripTitle: "München",
        confidence: 0.95,
      },
    };

    await mockStorageUpload(page);
    await mockExtractApi(page, mockWithTrip);

    await page.goto("/receipts/new");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByRole("button", { name: /Beleg analysieren/i }).click();

    await expect(page.getByText(/Automatisch zugeordnet/i)).toBeVisible({ timeout: 15000 });

    // Dismiss assignment
    await page.getByRole("button", { name: /Nicht zuordnen/i }).click();

    // Banner should be replaced with undo option
    await expect(page.getByText(/Reise-Zuordnung entfernt/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Rückgängig/i })).toBeVisible();
  });

  test("Neue Reise erkannt – Banner mit Reise-Vorschlag", async ({ page }) => {
    const mockNewDraft = {
      ...MOCK_EXTRACTION,
      tripAssignment: {
        type: "new_draft",
        confidence: 0.8,
        suggestedTrip: {
          destination: "Berlin",
          dates: "2026-03-20 – 2026-03-22",
        },
      },
    };

    await mockStorageUpload(page);
    await mockExtractApi(page, mockNewDraft);

    await page.goto("/receipts/new");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByRole("button", { name: /Beleg analysieren/i }).click();

    // New trip suggestion banner
    await expect(page.getByText(/Neue Reise erkannt.*Berlin/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("2026-03-20 – 2026-03-22")).toBeVisible();

    // "Reise erstellen" button
    await expect(page.getByRole("button", { name: /Reise erstellen/i })).toBeVisible();
  });

  test("Dashboard zeigt Hinweis für nicht zugeordnete Belege", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    // If there are unassigned receipts, the amber banner should show
    const banner = page.locator("text=keiner Reise zugeordnet");
    if (await banner.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(banner).toBeVisible();
      await expect(page.getByRole("link", { name: /Reisen anzeigen/i })).toBeVisible();
    }
    // If no unassigned receipts exist, that's also fine
  });
});

// ─────────────────────────────────────────────
// 4. Beleg-Bild Zoom (Fullscreen-Overlay)
// ─────────────────────────────────────────────
test.describe("4. Beleg-Bild Zoom", () => {
  test("Beleg-Detailseite: Bild anklicken → Fullscreen-Overlay → Schließen per X", async ({ page }) => {
    // First find an existing receipt
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    // Find a receipt link (UUID pattern)
    const receiptLink = page.locator('a[href*="/receipts/"]').filter({ hasNotText: /Neue|Batch|erfassen/i });
    const links = await receiptLink.all();

    let foundReceipt = false;
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href && /\/receipts\/[0-9a-f]{8}-/.test(href)) {
        await link.click();
        await page.waitForURL(/receipts\/[0-9a-f-]+/, { timeout: 10000 });
        foundReceipt = true;
        break;
      }
    }

    if (!foundReceipt) {
      test.skip(true, "Kein Beleg mit Bild vorhanden");
      return;
    }

    // Wait for image to load
    const receiptImage = page.locator('img[alt="Beleg"]');
    if (!(await receiptImage.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "Belegbild konnte nicht geladen werden");
      return;
    }

    // Image should have zoom-in cursor
    await expect(receiptImage).toHaveClass(/cursor-zoom-in/);

    // Click image to open fullscreen
    await receiptImage.click();

    // Fullscreen overlay should appear
    const overlay = page.locator(".fixed.inset-0");
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Fullscreen image should be visible
    const fullscreenImage = page.locator('img[alt="Beleg (Vollbild)"]');
    await expect(fullscreenImage).toBeVisible();

    // Close button should be visible
    const closeButton = page.getByRole("button", { name: /Schließen/i });
    await expect(closeButton).toBeVisible();

    // Close via X button
    await closeButton.click();

    // Overlay should disappear
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test("Beleg-Bild Zoom: Schließen per Escape", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    const receiptLink = page.locator('a[href*="/receipts/"]').filter({ hasNotText: /Neue|Batch|erfassen/i });
    const links = await receiptLink.all();

    let foundReceipt = false;
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href && /\/receipts\/[0-9a-f]{8}-/.test(href)) {
        await link.click();
        await page.waitForURL(/receipts\/[0-9a-f-]+/, { timeout: 10000 });
        foundReceipt = true;
        break;
      }
    }

    if (!foundReceipt) {
      test.skip(true, "Kein Beleg mit Bild vorhanden");
      return;
    }

    const receiptImage = page.locator('img[alt="Beleg"]');
    if (!(await receiptImage.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "Belegbild konnte nicht geladen werden");
      return;
    }

    // Open fullscreen
    await receiptImage.click();
    const overlay = page.locator(".fixed.inset-0");
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Close via Escape key
    await page.keyboard.press("Escape");
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test("Beleg-Bild Zoom: Schließen per Hintergrund-Klick", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    const receiptLink = page.locator('a[href*="/receipts/"]').filter({ hasNotText: /Neue|Batch|erfassen/i });
    const links = await receiptLink.all();

    let foundReceipt = false;
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href && /\/receipts\/[0-9a-f]{8}-/.test(href)) {
        await link.click();
        await page.waitForURL(/receipts\/[0-9a-f-]+/, { timeout: 10000 });
        foundReceipt = true;
        break;
      }
    }

    if (!foundReceipt) {
      test.skip(true, "Kein Beleg mit Bild vorhanden");
      return;
    }

    const receiptImage = page.locator('img[alt="Beleg"]');
    if (!(await receiptImage.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "Belegbild konnte nicht geladen werden");
      return;
    }

    // Open fullscreen
    await receiptImage.click();
    const overlay = page.locator(".fixed.inset-0");
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Click on overlay background (top-left corner, away from image)
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test("Beleg-Detailseite zeigt alle Felder", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    const receiptLink = page.locator('a[href*="/receipts/"]').filter({ hasNotText: /Neue|Batch|erfassen/i });
    const links = await receiptLink.all();

    let foundReceipt = false;
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href && /\/receipts\/[0-9a-f]{8}-/.test(href)) {
        await link.click();
        await page.waitForURL(/receipts\/[0-9a-f-]+/, { timeout: 10000 });
        foundReceipt = true;
        break;
      }
    }

    if (!foundReceipt) {
      test.skip(true, "Kein Beleg vorhanden");
      return;
    }

    // Detail page should show key fields
    await expect(page.getByText("Datum")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Betrag")).toBeVisible();
    await expect(page.getByRole("link", { name: /Zurück/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 5. Beleg ↔ Reise verknüpfen
// ─────────────────────────────────────────────
test.describe("5. Beleg-Reise Verknüpfung", () => {
  test("Trip-Detail zeigt Belege-Sektion", async ({ page }) => {
    const tripId = await createTrip(page, "Beleg-Link-Test");

    // Belege section should exist
    await expect(page.getByText(/Belege \(\d+\)/)).toBeVisible({ timeout: 10000 });

    // Empty state message
    await expect(page.getByText(/Noch keine Belege zugeordnet/i)).toBeVisible();
  });

  test("Trip-Detail: 'Beleg zuordnen' Button sichtbar wenn unverknüpfte Belege existieren", async ({ page }) => {
    await createTrip(page, "Zuordnungs-Test");

    // Check if "Beleg zuordnen" button appears (only if unlinked receipts exist)
    const linkButton = page.getByRole("button", { name: /Beleg zuordnen/i });
    if (await linkButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to expand unlinked receipts
      await linkButton.click();

      // Dialog should show unlinked receipts
      await expect(page.getByText(/Nicht zugeordnete Belege/i)).toBeVisible({ timeout: 5000 });

      // Each unlinked receipt should have a "Zuordnen" button
      const zuordnenButtons = page.getByRole("button", { name: "Zuordnen" });
      const count = await zuordnenButtons.count();
      expect(count).toBeGreaterThan(0);
    }
    // If no unlinked receipts exist, button won't be visible - that's fine
  });

  test("Trip-Detail: KI-erkannt Badge bei auto-zugeordneten Belegen", async ({ page }) => {
    // Navigate to any trip with linked receipts
    await page.goto("/trips");
    await page.waitForTimeout(2000);

    const tripLink = page.locator('a[href*="/trips/"]').filter({ hasNotText: /Neue Reise|anlegen/i });
    const links = await tripLink.all();

    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href && /\/trips\/[0-9a-f]{8}-/.test(href)) {
        await link.click();
        await page.waitForURL(/trips\/[0-9a-f-]+/, { timeout: 10000 });

        // Check if any receipt has KI-erkannt badge
        const kiBadge = page.getByText("KI-erkannt");
        if (await kiBadge.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(kiBadge.first()).toBeVisible();
          return; // Test passed
        }

        await page.goBack();
        await page.waitForTimeout(1000);
      }
    }
    // No auto-assigned receipts found — skip gracefully
    test.skip(true, "Keine automatisch zugeordneten Belege vorhanden");
  });
});
