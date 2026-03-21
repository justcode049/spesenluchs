import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

test.use({ storageState: STORAGE_STATE });

test.describe("Cost Centers", () => {
  test("trips page loads successfully", async ({ page }) => {
    await page.goto("/trips");
    await expect(page.getByText("Meine Reisen")).toBeVisible({ timeout: 10000 });
  });

  test("new trip form loads successfully", async ({ page }) => {
    await page.goto("/trips/new");
    await expect(page.getByText("Neue Reise")).toBeVisible({ timeout: 10000 });
    // Form fields are present
    await expect(page.getByText("Reiseziel")).toBeVisible();
    await expect(page.getByText("Startdatum")).toBeVisible();
  });
});
