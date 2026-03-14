/**
 * E2E: login → dashboard → create debtor (form, submit, debtor appears in table).
 *
 * Requires:
 * - App running (e.g. npm run dev) or CI will start it via webServer.
 * - Env E2E_USERNAME, E2E_PASSWORD for login. Optional: E2E_PIN if PinGate is enabled.
 */
import { test, expect } from "@playwright/test";

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
const pin = process.env.E2E_PIN ?? "1234";

test.describe("Create debtor flow", () => {
  test.beforeEach(() => {
    test.skip(!username || !password, "Set E2E_USERNAME and E2E_PASSWORD to run E2E");
  });

  test("login → dashboard → create debtor → debtor appears in table", async ({ page }) => {
    const unique = `E2E ${Date.now()}`;
    const [firstName, lastName] = unique.split(" ");

    await page.goto("/auth/login");

    await page.getByLabel(/username/i).fill(username!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /login/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/default/, { timeout: 15_000 });

    const pinGate = page.getByText(/pin|PIN|pin kod|Davom etish uchun/i).first();
    const pinVisible = await pinGate.isVisible().catch(() => false);
    if (pinVisible) {
      const inputs = page.locator('input[type="password"], input[maxlength="4"]');
      const count = await inputs.count();
      if (count >= 1) {
        await inputs.first().fill(pin);
        if (count >= 2) await inputs.nth(1).fill(pin);
        await page
          .getByRole("button", { name: /tasdiq|kiriting|Davom|ok/i })
          .click()
          .catch(() => {});
      }
    }

    await page.getByRole("button", { name: /Qarzdor qo'shish/i }).click({ timeout: 15_000 });

    await expect(page.getByRole("dialog").getByText(/Yangi qarzdor qo'shish/i)).toBeVisible({ timeout: 5_000 });

    await page.getByLabel(/ism/i).fill(firstName);
    await page.getByLabel(/familiya/i).fill(lastName);
    await page.getByRole("button", { name: /Qo'shish/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(unique, { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});
