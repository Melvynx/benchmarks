import { expect, test } from "@playwright/test";

test.describe("sign-in route mask", () => {
  test("landing header sign-in opens a dialog at the real sign-in URL", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("h1", {
        hasText: /The Midjourney of YouTube Thumbnails/i,
      }),
    ).toBeVisible();
    await expect(
      page.locator(
        'header a[data-sign-in-route-mask="true"][data-sign-in-ready="true"]',
      ),
    ).toBeVisible();
    await page
      .locator("h1", { hasText: /The Midjourney of YouTube Thumbnails/i })
      .evaluate((element) => {
        element.setAttribute("data-route-mask-probe", "kept");
      });

    await page
      .locator(
        'header a[data-sign-in-route-mask="true"][data-sign-in-ready="true"]',
      )
      .click();

    await expect(page).toHaveURL(/\/auth\/signin\/?$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.locator("h1", {
        hasText: /The Midjourney of YouTube Thumbnails/i,
      }),
    ).toBeVisible();
    await expect(page.locator('[data-route-mask-probe="kept"]')).toBeVisible();
    await expect(
      page.locator("h1", { hasText: "Sign in to Thumbfa.st" }),
    ).toHaveCount(0);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
  });

  test("header sign-in opens a dialog at the real sign-in URL", async ({
    page,
  }) => {
    await page.goto("/tools", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("h1", { hasText: /Free YouTube Tools/i }),
    ).toBeVisible();

    await page
      .locator(
        'header a[data-sign-in-route-mask="true"][data-sign-in-ready="true"]',
      )
      .click();

    await expect(page).toHaveURL(/\/auth\/signin\/?$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.locator("h1", { hasText: /Free YouTube Tools/i }),
    ).toBeVisible();
    await expect(
      page.locator("h1", { hasText: "Sign in to Thumbfa.st" }),
    ).toHaveCount(0);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/tools\/?$/);
  });

  test("refreshing the masked sign-in URL renders the full sign-in page", async ({
    page,
  }) => {
    await page.goto("/tools", { waitUntil: "domcontentloaded" });

    await page
      .locator(
        'header a[data-sign-in-route-mask="true"][data-sign-in-ready="true"]',
      )
      .click();
    await expect(page).toHaveURL(/\/auth\/signin\/?$/);
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.reload();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Sign in to Thumbfa.st" }),
    ).toBeVisible();
  });
});
