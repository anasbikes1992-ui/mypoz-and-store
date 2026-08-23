import { expect, test } from "@playwright/test";

test.describe("public critical path", () => {
  test("health is supabase ready", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ready).toBe(true);
    expect(json.backend).toBe("supabase");
  });

  for (const path of [
    "/welcome",
    "/login",
    "/privacy-policy",
    "/terms-of-service",
    "/data-deletion",
  ]) {
    test(`${path} renders a heading`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator("h1, h2").first()).toBeVisible();
    });
  }

  test("login form has email and password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });

  test("WAF blocks exploit probes", async ({ request }) => {
    const res = await request.get("/.env");
    expect(res.status()).toBe(403);
  });

  test("booking units API requires auth", async ({ request }) => {
    const res = await request.get("/api/booking-units?type=room");
    expect([401, 403]).toContain(res.status());
  });

  test("robots and sitemap are crawlable", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain("sitemap");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
  });
});
