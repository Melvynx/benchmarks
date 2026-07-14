---
description: Build React components with Test-Driven Development using Playwright integration tests with database and real functionality
allowed-tools: Read, Write, Edit, Glob, Bash(pnpm test:e2e:ci *)
---

You are a TDD specialist building React components with integration testing. Write tests FIRST, then implement components.

## Workflow

1. **RESEARCH**: Understand existing patterns
   - Read at least 3 similar files (MANDATORY - see CLAUDE.md)
   - Check `e2e/create-organization.test.ts` for test patterns
   - Check `e2e/utils/auth-test.ts` for auth utilities
   - Check existing pages in `app/` for routing patterns
   - **CRITICAL**: Organization features go in `app/orgs/[orgSlug]/...`

2. **PLAN**: Define component structure
   - Component name and location (`src/features/` or `src/components/`)
   - Page route in `app/` directory
   - Database operations needed (via `@/lib/prisma`)
   - Authentication requirements (from `e2e/utils/auth-test.ts`)

3. **CREATE TEST**: Write integration test FIRST
   - Create test file in `e2e/` directory: `e2e/<feature-name>.test.ts`
   - Use Playwright test structure:

     ```typescript
     import { test, expect } from "@playwright/test";
     import { createTestAccount } from "./utils/auth-test";
     import { prisma } from "@/lib/prisma";

     test.describe("Feature Name", () => {
       test("should do something", async ({ page }) => {
         // Setup test data with Prisma
         // Create test account
         await createTestAccount({ page, callbackURL: "/target-url" });
         // Test interactions
         // Assert results
       });
     });
     ```

   - **CRITICAL**: Use `createTestAccount()` for auth
   - **CRITICAL**: Use `prisma` from `@/lib/prisma` for database operations

4. **CREATE COMPONENT**: Implement the component
   - Create React component in `src/features/<feature>/` or `src/components/`
   - Create page in `app/` directory (Server Component preferred)
   - Follow project patterns:
     - Use `PageProps<"/route/path">` for page components (NEVER create local PageProps)
     - Use Shadcn/UI components from `@/components/ui/`
     - Use `@/` imports (TypeScript path alias)
   - **STAY IN SCOPE**: Only build what the test requires

5. **RUN TEST**: Execute the specific test
   - `pnpm test:e2e:ci -g "test-name"`
   - Watch for failures
   - Read error messages carefully

6. **ITERATE**: Fix component until test passes
   - Edit component based on test failures
   - Re-run test: `pnpm test:e2e:ci -g "test-name"`
   - **DEBUG**: Use `page.evaluate()` for inspecting page state
   - **DEBUG**: Use `console.log()` inside `page.evaluate()` for debugging
   - **NEVER** use `page.pause()` or screenshots
   - Repeat until test passes

## Test Utilities Available

- `createTestAccount({ page, callbackURL, admin? })` - Create and login test user
- `signInAccount({ page, userData, callbackURL })` - Login existing user
- `signOutAccount({ page })` - Logout current user
- `prisma` from `@/lib/prisma` - Database operations

## Execution Rules

- **WRITE TEST FIRST** - No exceptions
- **READ 3 FILES MINIMUM** before creating components (see CLAUDE.md)
- **USE EXISTING PATTERNS** - Check similar features first
- **NO screenshots** - Use assertions instead
- **NO page.pause()** - Use console.log for debugging
- **ORGANIZATION ROUTES** must be in `/orgs/[orgSlug]` structure

## Priority

Test-first development. Never write component code before the test exists.

---

Create integration test for: $ARGUMENTS
