import { getServerUrl } from "@/lib/server-url";
import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { createTestAccount, signInAccount } from "./utils/auth-test";
import { getLatestEmailOtp } from "./utils/convex-test";

test("password reset flow", async ({ page }) => {
  // 1. Create a test account
  const userData = await createTestAccount({
    page,
    callbackURL: "/account",
  });

  await page.waitForURL(/\/account/, { timeout: 10000 });

  // 2. Sign out
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

  // 3. Go to forget password page
  await page.goto(`${getServerUrl()}/auth/forget-password`);

  // 4. Submit the email for password reset
  await page.getByRole("textbox", { name: "Email" }).fill(userData.email);
  await page.getByRole("button", { name: /send reset code/i }).click();

  // 5. Wait for OTP step to appear
  await expect(page.getByText(/one-time password has been sent/i)).toBeVisible({
    timeout: 10000,
  });

  // 6. Get the OTP from database
  const otp = await getLatestEmailOtp({
    email: userData.email,
    type: "forget-password",
  });
  expect(otp).not.toBeNull();
  expect(otp).toHaveLength(6);

  // 7. Enter the OTP using the input-otp component
  const otpInput = page.locator('[data-slot="input-otp"]');
  await otpInput.focus();
  await page.keyboard.type(otp ?? "");

  // 8. Wait for password step to appear
  await expect(page.getByLabel("New Password")).toBeVisible({ timeout: 10000 });

  // 9. Set a new password
  const newPassword = `Playwright-${faker.string.alphanumeric(8)}1!`;
  await page.getByLabel("New Password").fill(newPassword);
  await page.getByRole("button", { name: /reset password/i }).click();

  // 10. Should be redirected to sign in page
  await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

  // 11. Sign in with new password
  await signInAccount({
    page,
    userData: {
      email: userData.email,
      password: newPassword,
    },
    callbackURL: "/orgs",
  });

  await expect(page).toHaveURL(/\/orgs/);
});
