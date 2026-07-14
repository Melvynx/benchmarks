import { expect, test, type Page } from "@playwright/test";
import {
  createTestAccount,
  getUserEmail,
  signInAccount,
} from "./utils/auth-test";
import { setTestSubscription } from "./utils/convex-test";

async function createOrgSession(page: Page) {
  const userData = await createTestAccount({
    page,
    callbackURL: "/orgs",
    initialUserData: {
      name: "Settings Migration",
      email: getUserEmail(),
      password: `Playwright-${Date.now()}1!`,
    },
  });

  if (new URL(page.url()).pathname.startsWith("/auth/signin")) {
    await signInAccount({ page, userData, callbackURL: "/orgs" });
  }

  const orgUrlPattern = /\/orgs\/[^/]+(?:\/onboard)?$/;
  const signedInDialogDashboardButton = page
    .getByRole("alertdialog", { name: "You are signed in!" })
    .getByRole("button", { name: /dashboard/i });
  const authOutcome = await Promise.race([
    page.waitForURL(orgUrlPattern, { timeout: 30000 }).then(() => "org"),
    signedInDialogDashboardButton
      .waitFor({ state: "visible", timeout: 30000 })
      .then(() => "dialog"),
  ]);

  if (authOutcome === "dialog") {
    await signedInDialogDashboardButton.click();
    await page.waitForURL(orgUrlPattern, { timeout: 30000 });
  }

  const orgSlug = new URL(page.url()).pathname
    .split("/orgs/")[1]
    ?.split("/")[0];
  if (!orgSlug) {
    throw new Error(`Could not extract organization slug from ${page.url()}`);
  }

  return orgSlug;
}

async function expectSettingsShell(page: Page) {
  const sidebarButtons = page.locator('[data-sidebar="menu-button"]');

  await expect(page.getByText("Back to Dashboard")).toBeVisible();
  await expect(sidebarButtons.filter({ hasText: "Settings" })).toBeVisible();
  await expect(sidebarButtons.filter({ hasText: "Members" })).toBeVisible();
  await expect(sidebarButtons.filter({ hasText: "Billing" })).toBeVisible();
  await expect(
    sidebarButtons.filter({ hasText: "Custom API Keys" }),
  ).toBeVisible();
  await expect(sidebarButtons.filter({ hasText: "Developer" })).toBeVisible();
  await expect(page.locator("nav.flex.gap-2")).toHaveCount(0);
}

async function gotoSettingsPath(page: Page, path: string) {
  await page.goto(path, { waitUntil: "commit", timeout: 30000 });
}

