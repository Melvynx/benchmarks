# Plan 003: Fix the `<li>`-inside-`<li>` hydration error in the admin breadcrumb

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 360148f0..HEAD -- src/routes/admin/_navigation/-admin-breadcrumb.tsx src/components/ui/breadcrumb.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `360148f0`, 2026-06-12

## Why this matters

Every `/admin/*` page logs a React hydration error
(`<li> cannot be a descendant of <li>`) because the admin breadcrumb renders
`BreadcrumbSeparator` — which is an `<li>` element — *inside*
`BreadcrumbItem`, which is also an `<li>`. Invalid HTML nesting makes the
browser re-parent the DOM, so server HTML and client render disagree; React
logs the mismatch on every admin page load (observed live in `.logs/web.txt`)
and can fall back to client re-rendering of the subtree. It also pollutes the
console, masking real errors.

## Current state

Files and roles:

- `src/routes/admin/_navigation/-admin-breadcrumb.tsx` — the broken
  component. The faulty block (lines 23-37):

  ```tsx
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Admin</BreadcrumbPage>
        </BreadcrumbItem>
        {segments.map((segment) => (
          <BreadcrumbItem key={segment} className="hidden sm:flex">
            <BreadcrumbSeparator />          {/* <li> inside <li> — the bug */}
            <BreadcrumbPage>{titleize(segment)}</BreadcrumbPage>
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
  ```

  Current imports (lines 1-8): `Breadcrumb, BreadcrumbItem, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator` from `@/components/ui/breadcrumb`, and
  `useLocation` from `@tanstack/react-router`. There is no `Fragment` import
  yet.

- `src/components/ui/breadcrumb.tsx:65-80` — proof that the separator is an
  `<li>`:

  ```tsx
  function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
    return (
      <li
        data-slot="breadcrumb-separator"
        role="presentation"
        aria-hidden="true"
        className={cn("[&>svg]:size-3.5", className)}
        {...props}
      >
        {children ?? <ChevronRight />}
      </li>
    );
  }
  ```

  Do NOT change this file — it is the stock shadcn component and other
  call sites use it correctly.

- Exemplar of correct usage in this repo:
  `src/features/organization/org-shell.tsx:798-825` renders the separator as a
  *sibling* of `BreadcrumbItem` inside a `Fragment`:

  ```tsx
  <Fragment key={`${path}-${index}`}>
    <BreadcrumbItem>…</BreadcrumbItem>
    {!isLast ? <BreadcrumbSeparator /> : null}
  </Fragment>
  ```

Behavioral constraint to preserve: the mapped segments are hidden on mobile
via `className="hidden sm:flex"` on `BreadcrumbItem`. When the separator
moves out of the item, it must carry the same responsive classes or separators
will show on mobile next to hidden labels.

Repo conventions: Lucide icons, no emojis; project rule: add a `CHANGELOG.md`
entry (`FIX:` prefix, present tense) under today's date section.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm ts` | exit 0 |
| Lint | `pnpm lint` | exit 0 (runs `eslint --fix`) |
| Dev servers | `pnpm start-all` | web on http://localhost:3000 (check `.logs/web.txt`; may already be running) |

## Scope

**In scope** (the only files you should modify):

- `src/routes/admin/_navigation/-admin-breadcrumb.tsx`
- `CHANGELOG.md` (one entry)

**Out of scope** (do NOT touch, even though they look related):

- `src/components/ui/breadcrumb.tsx` — stock shadcn primitive, correct as-is.
- `src/features/organization/org-shell.tsx` — already correct; exemplar only.
- Any other breadcrumb call site.

## Git workflow

- Branch: `advisor/003-admin-breadcrumb-hydration`
- One commit: `fix(admin): render breadcrumb separator as sibling to stop li-in-li hydration error`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Restructure the map to render the separator as a sibling

In `src/routes/admin/_navigation/-admin-breadcrumb.tsx`:

1. Add `import { Fragment } from "react";` to the imports.
2. Replace the `segments.map` block with:

   ```tsx
   {segments.map((segment) => (
     <Fragment key={segment}>
       <BreadcrumbSeparator className="hidden sm:flex" />
       <BreadcrumbItem className="hidden sm:flex">
         <BreadcrumbPage>{titleize(segment)}</BreadcrumbPage>
       </BreadcrumbItem>
     </Fragment>
   ))}
   ```

   Note: `BreadcrumbSeparator` defaults to `display` via its own classes; the
   added `hidden sm:flex` keeps mobile behavior identical to before (separator
   and label hide together below `sm`).

**Verify**: `pnpm ts` → exit 0; `pnpm lint` → exit 0.

### Step 2: Confirm the hydration error is gone

Start dev servers if not running (`pnpm start-all`). Load any admin page —
the admin section requires a platform-admin account (Better Auth
`user.role === "admin"`; melvynmal@gmail.com worked during the audit; sign-in
is email OTP, code visible in `.logs/convex.txt` after requesting it). Two
acceptable verification routes:

- Browser console on `http://localhost:3000/admin/users`: previously logged
  `In HTML, <li> cannot be a descendant of <li>` — now absent.
- Or grep the dev log after loading the page:
  `grep -c "cannot be a descendant" .logs/web.txt` — note the count before
  loading, load the page, count must NOT increase.

**Verify**: no new hydration error after loading an admin page with at least
one path segment (e.g. `/admin/users`, which renders "Admin / Users").
Visually: breadcrumb still reads `Admin › Users` on desktop and just `Admin`
on a narrow viewport.

### Step 3: Changelog

Add under today's `## YYYY-MM-DD` section in `CHANGELOG.md`:

```
FIX: Admin breadcrumb rendered its separator <li> inside the breadcrumb item <li>, causing a React hydration error on every admin page; the separator now renders as a sibling (matching the org breadcrumb pattern).
```

**Verify**: `git diff CHANGELOG.md` shows only this addition.

## Test plan

- No new unit tests: this is a DOM-structure fix in a 40-line presentational
  component; the repo's component tests (`__tests__/dialog-manager.test.tsx`
  pattern) would assert markup that the hydration check in Step 2 already
  covers more directly.
- Regression check = Step 2 (no hydration error logged on admin pages).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm ts` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "BreadcrumbSeparator" src/routes/admin/_navigation/-admin-breadcrumb.tsx`
      shows it OUTSIDE `BreadcrumbItem` (sibling inside a `Fragment`)
- [ ] Loading `/admin/users` produces no `cannot be a descendant` line in the
      browser console / `.logs/web.txt`
- [ ] `git status` shows no modified files outside the in-scope list (besides
      pre-existing unrelated worktree changes)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The component no longer matches the "Current state" excerpt (drift).
- After the fix, a DIFFERENT hydration error appears on admin pages — report
  it; do not chase it in this plan.
- The fix appears to require modifying `src/components/ui/breadcrumb.tsx`.

## Maintenance notes

- Any new breadcrumb built in this repo should follow the sibling-separator
  pattern (`org-shell.tsx:798-825` or this file after the fix).
- Reviewer should scrutinize: mobile behavior — separator and item both carry
  `hidden sm:flex` so nothing orphaned shows below the `sm` breakpoint.
