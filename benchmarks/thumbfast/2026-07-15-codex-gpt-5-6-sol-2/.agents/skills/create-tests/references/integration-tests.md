<e2e_testing_guide>

<overview>
E2E tests in NowStack use Playwright. Tests live under `e2e/` and run against a real browser + the live Convex dev deployment.

**Important constraint:** This project does **not** support direct database verification from e2e tests. The codebase used to use Prisma for "verify DB state" assertions, but the migration to Convex left those without a drop-in replacement. Existing e2e tests verify behavior through **UI / URL changes only**, with `// TODO: Verify in Convex database` comments where DB checks used to live. Don't try to import `@/lib/prisma` — it doesn't exist.
</overview>

<configuration>
**playwright.config.ts settings:**
- Timeout: 70 seconds
- Browser: Chromium (Desktop Chrome)
- Retries: 1
- Workers: 3
- Video: On first retry
- Viewport: 1280x720
- Base URL: From environment
- Global teardown: `e2e/global-teardown.ts` (currently a no-op pending a Convex admin API)
</configuration>

<test_utilities>

<auth_helpers>
**Location:** `e2e/utils/auth-test.ts`

**createTestAccount** - Create and sign up a new test user:
```typescript
import { createTestAccount } from "./utils/auth-test";

const userData = await createTestAccount({
  page,
  callbackURL: "/orgs",           // Redirect after signup
  initialUserData: {               // Optional custom data
    name: "John Doe",
    email: "john@example.com",
    password: "SecurePass123",
  },
  admin: true,                     // Optional: make user admin
});

// Returns: { name, email, password }
```

**signInAccount** - Sign in existing user:
```typescript
import { signInAccount } from "./utils/auth-test";

await signInAccount({
  page,
  userData: { email: "user@test.com", password: "password" },
  callbackURL: "/dashboard",
});
```

**signOutAccount** - Sign out current user:
```typescript
import { signOutAccount } from "./utils/auth-test";

await signOutAccount({ page });
```

**getUserEmail** - Generate unique test email:
```typescript
import { getUserEmail } from "./utils/auth-test";

const email = getUserEmail(); // "playwright-test-random@example.com"
```
</auth_helpers>

<retry_helper>
**Location:** `e2e/utils/retry.ts`

