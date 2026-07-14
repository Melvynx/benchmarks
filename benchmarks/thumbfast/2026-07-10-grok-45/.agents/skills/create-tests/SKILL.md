---
name: create-tests
description: This skill should be used when the user asks to "create tests", "write tests", "add unit tests", "add e2e tests", "test this component", or mentions testing, Vitest, Playwright, or test coverage. Covers unit tests with Vitest and e2e tests with Playwright including organization logic.
---

<objective>
Create comprehensive tests for NowStack application using Vitest for unit tests and Playwright for e2e tests. Ensure proper mocking, organization logic handling, and test data management.
</objective>

<quick_start>
<unit_test>
Create unit test in `__tests__/` directory:

```typescript
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { setup } from "@test/setup";

describe("ComponentName", () => {
  it("should render correctly", async () => {
    const { user } = setup(<ComponentName />);

    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

Run: `pnpm test:ci`
</unit_test>

<e2e_test>
Create e2e test in `e2e/` directory:

```typescript
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test("user flow description", async ({ page }) => {
  const userData = await createTestAccount({
    page,
    callbackURL: "/orgs",
  });

  await page.waitForURL(/\/orgs\/.*/);
  expect(page.url()).toMatch(/\/orgs\/.*/);
});
```

Run: `pnpm test:e2e:ci`
</e2e_test>
</quick_start>

<test_commands>
**CRITICAL - Always use CI commands:**

- `pnpm test:ci` - Unit tests (non-interactive)
- `pnpm test:e2e:ci` - E2E tests (headless)

**NEVER use interactive commands** (`pnpm test`, `pnpm test:e2e`)
</test_commands>

<directory_structure>
```
nowts/
├── __tests__/           # Unit tests (Vitest)
├── e2e/                 # E2E tests (Playwright)
│   └── utils/           # E2E helpers
├── test/
│   ├── vitest.setup.ts  # Global mocks
│   └── setup.tsx        # Render helper
```
</directory_structure>

<when_to_use_which>
| Test Type | Use For | Location |
|-----------|---------|----------|
| **Unit** | Utilities, components, stores, Convex-adjacent helpers | `__tests__/` |
| **E2E** | User flows, auth, organization workflows | `e2e/` |

**Unit tests**: Fast, isolated, mock dependencies
**E2E tests**: Real browser, real database, full user journeys
</when_to_use_which>

<mocking_patterns>
Global mocks available in `test/vitest.setup.ts` (no Prisma — backend is Convex):

- `@/lib/auth-server` - `fetchAuthQuery`, `fetchAuthMutation`, `fetchAuthAction`, `getToken`, `handler` (all `vi.fn()`)
- `@/lib/auth-client` - Better Auth client (deep mock via `vitest-mock-extended`)
- `@/lib/auth/auth-user` - `getUser`, `getRequiredUser`
- `@/lib/organizations/get-org` - `getCurrentOrg`, `getRequiredCurrentOrg`
- `@/lib/stripe` - Stripe SDK (deep mock)
- `@/lib/mail/resend` - Resend client (deep mock)
- `@/lib/env` - empty `env: {}` (override per-test if needed)
- `sonner` - Toast notifications
- `@tanstack/react-router` - Router mocks (`useRouter`, `useLocation`, `useSearch`, `useParams`, `Link`)
- `@tanstack/react-start/server` - in-memory shim for `getRequest`
</mocking_patterns>

<reference_guides>
For detailed patterns and complete examples:

- **`references/unit-tests.md`** - Complete unit testing patterns with Vitest
- **`references/integration-tests.md`** - E2E testing patterns with Playwright
</reference_guides>

<success_criteria>
- Tests are in correct directory (`__tests__/` or `e2e/`)
- Use `setup()` helper for component tests
- Mock external dependencies properly
- E2E tests use `createTestAccount()` for auth
- Tests pass with `pnpm test:ci` or `pnpm test:e2e:ci`
- Test data cleaned up (e2e uses global teardown)
</success_criteria>
