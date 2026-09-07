import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("default layout is aligned and distinguishes overlap", async ({ page }) => {
  await expect(page).toHaveTitle("GPT-6 Astra");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("GPT-6 Astra");
  await expect(page.locator(".desktop-timeline .timeline-row")).toHaveCount(3);
  await expect(page.locator(".desktop-timeline .time-cell")).toHaveCount(72);
  await expect(page.getByText("Green cells = everyone awake")).toBeVisible();
  const bounds = await page.locator(".desktop-timeline .timeline-row .hour-grid").evaluateAll((grids) => grids.map((grid) => ({ left: grid.getBoundingClientRect().left, width: grid.getBoundingClientRect().width })));
  expect(bounds.every((grid) => grid.left === bounds[0].left && grid.width === bounds[0].width)).toBe(true);
});

test("search, addition, reference promotion, removal and persistence", async ({ page }) => {
  await page.getByRole("button", { name: "Add city", exact: true }).click();
  await page.getByRole("textbox", { name: "Search city or country" }).fill("nepal");
  await page.getByRole("button", { name: /Kathmandu Nepal/ }).click();
  await expect(page.locator(".desktop-timeline .timeline-row")).toHaveCount(4);
  await page.locator(".desktop-timeline").getByRole("button", { name: "Kathmandu", exact: true }).click();
  await expect(page.locator(".desktop-timeline .timeline-row").first()).toContainText("Kathmandu");
  await expect(page.locator(".desktop-timeline .timeline-row").first()).toContainText("UTC+5:45");
  await page.reload();
  await expect(page.locator(".desktop-timeline .timeline-row").first()).toContainText("Kathmandu");
  await page.locator(".desktop-timeline").getByRole("button", { name: "Remove Kathmandu" }).click();
  await expect(page.locator(".desktop-timeline .timeline-row")).toHaveCount(3);
});

test("base mode and overnight settings survive refresh", async ({ page }) => {
  await page.getByRole("button", { name: "Base mode", exact: true }).click();
  await expect(page.locator(".base-summary-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Availability settings", exact: true }).click();
  await page.getByLabel("Wake-up hour", { exact: true }).selectOption("22");
  await page.getByLabel("Sleep hour", { exact: true }).selectOption("6");
  await page.getByRole("button", { name: "24h", exact: true }).click();
  await expect(page.getByText("Night owl? Your overnight schedule is supported.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Base mode", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".awake-indicator")).toContainText("22:00–06:00");
});

test("all cities can be removed and defaults restored", async ({ page }) => {
  for (const city of ["San Francisco", "Denpasar", "Geneva"]) {
    await page.locator(".desktop-timeline").getByRole("button", { name: `Remove ${city}` }).click();
  }
  await expect(page.getByText("Your world starts here.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Your world starts here.")).toBeVisible();
  await page.getByRole("button", { name: "Restore default cities" }).click();
  await expect(page.locator(".desktop-timeline .timeline-row")).toHaveCount(3);
});

test("mobile uses a distinct vertical grid without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".desktop-timeline")).toBeHidden();
  await expect(page.locator(".mobile-timeline")).toBeVisible();
  await expect(page.locator(".mobile-hour-row")).toHaveCount(24);
  await expect(page.locator(".mobile-column-head")).toHaveCount(3);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});
