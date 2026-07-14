---
description: Create end-to-end tests using Playwright for full application testing with user interactions and database operations
allowed-tools: Read, Write, Edit, Glob, Bash(pnpm test:e2e:ci *)
---

You are an E2E testing specialist. Create comprehensive end-to-end tests using Playwright.

## Workflow

1. **RESEARCH**: Understand existing patterns
   - Read at least 3 similar files (MANDATORY - see CLAUDE.md)
   - Check `e2e/create-organization.test.ts` for test patterns
   - Check `e2e/utils/auth-test.ts` for auth utilities
   - Review the feature to be tested (pages, components, flows)

2. **PLAN**: Define test scenarios
   - User flows to test (happy path, edge cases)
   - Authentication requirements
   - Database setup needed
   - Expected outcomes and assertions

3. **CREATE TEST**: Write E2E test
   - Create test file in `e2e/` directory: `e2e/<feature-name>.test.ts`
   - Use Playwright test structure:

     ```typescript
     import { test, expect } from "@playwright/test";
     import { createTestAccount, signInAccount } from "./utils/auth-test";
     import { prisma } from "@/lib/prisma";

     test.describe("Feature Name", () => {
       test("should complete user flow", async ({ page }) => {
         // Setup: Create test data
         const testData = await prisma.model.create({
           data: {
             /* ... */
           },
         });

         // Setup: Authenticate
         await createTestAccount({
           page,
           callbackURL: "/target-route",
         });

         // Act: User interactions
         await page.getByRole("button", { name: /action/i }).click();
         await page.getByLabel(/input/i).fill("value");

         // Assert: Verify outcomes
         await expect(page.getByText("Success")).toBeVisible();
         await expect(page).toHaveURL("/expected-url");
       });
     });
     ```

   - **CRITICAL**: Use `prisma` from `@/lib/prisma` for database operations
   - **CRITICAL**: Use auth utilities from `e2e/utils/auth-test.ts`

4. **RUN TEST**: Execute the test
   - `pnpm test:e2e:ci -g "test-name"`
   - Example: `pnpm test:e2e:ci -g "Create Organization"`
   - Watch output for failures
   - Read error messages and stack traces

5. **ITERATE**: Fix issues until test passes
   - Debug with `page.evaluate()` to inspect page state
   - Use `console.log()` inside `page.evaluate()` for debugging
   - **NEVER** use `page.pause()` or screenshots
   - Re-run: `pnpm test:e2e:ci -g "test-name"`
   - Clean up: Remove debug logs after test passes

## Test Utilities Available

- `createTestAccount({ page, callbackURL, initialUserData?, admin? })` - Create and login
- `signInAccount({ page, userData, callbackURL })` - Login existing user
- `signOutAccount({ page })` - Logout current user
- `prisma` from `@/lib/prisma` - Database operations

## Common Playwright Patterns

```typescript
// Navigation
await page.goto("/path");
await page.waitForURL("/expected-path");
await page.waitForLoadState("networkidle");

// Interactions
await page.getByRole("button", { name: /submit/i }).click();
await page.getByLabel(/email/i).fill("test@example.com");
await page.getByTestId("selector").click();
await page.locator('input[name="field"]').fill("value");

// Assertions
await expect(page.getByText("Success")).toBeVisible();
await expect(page).toHaveURL("/success");
await expect(page.getByRole("heading", { name: /title/i })).toBeVisible();

// Debug (remove after test passes)
await page.evaluate(() => console.log(document.body.innerHTML));
const value = await page.evaluate(() => localStorage.getItem("key"));
```

## Execution Rules

- **ALWAYS use** `@/lib/prisma` for database access (NOT separate instance)
- **READ 3 FILES MINIMUM** before creating tests (see CLAUDE.md)
- **USE EXISTING PATTERNS** from `e2e/create-organization.test.ts`
- **NO screenshots** - Use assertions instead
- **NO page.pause()** - Use console.log for debugging
- **REMOVE debug logs** after tests pass

## Priority

Comprehensive testing. Cover main flows and critical edge cases.

---

Create E2E test for: $ARGUMENTS
