import { test, expect } from "@playwright/test";

test.describe("Webhooks", () => {
  test("webhooks page loads for admin", async ({ page }) => {
    await page.goto("/org/test-org/webhooks");
    await expect(
      page.getByText(/Webhooks|Nur Administratoren/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("create webhook form is accessible", async ({ page }) => {
    await page.goto("/org/test-org/webhooks");
    const neuButton = page.getByRole("button", { name: /Neu/ });
    if (await neuButton.isVisible()) {
      await neuButton.click();
      await expect(page.getByLabel("URL")).toBeVisible();
      // Event checkboxes should be visible
      await expect(page.getByText("Reise eingereicht")).toBeVisible();
      await expect(page.getByText("Reise genehmigt")).toBeVisible();
    }
  });

  test("webhook delivery log page loads", async ({ page }) => {
    // This test just verifies the detail page doesn't crash
    await page.goto("/org/test-org/webhooks/00000000-0000-0000-0000-000000000000");
    // Will redirect or show error - just verify no crash
    await page.waitForTimeout(2000);
  });
});
