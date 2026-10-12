---
name: step-05-update-theme-landing-everything
description: Strict step 4 - apply theme and update landing/product copy, optionally using a background agent
prev_step: steps/step-04-update-theme.md
next_step: steps/step-06-setup-env.md
---

# Step 4: Update Theme, Landing, And Product Copy

## Mandatory Rules

- Ask whether the user agrees to launch a background agent before using one.
- After asking for background-agent permission, STOP until the user answers.
- If the user agrees, launch one background/worker agent for landing/product-copy update work when the environment supports it.
- If the user refuses or background agents are unavailable, do the work locally.
- Preserve existing component structure unless the brief makes a structure change necessary.
- Never keep broad shadcn-generated UI primitive churn without reviewing the diff.
- Always inspect `git diff` after the shadcn command.
- Always preserve custom CSS tokens such as success, warning, info, NProgress, and existing base-layer styles.
- MUST use the exact safe shadcn command: `pnpm dlx shadcn@latest init --preset b2CjxkIO8 --base base --template start --pointer`.
- FORBIDDEN: `--template next`, `--yes`, `--reinstall`, or `--force` for this shadcn command.

## Gate

Start only if `{theme_input}` is present or the user explicitly skipped theme work.

If `{theme_input}` is missing, return to Step 3 and ask for the shadcn URL/preset.

Before asking background-agent permission, read `INIT_CHECKLIST.md` and verify:

- `[x] Step 3 complete`
- `Current step: 4`

Update `INIT_CHECKLIST.md` when starting:

- Check `[x] Step 4 started`.

## 1. Ask For Background-Agent Permission

Use `request_user_input` when available and allowed.

French:

```text
Tu veux que je lance un agent en arrière-plan pour aider à mettre à jour la landing, la copy produit et les références visibles pendant que j'applique le thème ?
```

English:

```text
Do you want me to launch a background agent to help update the landing page, product copy, and visible references while I apply the theme?
```

Options:

- `Yes, launch background agent`
- `No, do it locally`

Store the answer as `{background_agent_choice}`.

STOP here until the user answers. Do not apply the theme or edit landing copy before this answer exists.

Before stopping after asking, update `INIT_CHECKLIST.md`:

- Check `[x] Background agent permission asked`.
- Set `Waiting for` to `background_agent_choice`.

## 2. Apply shadcn Theme

If `{theme_input}` is `skip`, skip theme application and continue to copy updates.

Normalize `{theme_input}`:

- default safe preset -> `b2CjxkIO8`
- `--preset b2CjxkIO8` -> `b2CjxkIO8`
- `b2CjxkIO8` -> `b2CjxkIO8`
- any other preset -> STOP unless the user explicitly confirms they want to override the safe preset despite the risk

Run:

```bash
pnpm dlx shadcn@latest init --preset b2CjxkIO8 --base base --template start --pointer
```

Then immediately inspect:

```bash
git diff -- src/globals.css components.json src/components/ui
```

Keep only the necessary theme/config changes. Restore or manually re-add any deleted custom tokens:

- `--success`
- `--warning`
- `--info`
- `#nprogress`
- required `@layer base` styles

If the shadcn command changes unrelated UI primitives, inspect the call sites before keeping those changes. If the generated churn is not necessary for the theme, restore it and keep only theme/config changes.

## 3. Update Landing And Product References

Read before editing:

```bash
rg -n "NowStack|nowts|boilerplate|SaaS|CTA|Hero|FAQ|Features|Testimonials|Review" src/routes src/features content emails convex package.json README.md
```

Update:

- landing hero and CTA
- feature section copy
- FAQ/reviews/testimonials only when still boilerplate-specific
- footer/header visible product name
- docs/readme references that are obviously now wrong
- metadata and SEO references close to the landing/config surface

Use `{project_brief}` as the source of truth. Do not invent proof, customers, pricing, or integrations.

## 4. Verify

```bash
pnpm ts
```

If UI behavior changed, start the app with the canonical command and verify in the browser:

```bash
pnpm start-all
```

Update `INIT_CHECKLIST.md` before continuing:

- Check `[x] Background agent choice resolved`.
- Check `[x] Theme applied or explicitly skipped`.
- Check `[x] Safe shadcn command used`.
- Check `[x] Theme diff reviewed`.
- Check `[x] Landing/product copy updated`.
- Check `[x] TypeScript passed after landing/theme`.
- Check `[x] Step 4 complete`.
- Set `Current step` to `5`.
- Set `Waiting for` to `env_values`.

Before loading Step 5, declare:

```text
INIT STATE: step=5; waiting_for=env_values; completed=repo_bootstrapped,convex_checked,identity_set,project_brief_received,claude_updated,config_updated,theme_step_complete,landing_updated
```

Then load `./step-06-setup-env.md`.
