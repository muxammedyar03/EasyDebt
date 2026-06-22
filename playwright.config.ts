import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Run with: npm run test:e2e
 * Start app first: npm run dev (or set webServer below to start it).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        reuseExistingServer: false,
      }
    : undefined,
});