Exponential backoff for eventual consistency. Use it to retry **UI assertions** (not DB queries — there's no DB layer accessible from e2e):

```typescript
import { retry } from "./utils/retry";

await retry(
  async () => {
    await page.goto(`/orgs/${orgSlug}/settings/members`);
    await expect(page.getByText(memberEmail)).toBeVisible();
  },
  {
    maxAttempts: 5,
    delayMs: 1000,
    backoff: true,
  },
);
```
</retry_helper>

</test_utilities>

<test_patterns>

<pattern name="basic_auth_flow">
**Simple signup and verification (UI-only):**

```typescript
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test("sign up and verify account creation", async ({ page }) => {
  const userData = await createTestAccount({
    page,
    callbackURL: "/orgs",
  });

  // Verify routing landed in an org workspace
  await page.waitForURL(/\/orgs\/.*/);
  expect(page.url()).toMatch(/\/orgs\/.*/);

  // Verify the new user is signed in via the UI (e.g. avatar, account menu)
  await page.goto("/account");
  await expect(page.getByText(userData.email)).toBeVisible();

  // TODO: Verify user + default org membership in Convex when an admin API is wired up
});
```
</pattern>

<pattern name="organization_workflow">
**Organization member invitation flow (UI-driven):**

The actual reference is `e2e/organization-members.spec.ts`. Note the invitation-acceptance step does **not** look up the invitation ID in the database — it relies on the in-app `Accept Invitation` button on the invited user's session.

```typescript
import { expect, test } from "@playwright/test";
import { createTestAccount, signOutAccount, getUserEmail } from "./utils/auth-test";

test("invite and login as invited user", async ({ page }) => {
  // 1. Create owner account
  const ownerData = await createTestAccount({ page, callbackURL: "/orgs" });
  await page.waitForURL(/\/orgs\/.*/, { timeout: 30000 });

  const orgSlug = page.url().split("/orgs/")[1].split("/")[0];

  // 2. Navigate to members and send invitation
  await page.goto(`/orgs/${orgSlug}/settings/members`);
  await page.getByRole("button", { name: /invite/i }).click();

  const memberEmail = getUserEmail();
  await page.getByLabel("Email").fill(memberEmail);
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Admin" }).click();
  await page.getByRole("button", { name: /invite/i }).click();

  await page.getByRole("dialog", { name: /invite teammates/i })
    .waitFor({ state: "hidden", timeout: 10000 });

  // 3. Verify invitation appears in the Invitations tab
  await page.getByRole("tab", { name: /invitations/i }).click();
  await expect(page.getByText(memberEmail)).toBeVisible();

  // 4. Sign out and create the invited user account
  await signOutAccount({ page });
  await createTestAccount({
    page,
    callbackURL: "/account",
    initialUserData: { email: memberEmail, password: "SecurePass123", name: "Invited User" },
  });

  // 5. Accept invitation through the UI (clicks the Accept button shown to invited users)
  // NOTE: The DB-lookup approach (prisma.invitation.findFirst) is gone - it relied on
  // navigating directly to /orgs/accept-invitation/<id>. Use the in-app accept button.
  await page.getByRole("button", { name: /accept invitation/i }).click();
  await expect(page).toHaveURL(new RegExp(`/orgs/${orgSlug}`));

  // 6. Verify membership via the members page UI
  await page.goto(`/orgs/${orgSlug}/settings/members`);
  await page.waitForLoadState("networkidle");

  const membersSection = page.getByLabel("Members");
  await expect(membersSection.getByText(ownerData.email)).toBeVisible();
  await expect(membersSection.getByText(memberEmail)).toBeVisible();
});
```
</pattern>

<pattern name="admin_access">
**Admin dashboard tests:**

```typescript
import { expect, test } from "@playwright/test";
import { createTestAccount, signOutAccount, signInAccount } from "./utils/auth-test";

test.describe("admin", () => {
  test("verify admin dashboard access", async ({ page }) => {
    const user = await createTestAccount({
      page,
      callbackURL: "/orgs",
      admin: true, // Helper flips the admin flag during signup
    });

    await signOutAccount({ page });
    await signInAccount({
      page,
      userData: { email: user.email, password: user.password },
      callbackURL: "/admin",
    });

    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Organizations" })).toBeVisible();

    await page.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL("/admin/users");

    await page.getByRole("link", { name: "Organizations" }).click();
    await expect(page).toHaveURL("/admin/organizations");
  });
});
```
</pattern>

<pattern name="form_interactions">
**Form filling and submission:**

```typescript
test("fill and submit form", async ({ page }) => {
  await page.goto("/form-page");

  await page.getByLabel("Name").fill("John Doe");
  await page.getByLabel("Email").fill("john@example.com");
  await page.locator('input[name="password"]').fill("SecurePass123");

  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Option 1" }).click();
  await page.getByLabel("I agree").check();

  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText("Success")).toBeVisible();
});
```
</pattern>

<pattern name="navigation_verification">
**URL and navigation testing:**

```typescript
test("navigation flow", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.waitForURL(/\/dashboard\/.*/);
  expect(page.url()).toContain("/dashboard/");
});
```
</pattern>

<pattern name="state_verification">
**Verifying app state without a DB layer:**

E2e tests verify state through what the user/UI sees:

- **URL changes** - `await expect(page).toHaveURL(...)` after the action.
- **UI assertions** - navigate to the relevant page and assert visibility of the expected element (member appears in list, billing card switches plan, etc.).
- **Toast / dialog confirmations** - `await expect(page.getByText("Saved")).toBeVisible()`.

```typescript
// After updating an org slug, verify via URL change + UI re-render
await page.getByRole("button", { name: /save/i }).click();
await page.waitForURL(`**/orgs/${newSlug}/**`, { timeout: 10000 });
expect(page.url()).toContain(`/orgs/${newSlug}/`);

// TODO: Verify the slug change in Convex (not implemented; UI verification is sufficient for now)
```

Existing e2e specs leave `// TODO: Verify in Convex database` comments at the spots where Prisma lookups used to live. Match that pattern when adding new tests.
</pattern>

<pattern name="dialog_interactions">
**Modal and dialog handling:**

```typescript
test("dialog interaction", async ({ page }) => {
  await page.goto("/page-with-dialog");
  await page.getByRole("button", { name: "Open Dialog" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Dialog Title")).toBeVisible();

  await page.getByPlaceholderText("Enter value").fill("Test input");
  await page.getByRole("button", { name: "Confirm" }).click();

  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10000 });
});
```
</pattern>

<pattern name="wait_patterns">
**Proper waiting strategies:**

```typescript
test("waiting patterns", async ({ page }) => {
  await page.waitForURL(/\/expected-path/);
  await page.waitForURL("/exact-path", { timeout: 30000 });

  await page.waitForLoadState("networkidle");

  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Loading").waitFor({ state: "detached" });

  await expect(page.getByText("Content")).toBeVisible({ timeout: 10000 });

  // Manual timeout - use sparingly
  await page.waitForTimeout(2000);
});
```
</pattern>

</test_patterns>

<organization_logic>
**Handling organization context in tests:**

1. **Extract org slug from URL after login:**
   ```typescript
   const orgSlug = page.url().split("/orgs/")[1].split("/")[0];
   ```

2. **Navigate to org-specific pages:**
   ```typescript
   await page.goto(`/orgs/${orgSlug}/settings`);
   await page.goto(`/orgs/${orgSlug}/settings/members`);
   ```

3. **Verify org membership through the UI** (members list page):
   ```typescript
   await page.goto(`/orgs/${orgSlug}/settings/members`);
   const membersSection = page.getByLabel("Members");
   await expect(membersSection.getByText(userData.email)).toBeVisible();
   ```

4. **Multi-user org workflows:**
   ```typescript
   const ownerData = await createTestAccount({ page, callbackURL: "/orgs" });
   // ... owner actions ...

   await signOutAccount({ page });
   const memberData = await createTestAccount({ page });
   // ... member actions ...
   ```
</organization_logic>

<global_teardown>
**Test data cleanup is currently a NO-OP.**

`e2e/global-teardown.ts`:

```typescript
async function globalTeardown() {
  // TODO: Implement cleanup using Convex admin API when available
  // Previously used: prisma.user.deleteMany for test users with "playwright-test-" prefix
  // Convex doesn't support direct database mutations from test context yet
  // eslint-disable-next-line no-console
  console.info(
    "Skipping cleanup: Convex cleanup requires admin API implementation",
  );
}

export default globalTeardown;
```

Test emails should still use `getUserEmail()` (`playwright-test-*` prefix) so a future Convex-side cleanup can target them. Don't add ad-hoc cleanup logic to individual tests — it'll need to be replaced once a real teardown lands.
</global_teardown>

<locators>
**Recommended Playwright locators:**

```typescript
// By role (preferred - accessible)
page.getByRole("button", { name: "Submit" })
page.getByRole("link", { name: "Dashboard" })
page.getByRole("textbox", { name: "Email" })
page.getByRole("combobox")
page.getByRole("option", { name: "Option" })
page.getByRole("tab", { name: "Settings" })
page.getByRole("dialog")

// By label (form fields)
page.getByLabel("Email")
page.getByLabel("Password")

// By text
page.getByText("Welcome")
page.getByText(/partial match/i)

// By placeholder
page.getByPlaceholderText("Enter email")

// By name attribute
page.locator('input[name="password"]')

// By test ID (fallback)
page.getByTestId("submit-button")

// Nested locators
page.getByLabel("Members").getByText(email)
page.getByText(email).locator("..").locator("..")
```
</locators>

<best_practices>
1. **Use auth helpers** - `createTestAccount`, `signInAccount`, `signOutAccount`
2. **Generate unique emails** - `getUserEmail()` so a future Convex-side teardown can match the prefix
3. **Wait properly** - `waitForURL`, `waitForLoadState`, `expect(...).toBeVisible({ timeout })` instead of arbitrary `waitForTimeout`
4. **Verify state via the UI** - URL changes, visible elements, toasts. There is no Prisma / direct DB access; mark missing DB checks with a `// TODO: Verify in Convex` comment if the assertion is non-trivial
5. **Extract org slug from the URL** after login for org-specific routes
6. **Handle dialogs** - wait for `state: "hidden"` after submit, not arbitrary delays
7. **Use accessible locators** - `getByRole`, `getByLabel` over CSS selectors
8. **Test full user journeys**, not just isolated UI bits
</best_practices>

<debugging>
**Debug failing tests:**

```bash
# Headless run (CI-compatible)
pnpm test:e2e:ci

# Run a specific spec
npx playwright test e2e/signup.spec.ts

# Debug mode (interactive)
npx playwright test --debug

# View HTML report after a run
npx playwright show-report
```

`pnpm test:e2e` opens the Playwright UI runner — never use it from Claude Code (incompatible with non-interactive sessions).

Videos are automatically captured on first retry for failed tests.
</debugging>

</e2e_testing_guide>
