import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "https://mypoz-and-store-ui.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
