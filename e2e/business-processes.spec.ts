import { test, expect, Page } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

test.use({ storageState: STORAGE_STATE });

// Helper: Create a trip and return its URL
async function createTrip(page: Page, destination: string, days = 3): Promise<string> {
  await page.goto("/trips/new");
  await page.getByPlaceholder("z.B. München").fill(destination);
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill("2026-06-01");
  await dateInputs.last().fill(`2026-06-${String(days).padStart(2, "0")}`);
  await page.getByRole("button", { name: /Reise anlegen/i }).click();
  await page.waitForURL(/trips\/[0-9a-f-]+/, { timeout: 15000 });
  return page.url();
}

// Helper: Create org, navigate to settings, return slug
async function createOrg(page: Page, name: string): Promise<string> {
  await page.goto("/org/new");
  await page.getByPlaceholder("z.B. Meine Firma GmbH").fill(name);
  await page.getByRole("button", { name: "Organisation erstellen" }).click();
  await page.waitForURL(/\/org\/.*\/settings/, { timeout: 15000 });
  return page.url().match(/\/org\/([^/]+)\/settings/)?.[1] || "";
}

// Helper: Activate org context via profile page
async function activateOrg(page: Page): Promise<void> {
  await page.goto("/profile");
  await page.waitForTimeout(1000);
  const aktivierenBtn = page.getByRole("button", { name: "Aktivieren" }).first();
  if (await aktivierenBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await aktivierenBtn.click();
    await page.waitForTimeout(1000);
  }
}

// ─────────────────────────────────────────────
// A. Profil
// ─────────────────────────────────────────────
test.describe("A. Profil-Management", () => {
  test("Profilseite laden und Felder sichtbar", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10000 });
    const inputs = page.locator('input[type="text"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
  });

  test("Logout-Button ist sichtbar", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("button", { name: /Abmelden/i })).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// B. Organisation + Einladung
