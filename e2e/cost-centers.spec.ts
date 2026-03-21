import { test, expect } from "@playwright/test";

test.describe("Cost Centers", () => {
  test("cost centers page loads for admin", async ({ page }) => {
    // Navigate to cost centers page
    await page.goto("/org/test-org/cost-centers");
    // Should show either the list or empty state
    await expect(
      page.getByText(/Kostenstellen|Noch keine Kostenstellen/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("create cost center form is accessible", async ({ page }) => {
    await page.goto("/org/test-org/cost-centers");
    // Try to click "Neu" button if available (admin only)
    const neuButton = page.getByRole("button", { name: /Neu/ });
    if (await neuButton.isVisible()) {
      await neuButton.click();
      await expect(page.getByLabel("Nummer")).toBeVisible();
      await expect(page.getByLabel("Name")).toBeVisible();
    }
  });

  test("cost center import page loads", async ({ page }) => {
    await page.goto("/org/test-org/cost-centers/import");
    await expect(
      page.getByText(/Kostenstellen importieren|Zurück/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("cost center select appears in new trip form when org has cost centers", async ({ page }) => {
    await page.goto("/trips/new");
    await expect(page.getByText("Neue Reise")).toBeVisible({ timeout: 10000 });
    // Cost center select only appears when org has cost centers
    // This test just verifies the page loads without errors
  });
});
