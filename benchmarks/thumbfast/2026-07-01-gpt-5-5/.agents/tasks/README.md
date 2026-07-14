# Tasks

One file per deferred task surfaced by the 2026-05-07 crab review. Each file is self-contained: it lists the problem, the exact files/lines, the acceptance criteria, and how to verify.

Migration work lives separately in [`migration/`](./migration/), numbered from `00`.

Pick up any task in any order unless its `Depends on:` line says otherwise.

| # | File | Area | Risk |
|---|------|------|------|
| 01 | [`01-fix-getuserbyid-full-scan.md`](./01-fix-getuserbyid-full-scan.md) | Performance / Convex | Low |
| 02 | [`02-fix-org-members-n-plus-1.md`](./02-fix-org-members-n-plus-1.md) | Performance / Convex | Low |
| 03 | [`03-fix-get-org-double-round-trip.md`](./03-fix-get-org-double-round-trip.md) | Performance / Convex | Low |
| 04 | [`04-fix-feedback-pagination.md`](./04-fix-feedback-pagination.md) | Performance / Convex schema | Medium (schema index) |
| 05 | [`05-fix-stripe-two-phase-writes.md`](./05-fix-stripe-two-phase-writes.md) | Logic / Billing | High (real money) |
| 06 | [`06-fix-admin-dashboard-reactive-cost.md`](./06-fix-admin-dashboard-reactive-cost.md) | Performance / Convex | Medium (denorm) |
| 07 | [`07-fix-org-command-palette-keyboard.md`](./07-fix-org-command-palette-keyboard.md) | Accessibility | Low |

## How to delegate

```
Use Agent (subagent_type: implementer or general-purpose).
Prompt: "Implement .agents/tasks/<file>. Follow the acceptance criteria exactly.
Run pnpm ts and pnpm lint:ci before reporting done."
```

Each task ends with a Verification block - run those commands, paste the output, only then mark the task done.

## Conventions for adding a new task

- Filename: `NN-short-kebab-title.md` (zero-padded number)
- Sections in order: Problem -> Files -> Acceptance criteria -> Implementation notes -> Verification -> Out of scope
- Every file:line reference must still be valid before you commit. Do not drift from the actual code.