// ─────────────────────────────────────────────
test.describe("B. Organisation + Einladung", () => {
  test("Organisation erstellen und Members-Seite laden", async ({ page }) => {
    const slug = await createOrg(page, `BP-Org ${Date.now()}`);
    expect(slug).toBeTruthy();

    await page.getByRole("link", { name: "Mitglieder" }).click();
    await page.waitForURL(/\/members/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Mitglieder" })).toBeVisible();
    // Admin-Badge sichtbar (first, da es mehrere Text-Matches geben kann)
    await expect(page.locator("text=Admin").first()).toBeVisible();
  });

  test("Mitglied einladen – Einladung erscheint in Liste", async ({ page }) => {
    const slug = await createOrg(page, `BP-Invite ${Date.now()}`);

    await page.getByRole("link", { name: "Mitglieder" }).click();
    await page.waitForURL(/\/members/, { timeout: 10000 });

    const emailInput = page.getByPlaceholder("email@beispiel.de");
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill("einladung-test@example.com");

    // Klick und auf Netzwerk-Antwort warten
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/invite"),
      { timeout: 15000 }
    );
    await page.getByRole("button", { name: "Einladen" }).click();
    const response = await responsePromise;

    // API sollte 200 oder 201 zurückgeben (nicht 500/403)
    const body = await response.json().catch(() => ({}));
    expect(response.status(), `Invite API error: ${JSON.stringify(body)}`).toBeLessThan(400);

    // Kurz warten für UI-Update
    await page.waitForTimeout(1000);

    // Einladung sollte in der Liste erscheinen
    await expect(page.getByText("einladung-test@example.com")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=ausstehend").first()).toBeVisible();
  });

  test("Kostenstelle anlegen", async ({ page }) => {
    const slug = await createOrg(page, `BP-KST ${Date.now()}`);

    await page.getByRole("link", { name: "Kostenstellen" }).click();
    await page.waitForURL(/\/cost-centers/, { timeout: 10000 });

    await page.getByRole("button", { name: /Neu/ }).click();
    await page.locator('input[placeholder="z.B. 4711"]').fill("3001");
    await page.locator('input[placeholder="z.B. Vertrieb"]').fill("Forschung");
    await page.getByRole("button", { name: "Erstellen" }).click();

    await expect(page.getByText("3001 – Forschung")).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// C. Trip-Lifecycle
// ─────────────────────────────────────────────
test.describe("C. Trip-Lifecycle", () => {
  test("Reise anlegen – Detail zeigt Tagespauschalen", async ({ page }) => {
    await createTrip(page, "E2E-Pauschalen-Test");
    await expect(page.getByText("Tagespauschalen")).toBeVisible();
  });

  test("Fahrt über Trip-Link erfassen", async ({ page }) => {
    await createTrip(page, "E2E-Mileage-Trip");

    const mileageLink = page.getByRole("link", { name: /Fahrt erfassen/i });
    if (await mileageLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mileageLink.click();
      await page.waitForURL(/mileage\/new/, { timeout: 10000 });

      await page.getByPlaceholder("z.B. Hamburg, Büro").fill("München");
      await page.getByPlaceholder("z.B. München, Kunde XY").fill("Stuttgart");
      await page.getByPlaceholder("z.B. 320").fill("230");

      await expect(page.getByText("69.00 EUR")).toBeVisible();

      await page.getByRole("button", { name: /Fahrt erfassen/i }).click();
      await page.waitForURL(/trips\/[0-9a-f-]+/, { timeout: 10000 });

      await expect(page.locator("text=München").first()).toBeVisible();
    }
  });

  test("Reise einreichen und genehmigen (Org-Kontext)", async ({ page }) => {
    await createOrg(page, `BP-Approve ${Date.now()}`);
    await activateOrg(page);
    await createTrip(page, "Genehmigungs-Test");

    const submitBtn = page.getByRole("button", { name: /Zur Genehmigung einreichen/i });
    if (!(await submitBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await submitBtn.click();
    await expect(page.locator("text=Eingereicht").first()).toBeVisible({ timeout: 10000 });

    // Genehmigen
    const approveBtn = page.getByRole("button", { name: /Genehmigen/i });
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.click();
      await expect(page.locator("text=Genehmigt").first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// ─────────────────────────────────────────────
// D. Trip-Rejection + Resubmit
// ─────────────────────────────────────────────
test.describe("D. Trip-Rejection + Resubmit", () => {
  test("Reise ablehnen und erneut einreichen", async ({ page }) => {
    await createOrg(page, `BP-Reject ${Date.now()}`);
    await activateOrg(page);
    await createTrip(page, "Ablehnungs-Test");

    const submitBtn = page.getByRole("button", { name: /Zur Genehmigung einreichen/i });
    if (!(await submitBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await submitBtn.click();
    await expect(page.locator("text=Eingereicht").first()).toBeVisible({ timeout: 10000 });

    // Ablehnen
    const rejectBtn = page.getByRole("button", { name: "Ablehnen" }).first();
    await expect(rejectBtn).toBeVisible({ timeout: 5000 });
    await rejectBtn.click();

    await page.getByPlaceholder("Ablehnungsgrund...").fill("Belege unvollständig");
    // Bestätigen (roter Button im Dialog)
    await page.locator("button.bg-red-600").click();

    await expect(page.locator("text=Abgelehnt").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Belege unvollständig")).toBeVisible();

    // Erneut einreichen
    const resubmitBtn = page.getByRole("button", { name: /Zur Genehmigung einreichen/i });
    await expect(resubmitBtn).toBeVisible({ timeout: 5000 });
    await resubmitBtn.click();
    await expect(page.locator("text=Eingereicht").first()).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// E. Export-Buttons
// ─────────────────────────────────────────────
test.describe("E. Export-Buttons", () => {
  test("Trip zeigt Export-Buttons", async ({ page }) => {
    await createTrip(page, "Export-Test");

    await expect(page.getByRole("button", { name: "PDF Export" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "CSV Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "DATEV Export" })).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// F. Mileage standalone
// ─────────────────────────────────────────────
test.describe("F. Mileage standalone", () => {
  test("Fahrt erfassen mit Live-Vorschau", async ({ page }) => {
    await page.goto("/mileage/new");
    await expect(page.getByRole("heading", { name: "Fahrt erfassen" })).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("z.B. Hamburg, Büro").fill("Hamburg");
    await page.getByPlaceholder("z.B. München, Kunde XY").fill("Berlin");
    await page.getByPlaceholder("z.B. 320").fill("290");

    await expect(page.getByText("87.00 EUR")).toBeVisible();

    // Hin- und Rückfahrt
    await page.getByText("Hin- und Rückfahrt").click();
    await expect(page.getByText("174.00 EUR")).toBeVisible();

    await page.getByRole("button", { name: /Fahrt erfassen/i }).click();
    await page.waitForURL(/mileage/, { timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// G. Receipt-Upload (Smoke)
// ─────────────────────────────────────────────
test.describe("G. Receipt-Upload", () => {
  test("Upload-Seite lädt", async ({ page }) => {
    await page.goto("/receipts/new");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("Batch-Upload-Seite lädt", async ({ page }) => {
    await page.goto("/receipts/batch");
    await expect(page.locator("body")).not.toContainText("404");
  });
});

// ─────────────────────────────────────────────
// H. Org-Dashboard + Genehmigungen
// ─────────────────────────────────────────────
test.describe("H. Org-Dashboard + Genehmigungen", () => {
  test("Team-Dashboard und Genehmigungen laden", async ({ page }) => {
    const slug = await createOrg(page, `BP-Dash ${Date.now()}`);

    await page.getByRole("link", { name: "Team-Dashboard" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");

    await page.goBack();
    await page.waitForURL(/\/settings/, { timeout: 5000 });

    await page.getByRole("link", { name: "Genehmigungen" }).click();
    await page.waitForURL(/\/approvals/, { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
  });
});

// ─────────────────────────────────────────────
// I. Navigation
// ─────────────────────────────────────────────
test.describe("I. Navigation", () => {
  test("Alle Hauptrouten erreichbar", async ({ page }) => {
    const routes = ["/dashboard", "/trips", "/receipts/new", "/receipts/batch", "/profile", "/mileage/new"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).not.toContainText("404");
      await expect(page.locator("body")).not.toContainText("Application error");
    }
  });
});

// ─────────────────────────────────────────────
// J. Audit-Log
// ─────────────────────────────────────────────
test.describe("J. Audit-Log", () => {
  test("Audit-Log-Seite laden", async ({ page }) => {
    const slug = await createOrg(page, `BP-Audit ${Date.now()}`);

    await page.getByRole("link", { name: "Audit-Log" }).click();
    await page.waitForURL(/\/audit/, { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
  });
});
