---
name: init-project
description: "Strict NowStack project initialization: bootstrap a clean GitHub repo with gh, verify Convex, collect one project brief, update docs/config, apply shadcn theme, update landing, configure Convex env and Cloudflare R2, finish"
argument-hint: "[app-name]"
---

# Init Project - Strict NowStack Initialization

<objective>
Initialize a NowStack project in one strict order: bootstrap a clean product GitHub repository with GitHub CLI, verify Convex setup, collect one detailed project brief, update AGENTS.md (the central agent entrypoint; CLAUDE.md is only a deeplink) and config, ask for a shadcn/ui theme URL, update theme/landing with optional background-agent help, configure Convex env variables including Cloudflare R2 provisioning, commit/push the initialized project, then finish.
</objective>

<strict_order>
This workflow MUST follow this order exactly. Do not reorder, merge, or skip steps unless the user explicitly asks to stop or skip the current step.

1. Repository and setup verification: create or attach a clean GitHub product repo with `gh`, collapse fresh template history into a clean baseline commit when safe, set branch upstream tracking, then check whether Convex is configured and running. If Convex is not configured, try to configure it automatically with the current folder name as the project slug.
2. Project information: ask exactly one product question. The user can send `prd.md`, `archi.md`, or a detailed explanation. Then update `AGENTS.md` (central agent entrypoint - `CLAUDE.md` stays a thin deeplink), then update config.
3. shadcn/ui theme request: send the user `https://ui.shadcn.com/create`, wait, then use the safe preset command only.
4. Theme, landing, and everything update: apply the theme, update the landing and related visible product copy, and ask whether the user agrees to launch a background agent for this broad update.
5. Convex env guide: interactively collect environment variables, provision Cloudflare R2 through the Cloudflare API, and set runtime variables in Convex with `pnpm exec convex env set`.
6. Finish: validate, update the changelog, create the final initialization commit, push to the product repo, summarize, and stop.
</strict_order>

<interaction_rules>

- Ask only one product-discovery question in Step 2.
- Do not ask repo, target-user, CTA, marketing-tone, landing-mode, or env-mode discovery batches.
- Use GitHub CLI for repo bootstrap in Step 1. Default to a private repo named `{app_id}` under the authenticated `gh` account unless the user explicitly provided a repo target.
- If the checkout still points at the NowStack template, preserve that URL as `upstream`, create/set `origin` to the product repo, and set `main` to track `origin/main`.
- Clean commit history only for fresh/template initialization. Never rewrite a non-empty existing product repo or a dirty user worktree without explicit user confirmation.
- Do not write backend runtime secrets to `.env`, `.env.local`, or Vercel env. Backend runtime secrets belong in Convex env. The Cloudflare R2 provisioning token is setup-only and may be saved in local `.env`.
- Use `request_user_input` when available and allowed for the theme, background-agent, and env checkpoints. Plain text is the fallback.
- Launch a background agent only after the user explicitly agrees at Step 4.
- Keep the user's language for all prompts.
</interaction_rules>

<shadcn_safety_contract>
The shadcn theme command is fragile. The init-project workflow MUST use this exact command unless the user explicitly overrides it in the same turn and accepts the risk:

```bash
pnpm dlx shadcn@latest init --preset b2CjxkIO8 --base base --template start --pointer
```

Rules:

- Default safe preset is `b2CjxkIO8`.
- Never use `--template next` in this workflow.
- Never add `--yes`, `--reinstall`, or `--force` to this command.
- If the command prompts interactively, handle the prompt or stop. Do not change flags to bypass prompts.
- After the command, inspect the diff before keeping any generated changes.
</shadcn_safety_contract>

<hard_execution_contract>
The agent MUST treat this workflow as a gated state machine, not as loose guidance.

Before every step, write a compact internal state summary in the assistant response or task plan:

```text
INIT STATE: step={current_step}; waiting_for={none|project_brief|theme|background_agent_choice|env_values}; completed={comma-separated completed gates}
```

Rules:

- Never execute a step if its gate is missing. Go back to the step that collects the missing input.
- Never advance past a STOP gate in the same assistant turn.
- If user input is needed, ask exactly the requested question, then stop.
- If a tool/command fails, do not skip forward. Fix it, retry when safe, or stop with the blocker.
- If the user changes a previous answer, update the state and resume from the earliest affected step.
- If conversation context is compacted or unclear, reconstruct state from the latest files and user messages before continuing.
</hard_execution_contract>

<init_checklist_protocol>
The agent MUST use a temporary root checklist file to force strict ordering.

Checklist file:

- Runtime path: `INIT_CHECKLIST.md` at the project root.
- Template path: `.agents/skills/init-project/templates/INIT_CHECKLIST.md`.
- Create it in Step 1 before any setup command if it does not exist.
- Update it before and after every step by checking boxes and filling the small form fields.
- Update it with normal file edits; do not overwrite the whole checklist unless creating it from the template.
- Read only the current step file plus `INIT_CHECKLIST.md` before acting. Do not read later step files early unless the current step explicitly says to load them.
- If `INIT_CHECKLIST.md` says a previous checkbox is incomplete, stop and complete that previous gate first.
- At the very end, after validation passes and the final summary is prepared, delete the runtime file with `trash INIT_CHECKLIST.md`, then send the final summary. Never use `rm` or `rm -rf`.
- If `trash` is unavailable, do not delete the file; tell the user the cleanup command could not run.
</init_checklist_protocol>

<stop_gates>
These are mandatory stop points:

| Stop Gate                             | Step | Stop Until                                                               |
| ------------------------------------- | ---- | ------------------------------------------------------------------------ |
| Convex login/team prompt              | 1    | User completes Convex CLI prompt or gives a new instruction              |
| Product brief question asked          | 2a   | User provides `prd.md`, `archi.md`, or detailed project explanation      |
| Theme URL/preset requested            | 3    | User sends shadcn theme URL, preset id, `--preset ...`, or explicit skip |
| Background agent permission requested | 4    | User chooses yes or no                                                   |
| Env service group requested           | 5    | User provides `KEY=value` lines or explicit skip for that group          |

</stop_gates>

<gate_matrix>
| Step | Required Before Starting | Required Before Advancing |
| --- | --- | --- |
| 1 | Skill loaded | GitHub repo bootstrapped or explicitly documented as already configured, Convex checked, `{app_name}`, `{app_id}`, `{language}` set |
| 2a | Step 1 complete | Product question asked, then STOP; later `{project_brief}` stored |
| 2b | `{project_brief}` present | `AGENTS.md` updated and verified, `CLAUDE.md` still a deeplink stub |
| 2c | Step 2b complete | Config updated and `pnpm ts` passes or failure is explained |
| 3 | Step 2c complete | Theme request sent, then STOP; later safe preset command confirmed |
| 4 | `{theme_input}` present or explicit skip | Background permission resolved, theme/copy changes done, `pnpm ts` run |
| 5 | Step 4 complete | Convex env groups configured or explicitly skipped, `convex env list` checked |
| 6 | Step 5 complete | Validation, changelog, and final summary complete |
</gate_matrix>

<state_variables>
Persist these values across steps:

| Variable                     | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `{language}`                 | Detected user language, usually `fr` or `en`                              |
| `{app_name}`                 | App display name from argument, project brief, or folder name             |
| `{app_id}`                   | Kebab-case technical id inferred from app name or folder name             |
| `{repo_slug}`                | GitHub `owner/repo` product repository slug created or verified in Step 1 |
| `{repo_remote_url}`          | Product repository remote URL used for `origin`                           |
| `{git_baseline_commit}`      | Clean starter baseline commit SHA or `existing_history_preserved`         |
| `{project_brief}`            | Full user-provided PRD, architecture note, or detailed explanation        |
| `{prd_content}`              | PRD content if provided                                                   |
| `{archi_content}`            | Architecture content if provided                                          |
| `{theme_input}`              | User response to the shadcn theme checkpoint                              |
| `{theme_preset}`             | Safe preset id, default `b2CjxkIO8`                                       |
| `{background_agent_choice}`  | Whether user agreed to background-agent help                              |
| `{convex_env_configured}`    | List of env vars successfully set in Convex                               |
| `{convex_env_skipped}`       | List of env vars intentionally skipped                                    |
| `{cloudflare_r2_bucket}`     | R2 bucket created or reused for file uploads                              |
| `{cloudflare_r2_token_mode}` | `provisioned`, `manual_credentials`, or `skipped`                         |
| `{cloudflare_r2_public_url_mode}` | `custom_domain`, `r2_dev`, `explicit`, or `skipped`                 |

</state_variables>

<entry_point>
Load `steps/step-00-init.md`.
</entry_point>

<step_files>
| Strict Step | File | Purpose |
| --- | --- | --- |
| 1 | `steps/step-00-init.md` | Bootstrap GitHub repo, clean fresh template history, verify Convex setup, and initialize workflow state |
| 2a | `steps/step-01-gather-info.md` | Ask the single product question |
| 2b | `steps/step-02-update-agents-md.md` | Update `AGENTS.md` from the product brief (`CLAUDE.md` remains a deeplink) |
| 2c | `steps/step-03-update-config.md` | Update `src/site-config.ts` and close config references |
| 3 | `steps/step-04-update-theme.md` | Ask the user for a shadcn/ui theme from the required URL |
| 4 | `steps/step-05-update-landing.md` | Apply theme and update landing/product copy, optionally via background agent |
| 5 | `steps/step-06-setup-env.md` | Collect and set Convex environment variables |
| 6 | `steps/step-07-finalize.md` | Validate and summarize |
</step_files>

<bundled_resources>
| File | Purpose |
| --- | --- |
| `templates/INIT_CHECKLIST.md` | Runtime checklist template copied to project root during Step 1 and removed at the end |
| `scripts/setup-cloudflare-r2.mjs` | Cloudflare R2 provisioning helper for Step 5 |
</bundled_resources>

<stack_context>
NowStack uses TanStack Start, React, TailwindCSS v4, shadcn/base-ui, Convex, Better Auth through `@convex-dev/better-auth`, Stripe through Convex actions, Resend, and Cloudflare R2. This is Convex-only: do not introduce Prisma, PostgreSQL, Redis, or database-mirroring setup.

Convex has two local concepts:

- `.env.local` contains the deployment pointer created by Convex (`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`).
- Convex backend env contains server-side runtime variables set by `pnpm exec convex env set KEY value`.

Cloudflare R2 setup uses one local setup secret:

- `.env` may contain `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` so the init workflow can create/reuse the R2 bucket and create a bucket-scoped S3-compatible R2 token.
- The R2 helper should prefer `r2.{SiteConfig.domain}` as the public file domain when that Cloudflare zone is available, and fall back to the managed `r2.dev` URL when it is not.
- App runtime R2 credentials (`R2_S3_URL`, `R2_S3_ACCESS_KEY_ID`, `R2_S3_SECRET_ACCESS_KEY`, `R2_S3_BUCKET_NAME`, `R2_URL`) still belong in Convex backend env.
</stack_context>
