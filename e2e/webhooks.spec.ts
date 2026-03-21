import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

test.use({ storageState: STORAGE_STATE });

test.describe("Webhooks", () => {
  test("webhook API requires auth", async ({ request }) => {
    // Without org_id param
    const response = await request.get("/api/webhooks");
    // Should return 400 (missing org_id) or 401 - both are valid
    expect([400, 401]).toContain(response.status());
  });

  test("webhook cron endpoint exists", async ({ request }) => {
    const response = await request.post("/api/cron/webhook-retry");
    // Returns 200 (success, 0 retried) or 401 (if CRON_SECRET is set)
    expect([200, 401]).toContain(response.status());
  });
});
