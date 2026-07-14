---
name: step-03-update-config
description: Strict step 2c - update site config from the single project brief
prev_step: steps/step-02-update-agents-md.md
next_step: steps/step-04-update-theme.md
---

# Step 2c: Update Config

## Mandatory Rules

- Read config files before editing.
- Update values only. Do not change export structure or TypeScript types.
- Use `{project_brief}` and `{app_name}` only.
- Do not invent a domain, legal company, pricing, or contact email.
- Run `pnpm ts` after config edits.

## Gate

Start only if `AGENTS.md` was updated from the current `{project_brief}`.

If `AGENTS.md` was not updated, return to Step 2b.

Before editing, read `INIT_CHECKLIST.md` and verify:

- `[x] Step 2b complete`
- `Current step: 2c`

Update `INIT_CHECKLIST.md` when starting:

- Check `[x] Step 2c started`.

## Sequence

### 1. Read config

```bash
sed -n '1,220p' src/site-config.ts
```

Also read related close references if they exist:

```bash
rg -n "NowStack|nowstack-saas|SiteConfig|appId|titleTemplate" src convex package.json
```

### 2. Update values

Required updates:

- `SiteConfig.title` -> `{app_name}`
- `SiteConfig.description` -> first clear sentence from `{project_brief}`, under 160 characters
- `SiteConfig.appId` -> `{app_id}`
- SEO title/template/default alt text when they obviously still reference the boilerplate
- `package.json` `name` only if it still uses the boilerplate id

Optional updates only when explicitly present in the brief:

- `prodUrl`
- `domain`
- company name/address/email
- brand colors

### 3. Verify

```bash
pnpm ts
```

Fix type errors caused by the edits and rerun `pnpm ts`. Do not continue while config-caused type errors remain.

Update `INIT_CHECKLIST.md` before continuing:

- Check `[x] Config files read`.
- Check `[x] Config updated`.
- Check `[x] TypeScript passed after config`.
- Check `[x] Step 2c complete`.
- Set `Current step` to `3`.
- Set `Waiting for` to `theme`.

Then declare:

```text
INIT STATE: step=3; waiting_for=theme; completed=repo_bootstrapped,convex_checked,identity_set,project_brief_received,claude_updated,config_updated
```

Then load `./step-04-update-theme.md`.
