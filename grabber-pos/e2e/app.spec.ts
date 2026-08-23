import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_EMAIL;
const password = process.env.PLAYWRIGHT_PASSWORD;

test.describe("signed-in critical path", () => {
  test.skip(!email || !password, "Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-username").fill(email!);
    await page.locator("#login-password").fill(password!);
    await page.locator("#login-form button[type='submit']").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    });
  });

  for (const path of [
    "/",
    "/pos",
    "/pos?mode=wholesale",
    "/rooms",
    "/rent",
    "/repair",
    "/delivery",
    "/hire-purchase",
    "/products",
    "/commerce",
    "/settings",
    "/whatsapp",
    "/hq",
    "/hq/backups",
    "/hq/whatsapp",
    "/hq/config",
    "/hq/jarvis",
    "/assistant",
  ]) {
    test(`${path} is not a 404`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status() ?? 0).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