test("organization settings migration keeps the pre-migration settings flows", async ({
  page,
}) => {
  const orgSlug = await createOrgSession(page);
  const settingsPage = await page.context().newPage();
  await page.close();

  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings`);
  await expectSettingsShell(settingsPage);
  await expect(settingsPage.getByText("Image", { exact: true })).toBeVisible();
  await expect(settingsPage.getByText("Name", { exact: true })).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();

  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings/billing`);
  await expectSettingsShell(settingsPage);
  await expect(
    settingsPage.getByRole("heading", { name: "Thumbnails" }),
  ).toBeVisible();
  await expect(
    settingsPage.getByRole("tab", { name: "Thumbnails" }),
  ).toBeVisible();
  await expect(settingsPage.getByRole("tab", { name: "Usage" })).toBeVisible();
  await expect(settingsPage.getByRole("tab", { name: "Plans" })).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: "Manage Billing" }),
  ).toBeVisible();
  await expect(settingsPage.getByText("Thumbnail Balance")).toBeVisible();
  await expect(
    settingsPage.getByRole("link", { name: "View Plans" }),
  ).toBeVisible();

  await gotoSettingsPath(
    settingsPage,
    `/orgs/${orgSlug}/settings/billing/usage`,
  );
  await expectSettingsShell(settingsPage);
  await expect(settingsPage.getByText("Credits policy")).toBeVisible();
  await expect(settingsPage.getByText("Token Usage")).toBeVisible();

  await gotoSettingsPath(
    settingsPage,
    `/orgs/${orgSlug}/settings/billing/plan`,
  );
  await expectSettingsShell(settingsPage);
  await expect(
    settingsPage.getByRole("button", { name: "Current plan" }).first(),
  ).toBeVisible();
  await expect(settingsPage.getByText("Available Plans")).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: "Upgrade" }).first(),
  ).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: "Buy Lifetime" }),
  ).toBeVisible();

  await setTestSubscription({ orgSlug, plan: "ultra", status: "active" });
  await settingsPage.reload();
  await expect(
    settingsPage.getByRole("button", { name: "Downgrade" }).first(),
  ).toBeVisible();

  await setTestSubscription({ orgSlug, plan: "free", status: "inactive" });
  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings/api-keys`);
  await expectSettingsShell(settingsPage);
  await expect(
    settingsPage.getByRole("heading", { name: "API Keys" }),
  ).toBeVisible();
  await expect(
    settingsPage
      .getByRole("main")
      .getByText("Custom API Keys", { exact: true }),
  ).toBeVisible();
  await expect(
    settingsPage.getByRole("link", { name: "Upgrade to Pro or Ultra" }),
  ).toBeVisible();

  await setTestSubscription({ orgSlug, plan: "pro", status: "active" });
  await settingsPage.reload();
  await expect(settingsPage.getByText("Fallback API Keys")).toBeVisible();
  await expect(
    settingsPage.getByText("OpenAI API Key", { exact: true }),
  ).toBeVisible();
  await expect(
    settingsPage.getByText("Gemini API Key", { exact: true }),
  ).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: "Test and add" }).first(),
  ).toBeVisible();

  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings/developer`);
  await expectSettingsShell(settingsPage);
  await expect(
    settingsPage.getByRole("heading", { name: "Developer" }),
  ).toBeVisible();
  await expect(
    settingsPage.getByRole("heading", { name: "REST API" }),
  ).toBeVisible();
  await expect(
    settingsPage.getByRole("heading", {
      name: "MCP (Claude Code / Claude Desktop)",
    }),
  ).toBeVisible();
  await settingsPage.getByRole("button", { name: "Create API Key" }).click();
  await settingsPage.getByPlaceholder("My API Key").fill("Settings parity key");
  await settingsPage.getByRole("button", { name: "Create Key" }).click();
  const apiKeyDialog = settingsPage.getByRole("dialog");
  await expect(
    apiKeyDialog.getByText("Your API key has been created"),
  ).toBeVisible();
  await expect(apiKeyDialog.locator("code")).toContainText("tf_");

  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings/members`);
  await expectSettingsShell(settingsPage);
  await expect(
    settingsPage.getByText("Teammates that have access to this workspace."),
  ).toBeVisible();
  await settingsPage
    .getByRole("button", { name: "Invite", exact: true })
    .click();
  const invitedEmail = getUserEmail();
  await settingsPage.getByRole("dialog").getByLabel("Email").fill(invitedEmail);
  await settingsPage
    .getByRole("dialog")
    .getByRole("button", { name: "Send invite" })
    .click();
  await expect(settingsPage.getByText("Invitation sent")).toBeVisible();
  await settingsPage.getByRole("tab", { name: "Invitations" }).click();
  await expect(settingsPage.getByText(invitedEmail)).toBeVisible();

  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings/referral`);
  await expectSettingsShell(settingsPage);
  await expect(settingsPage.getByText("Earn Free Thumbnails")).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: /copy/i }),
  ).toBeVisible();
  const referralMain = settingsPage.getByRole("main");
  await expect(referralMain.getByText("Total", { exact: true })).toBeVisible();
  await expect(
    referralMain.getByText("Pending", { exact: true }),
  ).toBeVisible();
  await expect(referralMain.getByText("Earned", { exact: true })).toBeVisible();

  await gotoSettingsPath(settingsPage, `/orgs/${orgSlug}/settings/danger`);
  await expectSettingsShell(settingsPage);
  await expect(settingsPage.getByText("Slug", { exact: true })).toBeVisible();
  await expect(settingsPage.getByText("Delete the organization")).toBeVisible();
  await expect(
    settingsPage.getByRole("button", { name: "Delete Organization" }),
  ).toBeVisible();
});
