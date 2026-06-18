import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Ecom");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    await expect(page.getByText(/không đúng/i)).toBeVisible({ timeout: 10_000 });
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("admin@ecom.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await expect(page.url()).toContain("/dashboard");
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 10_000 });
  });
});
