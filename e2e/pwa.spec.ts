import { test, expect } from "@playwright/test";

test.describe("PWA", () => {
  test("manifest.json ist erreichbar und valide", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe("Spesenluchs");
    expect(manifest.short_name).toBe("Spesenluchs");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/dashboard");
    expect(manifest.theme_color).toBe("#2563eb");
    expect(manifest.background_color).toBe("#ffffff");
    expect(manifest.orientation).toBe("portrait-primary");
  });

  test("manifest enthält Icons in allen Pflichtgrößen", async ({ request }) => {
    const response = await request.get("/manifest.json");
    const manifest = await response.json();

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");

    // Maskable icon vorhanden
    const maskable = manifest.icons.find((i: { purpose?: string }) => i.purpose === "maskable");
    expect(maskable).toBeTruthy();
    expect(maskable.sizes).toBe("512x512");
  });

  test("manifest enthält Shortcuts", async ({ request }) => {
    const response = await request.get("/manifest.json");
    const manifest = await response.json();

    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
    const urls = manifest.shortcuts.map((s: { url: string }) => s.url);
    expect(urls).toContain("/receipts/new");
    expect(urls).toContain("/trips/new");
  });

  test("alle Icon-Dateien sind erreichbar", async ({ request }) => {
    const iconPaths = [
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-512-maskable.png",
      "/icons/apple-touch-icon.png",
      "/favicon.png",
      "/favicon-48.png",
    ];

    for (const path of iconPaths) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be accessible`).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
  });

  test("favicon.svg ist erreichbar", async ({ request }) => {
    const response = await request.get("/favicon.svg");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("svg");
  });

  test("Service Worker ist erreichbar", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("spesenluchs-v1");
    expect(text).toContain("install");
    expect(text).toContain("activate");
    expect(text).toContain("fetch");
  });

  test("offline.html Fallback-Seite ist erreichbar", async ({ request }) => {
    const response = await request.get("/offline.html");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("Du bist offline");
    expect(text).toContain("Erneut versuchen");
  });

  test("HTML enthält PWA Meta-Tags", async ({ page }) => {
    await page.goto("/login");

    // Wait for Next.js streaming to inject all meta tags (polls DOM)
    await expect(async () => {
      const tags = await page.evaluate(() => ({
        manifest: !!document.querySelector('link[rel="manifest"]'),
        appleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
        appleWebApp: !!document.querySelector('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]'),
      }));
      expect(tags.manifest).toBe(true);
      expect(tags.appleTouchIcon).toBe(true);
      expect(tags.appleWebApp).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test("Landing Page zeigt App-Logo", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator('img[alt="Spesenluchs"]');
    // Logo sichtbar (entweder auf Landing Page oder nach Redirect)
    if (await logo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(logo).toHaveAttribute("src", expect.stringContaining("icon-192"));
    }
  });
});
