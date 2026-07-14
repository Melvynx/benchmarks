import { expect, test } from "@playwright/test";

test.describe("changelog route mask", () => {
  test("opens a changelog entry in a dialog with a shareable URL", async ({
    page,
  }) => {
    await page.goto("/changelog");

    await expect(page.locator('[data-changelog-ready="true"]')).toBeVisible();

    await page.locator("[data-changelog-item]").first().click();

    await expect(page).toHaveURL(/\/changelog\/[^/?#]+\/?$/);
    await expect(page.locator("[data-changelog-dialog]")).toBeVisible();

    const slug = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
    expect(slug).toBeTruthy();

    await page.getByRole("button", { name: /open page/i }).click();

    await expect(page).toHaveURL(new RegExp(`/changelog/${slug}/?$`));
    await expect(page.locator("[data-changelog-dialog]")).toBeHidden();
    await expect(page.locator("[data-changelog-detail]")).toBeVisible();
  });

  test("direct entry URLs render as full pages", async ({ page }) => {
    await page.goto("/changelog/2026-01-01-v100");

    await expect(page.locator("[data-changelog-dialog]")).toBeHidden();
    await expect(page.locator("[data-changelog-detail]")).toBeVisible();

    await page.reload();

    await expect(page.locator("[data-changelog-dialog]")).toBeHidden();
    await expect(page.locator("[data-changelog-detail]")).toBeVisible();
  });
});
