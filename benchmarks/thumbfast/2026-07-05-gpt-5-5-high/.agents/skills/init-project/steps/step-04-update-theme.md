---
name: step-04-request-shadcn-theme
description: Strict step 3 - ask user to create and send a shadcn/ui theme
prev_step: steps/step-03-update-config.md
next_step: steps/step-05-update-landing.md
---

# Step 3: Ask For shadcn/ui Theme

## Mandatory Rules

- This step only asks for the theme.
- You MUST give the URL: `https://ui.shadcn.com/create`.
- Do not apply a theme in this step.
- The safe preset for the next step is `b2CjxkIO8`.
- The next step MUST use `pnpm dlx shadcn@latest init --preset b2CjxkIO8 --base base --template start --pointer`.
- Stop and wait after asking.

## Gate

Start only if Step 2c config updates are complete.

Before asking, read `INIT_CHECKLIST.md` and verify:

- `[x] Step 2c complete`
- `Current step: 3`

After sending the URL/request, STOP. Do not load Step 4 in the same assistant turn.

Before stopping after the theme request, update `INIT_CHECKLIST.md`:

- Check `[x] Step 3 started`.
- Check `[x] shadcn URL sent`.
- Check `[x] Theme requested`.
- Set `Waiting for` to `theme`.

## Prompt

French:

```text
Va sur https://ui.shadcn.com/create et regarde le thème. Ensuite confirme-moi que je peux lancer le preset safe avec cette commande exacte : `pnpm dlx shadcn@latest init --preset b2CjxkIO8 --base base --template start --pointer`.
```

English:

```text
Go to https://ui.shadcn.com/create and review the theme. Then confirm I can run the safe preset with this exact command: `pnpm dlx shadcn@latest init --preset b2CjxkIO8 --base base --template start --pointer`.
```

## Accepted Inputs

- confirmation to run the safe command
- `--preset b2CjxkIO8`
- `b2CjxkIO8`
- `skip` only if the user explicitly wants to skip theme work

On the later turn after the user answers, store the answer as `{theme_input}` and set `{theme_preset}` to `b2CjxkIO8` unless the user explicitly overrides the preset and accepts the risk.

Before loading Step 4, update `INIT_CHECKLIST.md`:

- Check `[x] Theme input received or explicitly skipped`.
- Check `[x] Step 3 complete`.
- Set `Current step` to `4`.
- Set `Waiting for` to `background_agent_choice`.

Before loading Step 4, declare:

```text
INIT STATE: step=4; waiting_for=background_agent_choice; completed=repo_bootstrapped,convex_checked,identity_set,project_brief_received,claude_updated,config_updated,theme_received
```

Then load `./step-05-update-landing.md`.
