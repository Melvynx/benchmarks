import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test.describe("account", () => {
  test("delete account flow", async ({ page }) => {
    await createTestAccount({
      page,
      callbackURL: "/account",
    });

    await page.getByRole("link", { name: "Danger" }).click();
    await page.waitForURL(/\/account\/danger/, { timeout: 10000 });
    await page.getByRole("button", { name: "Delete account" }).click();

    const deleteDialog = page.getByRole("alertdialog", {
      name: "Delete your account ?",
    });
    await expect(deleteDialog).toBeVisible();

    const confirmInput = deleteDialog.getByRole("textbox", {
      name: "Confirm deletion",
    });
    await confirmInput.fill("Delete");
    await deleteDialog.getByLabel("Password").fill("password-is-required");

    const deleteButton = deleteDialog.getByRole("button", { name: /delete/i });
    await expect(deleteButton).toBeEnabled();
  });

  test("update name flow", async ({ page }) => {
    const userData = await createTestAccount({ page, callbackURL: "/account" });

    const newName = faker.person.fullName();
    const input = page.getByRole("textbox", { name: "Name" });
    await expect(input).toHaveValue(userData.name);
    await input.fill(newName);
    await page
      .locator("form")
      .getByRole("button", { name: "Save changes" })
      .click();

    await expect(page.getByText("Name updated")).toBeVisible({
      timeout: 10000,
    });
    await page.reload();
    await expect(input).toHaveValue(newName);
  });

  test("change password flow", async ({ page }) => {
    const userData = await createTestAccount({ page, callbackURL: "/account" });

    await page.getByRole("link", { name: /change password/i }).click();

    const newPassword = faker.internet.password({
      length: 12,
      memorable: true,
    });
    await page.locator('input[name="currentPassword"]').fill(userData.password);
    await page.locator('input[name="newPassword"]').fill(newPassword);
    await page.locator('input[name="confirmPassword"]').fill(newPassword);
    await expect(
      page.getByRole("button", { name: /Change Password/i }),
    ).toBeEnabled();
  });
});
