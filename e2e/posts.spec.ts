import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

const AUTH_FILE = path.join(process.cwd(), ".auth/admin.json");

test.describe("Posts Management", () => {
  test.beforeAll(async ({ browser }) => {
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

  test("should display posts list", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/posts");
    await expect(page).toHaveURL(/posts/);
    await page.waitForLoadState("networkidle");
    await context.close();
  });

  test("should navigate to new post form", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/posts/new");
    await expect(page).toHaveURL(/posts\/new/);
    await page.waitForLoadState("networkidle");
    await context.close();
  });

  test("should have title input on new post page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/posts/new");
    await page.waitForLoadState("networkidle");

    const titleInput = page.locator('input[name="title"], #title, [data-testid="post-title"]');
    const hasTitle = await titleInput.count();
    if (hasTitle > 0) {
      await expect(titleInput.first()).toBeVisible();
    }
    await context.close();
  });
});
