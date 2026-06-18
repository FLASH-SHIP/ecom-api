import { test as base, expect } from "@playwright/test";

/**
 * Auth fixture — logs in as admin before each test suite.
 * Stores session in .auth/admin.json for reuse.
 */
export const test = base.extend<object, { adminSession: string }>({
  adminSession: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login as admin
      await page.goto("/login");
      await page.getByLabel("Email").fill("admin@ecom.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: /sign in|đăng nhập/i }).click();

      // Wait for dashboard to load
      await page.waitForURL("**/dashboard**", { timeout: 15_000 });

      // Save session state
      await context.storageState({ path: ".auth/admin.json" });
      await context.close();

      await use(".auth/admin.json");
    },
    { scope: "worker" },
  ],
});

export { expect };
