import { logger } from "@/lib/logger";
import { faker } from "@faker-js/faker";
import type { Page } from "@playwright/test";
import { setTestUserRole } from "./convex-test";

export const getUserEmail = () =>
  `playwright-test-${faker.internet.email().toLowerCase()}`;

const getNameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? "";
  const name = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 9);

  return name || "user";
};

async function waitForCallbackPath(page: Page, callbackURL: string) {
  const callbackPath = new URL(callbackURL, "http://localhost").pathname;

  await page.waitForFunction(
    (path) =>
      globalThis.location.pathname === path ||
      globalThis.location.pathname.startsWith(`${path}/`),
    callbackPath,
    { timeout: 30000 },
  );
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Helper function to create a test account
 * @returns Object containing the test user's credentials
 */
export async function createTestAccount(options: {
  page: Page;
  callbackURL?: string;
  initialUserData?: { name?: string; email: string; password: string };
  admin?: boolean;
}) {
  // Generate fake user data
  const userData = options.initialUserData ?? {
    email: getUserEmail(),
    password: `Playwright-${faker.string.alphanumeric(8)}1!`,
  };
  const returnedUserData = {
    ...userData,
    name: getNameFromEmail(userData.email),
  };

  // Navigate to signup page
  await options.page.goto(`/auth/signup?callbackUrl=${options.callbackURL}`, {
    waitUntil: "networkidle",
  });
  await options.page
    .getByRole("button", { name: /sign up/i })
    .waitFor({ state: "visible" });

  // Fill out the form
  await options.page.locator('input[name="email"]').fill(userData.email);
  await options.page.locator('input[name="password"]').fill(userData.password);
  await options.page
    .locator('input[name="verifyPassword"]')
    .fill(userData.password);

  // Submit the form
  await options.page.getByRole("button", { name: /sign up/i }).click();

  // Wait for navigation to complete - we should be redirected to the callback URL
  if (options.callbackURL) {
    await waitForCallbackPath(options.page, options.callbackURL);
  }

  if (options.admin) {
    await setTestUserRole({ email: userData.email, role: "admin" });
  }

  return returnedUserData;
}

/**
 * Helper function to sign in with an existing account
 * @returns Object containing the user's credentials
 */
export async function signInAccount(options: {
  page: Page;
  userData: { email: string; password: string };
  callbackURL?: string;
}) {
  const { page, userData, callbackURL } = options;

  // Navigate to signin page
  await page.goto(
    `/auth/signin${callbackURL ? `?callbackUrl=${callbackURL}` : ""}`,
  );

  const signedInDialog = page.getByRole("alertdialog", {
    name: "You are signed in!",
  });
  if (await signedInDialog.isVisible().catch(() => false)) {
    await signedInDialog
      .getByRole("button", { name: /stay here/i })
      .click()
      .catch(() => undefined);
  }

  // Click on the "Use password" button
  await page.getByRole("button", { name: /use password/i }).click();

  // Fill out the form
  await page.locator('input[name="email"]').fill(userData.email);
  await page.locator('input[name="password"]').fill(userData.password);

  // Submit the form
  await page
    .getByRole("button", { name: /sign in/i })
    .first()
    .click();

  // Wait for navigation to complete if a callback URL is provided
  if (callbackURL) {
    try {
      await waitForCallbackPath(page, callbackURL);
    } catch (error) {
      logger.error("Error waiting for navigation to complete", error);
    }
  }

  return userData;
}

/**
 * Helper function to sign out the current user
 * @param page - Playwright page object
 */
export async function signOutAccount(options: { page: Page }) {
  const { page } = options;

  // Navigate to account page
  await page.goto(`/account`);

  // Click the sign out button
  await page.getByRole("button", { name: /sign out/i }).click();

  await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
}
