import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

const AUTH_FILE = path.join(process.cwd(), ".auth/admin.json");

test.describe("Engagement Pages", () => {
  test.beforeAll(async ({ browser }) => {
    if (!fs.existsSync(AUTH_FILE)) {
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
    }
  });

  test("should navigate to comments page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/comments");
    await expect(page).toHaveURL(/comments/);
    await expect(page.locator("h1")).toContainText(/comment|bình luận/i);
    await context.close();
  });

  test("should display comment status tabs", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/comments");
    // Status tabs should be present
    await expect(page.locator("text=All")).toBeVisible();
    await expect(page.locator("text=Pending")).toBeVisible();
    await context.close();
  });

  test("should navigate to contacts page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/contacts");
    await expect(page).toHaveURL(/contacts/);
    await expect(page.locator("h1")).toContainText(/contact|liên hệ/i);
    await context.close();
  });

  test("should display contacts table", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/contacts");
    // Table headers should be visible
    await expect(page.locator("table")).toBeVisible();
    await context.close();
  });

  test("should navigate to webhooks page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/webhooks");
    await expect(page).toHaveURL(/webhooks/);
    await expect(page.locator("h1")).toContainText(/webhook/i);
    await context.close();
  });

  test("should display webhook create form", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await page.goto("/dashboard/webhooks");
    // Create button or form should be present
    await expect(page.locator("text=Create Webhook").first()).toBeVisible();
    await context.close();
  });
});
