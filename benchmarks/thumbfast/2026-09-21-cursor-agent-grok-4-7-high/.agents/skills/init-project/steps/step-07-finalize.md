---
name: step-07-finalize
description: Strict step 6 - validate, summarize, and stop
prev_step: steps/step-06-setup-env.md
next_step: null
---

# Step 6: Finish

## Mandatory Rules

- Run validation.
- Update `CHANGELOG.md` for the initialization changes made in this repo.
- Create the final initialization commit and push it to the product GitHub repo.
- Summarize exactly what changed.
- Mention skipped env/services.
- Stop after the summary.

## Gate

Start only when all required previous gates are complete:

- Convex checked
- GitHub product repo created or verified
- clean baseline commit created or existing history explicitly preserved
- `main` tracks `origin/main`
- Product brief received
- `AGENTS.md` updated (and `CLAUDE.md` still a deeplink stub)
- config updated
- theme step completed or explicitly skipped
- landing/product copy completed
- Convex env groups configured or explicitly skipped
- Files/R2 env handled as a required service group, never marked not applicable
- Cloudflare R2 bucket created or reused, unless the user explicitly chose manual R2 credentials
- Cloudflare R2 public URL mode recorded (`custom_domain`, `r2_dev`, `explicit`, or skipped)

If a gate is missing, do not finalize. Return to the earliest missing step.

Before validation, read `INIT_CHECKLIST.md` and verify every checkbox through Step 5 is complete. If not, return to the earliest incomplete checklist item.

## Validation

Run:

```bash
pnpm ts
pnpm lint:ci
```

If a check fails because of the changes made during this workflow, fix and rerun. If failure is pre-existing or unrelated, report it clearly.

Update `INIT_CHECKLIST.md` after validation:

- Check `[x] Step 6 started`.
- Check `[x] TypeScript validation passed or documented`.
- Check `[x] Lint validation passed or documented`.

## Changelog

Add a concise entry under today's `## YYYY-MM-DD` section:

```markdown
CHORE: Initialize project branding, config, landing, theme, and Convex env setup
```

Adjust the entry to match what actually changed.

Update `INIT_CHECKLIST.md`:

- Check `[x] CHANGELOG.md updated`.

## Final Git Commit And Push

Inspect the final worktree before staging:

```bash
git status --short
git remote -v
git branch -vv
```

Do not include `INIT_CHECKLIST.md`, `.env*`, logs, or secrets in the commit. If unrelated user changes are present that were not created by this workflow, STOP and ask the user how to handle them before staging.

Stage the initialization changes, excluding the runtime checklist:

```bash
git add -A -- ':!INIT_CHECKLIST.md' ':!.env' ':!.env.local' ':!.env.production' ':!.env.preview' ':!.logs/**'
git diff --cached --stat
```

If there are staged changes, commit them:

```bash
git commit -m "chore: initialize {app_id}"
```

If there are no staged changes, record `no_final_commit_needed`.

Push and ensure `main` tracks the product repo:

```bash
git push -u origin main
```

If push fails because the remote has unexpected commits, STOP. Do not force-push over an existing product repo during finalization.

Update `INIT_CHECKLIST.md`:

- Check `[x] Final initialization commit created or not needed`.
- Check `[x] Final changes pushed to origin/main`.

## Final Summary

Include:

- GitHub repo slug, baseline commit status, final commit/push status
- Convex setup status
- product brief source used
- `AGENTS.md` update (and confirmation that `CLAUDE.md` remains a deeplink stub)
- config update
- theme status
- landing/product-copy status
- Convex env keys configured
- Convex env keys skipped
- Cloudflare R2 bucket name, token mode (`provisioned` or `manual_credentials`), and public URL mode (`custom_domain`, `r2_dev`, or `explicit`)
- validation results

Do not propose extra discovery questions. The workflow is finished.

Before sending the final summary, update `INIT_CHECKLIST.md`:

- Check `[x] Final summary prepared`.

Then clean up the runtime checklist:

```bash
trash INIT_CHECKLIST.md
```

Never use `rm` or `rm -rf`. If `trash` is unavailable, leave `INIT_CHECKLIST.md` in place and report that cleanup was skipped.

After cleanup, send the final summary and stop.
