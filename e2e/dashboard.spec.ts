import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

const AUTH_FILE = path.join(process.cwd(), ".auth/admin.json");

/**
 * Setup: create auth state before running navigation tests.
 */
test.describe("Dashboard Navigation", () => {
  test.beforeAll(async ({ browser }) => {
    // Create auth state
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.locator("#email").fill("admin@ecom.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });

    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await context.storageState({ path: AUTH_FILE });
    await context.close();
  });

  test("should display dashboard page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    await context.close();
  });

  test("should navigate to posts page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/posts");
    await expect(page).toHaveURL(/posts/);
    await context.close();
  });

  test("should navigate to tags page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/tags");
    await expect(page).toHaveURL(/tags/);
    await context.close();
  });

  test("should navigate to members page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/members");
    await expect(page).toHaveURL(/members/);
    await context.close();
  });

  test("should navigate to users page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/users");
    await expect(page).toHaveURL(/users/);
    await context.close();
  });

  test("should navigate to roles page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/roles");
    await expect(page).toHaveURL(/roles/);
    await context.close();
  });

  test("should navigate to settings page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/settings/);
    await context.close();
  });

  test("should navigate to tools page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/tools");
    await expect(page).toHaveURL(/tools/);
    await context.close();
  });

  test("should navigate to custom fields page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/custom-fields");
    await expect(page).toHaveURL(/custom-fields/);
    await context.close();
  });

  test("should navigate to system page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/system");
    await expect(page).toHaveURL(/system/);
    await context.close();
  });
});
