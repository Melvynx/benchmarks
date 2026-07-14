---
name: step-02-update-agents-md
description: Strict step 2b - update AGENTS.md from the single project brief
prev_step: steps/step-01-gather-info.md
next_step: steps/step-03-update-config.md
---

# Step 2b: Update AGENTS.md

## Mandatory Rules

- Read `AGENTS.md` before editing.
- `AGENTS.md` is the central agent entrypoint. `CLAUDE.md` is only a deeplink and must not be edited here.
- Update only the project-context section (`## About the project ...`). Preserve all operational rules, stack notes, rule index, command tables, and import rules.
- Use `{project_brief}` as the only product source of truth.
- Do not ask more product questions unless the brief is unusable.

## Gate

Start only if `{project_brief}` is present.

If `{project_brief}` is missing, do not edit files. Return to Step 2a and ask the single project question.

Before editing, read `INIT_CHECKLIST.md` and verify:

- `[x] Step 2a complete`
- `[x] Product brief received`
- `Current step: 2b`

Update `INIT_CHECKLIST.md` when starting:

- Check `[x] Step 2b started`.

## Sequence

### 1. Read the file

```bash
sed -n '1,240p' AGENTS.md
```

Find the existing `## About the project ...` section. If no clear section exists, add a concise `## About the project {app_name}` section near the top (after the intro paragraph and before `## Project Foundation` / `## Stack`) without disrupting rules.

Also confirm `CLAUDE.md` is still a thin deeplink to `AGENTS.md`. If it contains real guidance, replace it with the deeplink stub:

```markdown
# CLAUDE.md

All project instructions, rules, and conventions live in [AGENTS.md](./AGENTS.md).

This file exists only as a deeplink for Claude Code. Do not duplicate guidance here. Edit `AGENTS.md` and the rule files under `.agents/rules/` instead.
```

### 2. Write project context

Include only information grounded in the brief. Edit the `## About the project {app_name}` section in `AGENTS.md`:

```markdown
## About the project {app_name}

{concise product summary}

### Product Source

The project brief was provided during `/init-project` and is the source of truth for product decisions.

### Users

{users or "Not specified yet"}

### Main Features

- {feature}
- {feature}
- {feature}

### Business / Positioning

{business model, target market, or "Not specified yet"}

### Architecture Notes

{architecture and integrations if provided}
```

If the user sent a full PRD or architecture document, summarize it. Do not paste huge documents verbatim.

### 3. Verify

Read the edited section again and confirm unrelated sections of `AGENTS.md` (stack, rule index, commands, server/data rules, frontend rules, verification) are unchanged. Confirm `CLAUDE.md` is still just the deeplink stub.

Update `INIT_CHECKLIST.md` before continuing:

- Check `[x] AGENTS.md read`.
- Check `[x] AGENTS.md updated from project brief`.
- Check `[x] AGENTS.md verified`.
- Check `[x] CLAUDE.md verified as deeplink stub`.
- Check `[x] Step 2b complete`.
- Set `Current step` to `2c`.
- Set `Waiting for` to `none`.

Then declare:

```text
INIT STATE: step=2c; waiting_for=none; completed=repo_bootstrapped,convex_checked,identity_set,project_brief_received,agents_updated
```

Then load `./step-03-update-config.md`.
