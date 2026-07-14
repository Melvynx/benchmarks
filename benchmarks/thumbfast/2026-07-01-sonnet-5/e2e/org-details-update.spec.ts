import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test("update organization name", async ({ page }) => {
  // 1. Create a test account (owner)
  await createTestAccount({
    page,
    callbackURL: "/orgs",
  });

  // Wait for navigation to complete - we should be redirected to the organization page
  await page.waitForURL(/\/orgs\/[^/]+(?:\/onboard)?$/);

  // Extract organization slug from URL
  const currentUrl = page.url();
  const orgSlug = currentUrl.split("/orgs/")[1].split("/")[0];

  // 2. Navigate to organization settings page
  await page.goto(`/orgs/${orgSlug}/settings`);

  // 4. Generate a new organization name
  const newOrgName = faker.company.name();

  // Find the input within that card and update it
  const nameInput = page.locator('input[name="name"]');

  await expect(nameInput).not.toHaveValue("");

  // Update the name
  await nameInput.clear();
  await nameInput.fill(newOrgName);

  // 6. Click the save button and wait for the Convex-backed update to complete.
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page.getByText("Organization updated")).toBeVisible({
    timeout: 10000,
  });

  // refresh
  await page.reload();

  const nameInput2 = page.locator('input[name="name"]');

  await expect(nameInput2).toHaveValue(newOrgName);
});
