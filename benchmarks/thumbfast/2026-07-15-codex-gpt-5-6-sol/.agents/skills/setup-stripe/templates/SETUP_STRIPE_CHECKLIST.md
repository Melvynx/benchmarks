# Setup Stripe Checklist

Temporary runtime checklist for `/setup-stripe`.

This file must stay at the project root while the workflow is running. The agent must update it after every gate. At the end of the workflow, after validation and final summary preparation, delete it with `trash SETUP_STRIPE_CHECKLIST.md`.

## State

- Current step:
- Waiting for:
- Stripe mode:
- Plan names:
- Stripe price envs:
- Code files updated:
- Validation notes:

## Step 0 - Preflight

- [ ] Runtime checklist created
- [ ] Step 0 started
- [ ] Convex configuration checked
- [ ] Billing files read
- [ ] Stripe helpers verified
- [ ] Step 0 complete

## Step 1 - API Keys

- [ ] Step 1 started
- [ ] STRIPE_SECRET_KEY set in Convex env
- [ ] Stripe webhook helper run
- [ ] Convex Stripe env verified
- [ ] Step 1 complete

## Step 2 - Plans And Prices

- [ ] Step 2 started
- [ ] Plan matrix received
- [ ] Plan matrix normalized
- [ ] Step 2 complete

## Step 3 - Code Update

- [ ] Step 3 started
- [ ] Convex guidelines read
- [ ] Billing plan source updated
- [ ] UI plan features updated
- [ ] TypeScript validation passed or documented
- [ ] Step 3 complete

## Step 4 - Stripe Products And Prices

- [ ] Step 4 started
- [ ] Stripe creation dry-run reviewed
- [ ] Stripe products/prices created or reused
- [ ] Stripe price IDs set in Convex env
- [ ] Step 4 complete

## Step 5 - Finish

- [ ] Step 5 started
- [ ] CHANGELOG.md updated
- [ ] Final env verification completed
- [ ] Final summary prepared
- [ ] Runtime checklist deleted with trash

## Notes

- Current blocker:
- Live-mode confirmation:
- Cleanup notes:
