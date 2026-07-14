---
name: step-01-single-project-brief
description: Strict step 2a - ask exactly one project question
prev_step: steps/step-00-init.md
next_step: steps/step-02-update-agents-md.md
---

# Step 2a: Get Project Information

## Mandatory Rules

- Ask exactly one question.
- Do not ask separate questions for users, features, CTA, tone, repo, domain, or landing mode.
- The user may answer by attaching or pasting `prd.md`, attaching or pasting `archi.md`, or writing a detailed explanation.
- Stop after asking and wait for the answer.
- If the answer is too vague to update docs/config, ask for more detail only once, still as a single follow-up.

## Gate

Start only if Step 1 is complete. If the GitHub repo was not bootstrapped or Convex was not checked, go back to Step 1.

Before asking, read `INIT_CHECKLIST.md` and verify:

- `[x] Step 1 complete`
- `[x] Product GitHub repo created or verified`
- `[x] main tracks origin/main`
- `Current step: 2a`

After asking the question, STOP. Do not continue to `AGENTS.md` or config until the user answers.

Before stopping after the question, update `INIT_CHECKLIST.md`:

- Check `[x] Step 2a started`.
- Check `[x] Single product question asked`.
- Set `Waiting for` to `project_brief`.

## Question

Use `request_user_input` when available and allowed. Otherwise ask in plain text.

French:

```text
Envoie-moi un `prd.md`, un `archi.md`, ou explique-moi le projet avec le plus de détails possible : ce que l'app fait, pour qui, les fonctionnalités principales, le modèle business, et les intégrations importantes.
```

English:

```text
Send me a `prd.md`, an `archi.md`, or explain the project in as much detail as possible: what the app does, who it is for, the main features, the business model, and important integrations.
```

## Store The Answer

From the response, store:

- `{project_brief}` as the full source of truth.
- `{prd_content}` if a PRD is provided.
- `{archi_content}` if architecture details are provided.
- `{app_name}` if the user explicitly provides one; otherwise keep the argument/folder-derived value.
- `{app_id}` as kebab-case.

Do not invent missing business details. Infer only low-risk config values such as kebab-case id and short description.

On the later turn after the user answers, store the answer and load `./step-02-update-agents-md.md`.

Before loading Step 2b, update `INIT_CHECKLIST.md`:

- Check `[x] Product brief received`.
- Check `[x] Step 2a complete`.
- Set `Current step` to `2b`.
- Set `Waiting for` to `none`.

Before loading Step 2b, declare:

```text
INIT STATE: step=2b; waiting_for=none; completed=repo_bootstrapped,convex_checked,identity_set,project_brief_received
```
