---
name: step-05-setup-stripe-finalize
description: Strict step 5 - update changelog, clean temporary files, and summarize Stripe setup
prev_step: steps/step-04-update-code.md
---

# Step 5: Finalize

## Mandatory Rules

- Start only if Step 4 is complete.
- Update `CHANGELOG.md` under today's `## YYYY-MM-DD` section.
- Do not include secret values in the changelog or final summary.
- Delete temporary runtime files with `trash`, not `rm`.

## Gate

Read `SETUP_STRIPE_CHECKLIST.md` and verify:

- `[x] Step 4 complete`
- `Current step: 5`

Update the checklist:

- Check `[x] Step 5 started`.

## Changelog

Open `CHANGELOG.md`. Under today's date, add one concise entry at the top of the section, for example:

```markdown
FEATURE: Add configured Stripe billing plans and Convex price env setup
```

## Final Verification

Run:

```bash
pnpm exec convex env list | rg 'STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|STRIPE_.*PLAN_ID'
git diff -- . ':!SETUP_STRIPE_CHECKLIST.md'
```

Do not print secret values. `convex env list` should show keys, not values.

## Cleanup

After the final summary is prepared, delete temporary files:

```bash
trash SETUP_STRIPE_CHECKLIST.md
```

If `trash` is unavailable, leave the files in place and mention the cleanup blocker.

## Final Summary

Include:

- Stripe mode: `test` or `live`.
- Convex env keys configured, without values.
- Stripe products/prices created or reused, listing Price IDs only.
- Code files updated.
- Validation commands run and their result.
- Confirm that the Stripe webhook points at the Convex site URL, not localhost.
- Any manual Stripe dashboard follow-up, if applicable.

Never include `sk_*`, webhook signing secrets, or full secret values.
