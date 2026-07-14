# Init Checklist

Temporary runtime checklist for `/init-project`.

This file must stay at the project root while the workflow is running. The agent must update it after every gate. At the end of the workflow, after validation and final summary preparation, delete it with `trash INIT_CHECKLIST.md`.

## State

- Current step:
- Waiting for:
- Language:
- App name:
- App id:
- GitHub repo:
- Git baseline commit:
- Theme input:
- Background agent choice:
- Convex env configured:
- Convex env skipped:
- Cloudflare R2 bucket:
- Cloudflare R2 token mode:
- Cloudflare R2 public URL mode:

## Step 1 - Bootstrap Repository And Verify Setup

- [ ] Runtime checklist created
- [ ] Step 1 started
- [ ] App identity derived
- [ ] GitHub CLI authenticated
- [ ] Product GitHub repo created or verified
- [ ] Template remote preserved as upstream or marked not applicable
- [ ] Clean baseline commit created or existing history preserved
- [ ] main tracks origin/main
- [ ] Convex configuration checked
- [ ] Convex running or verified with once-run
- [ ] Step 1 complete

## Step 2a - Single Project Brief Question

- [ ] Step 2a started
- [ ] Single product question asked
- [ ] Product brief received
- [ ] Step 2a complete

## Step 2b - Update AGENTS.md

- [ ] Step 2b started
- [ ] AGENTS.md read
- [ ] AGENTS.md updated from project brief
- [ ] AGENTS.md verified
- [ ] CLAUDE.md verified as deeplink stub
- [ ] Step 2b complete

## Step 2c - Update Config

- [ ] Step 2c started
- [ ] Config files read
- [ ] Config updated
- [ ] TypeScript passed after config
- [ ] Step 2c complete

## Step 3 - Request shadcn/ui Theme

- [ ] Step 3 started
- [ ] shadcn URL sent
- [ ] Theme requested
- [ ] Theme input received or explicitly skipped
- [ ] Step 3 complete

## Step 4 - Theme, Landing, Product Copy

- [ ] Step 4 started
- [ ] Background agent permission asked
- [ ] Background agent choice resolved
- [ ] Theme applied or explicitly skipped
- [ ] Safe shadcn command used
- [ ] Theme diff reviewed
- [ ] Landing/product copy updated
- [ ] TypeScript passed after landing/theme
- [ ] Step 4 complete

## Step 5 - Convex Env

- [ ] Step 5 started
- [ ] Base/Auth env handled
- [ ] Email env handled
- [ ] Stripe env handled
- [ ] Cloudflare R2 provisioning token collected or manual credentials chosen
- [ ] Cloudflare R2 bucket created or reused
- [ ] Cloudflare R2 custom domain attached or r2.dev fallback recorded
- [ ] Cloudflare R2 S3 credentials created or provided
- [ ] Files/R2 env handled
- [ ] Convex env list verified
- [ ] Step 5 complete

## Step 6 - Finish

- [ ] Step 6 started
- [ ] TypeScript validation passed or documented
- [ ] Lint validation passed or documented
- [ ] CHANGELOG.md updated
- [ ] Final initialization commit created or not needed
- [ ] Final changes pushed to origin/main
- [ ] Final summary prepared
- [ ] Runtime checklist deleted with trash

## Notes

- Product brief source:
- Current blocker:
- Validation notes:
