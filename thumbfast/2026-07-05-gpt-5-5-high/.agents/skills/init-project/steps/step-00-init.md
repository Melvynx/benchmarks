---
name: step-00-repo-and-setup
description: Strict step 1 - detect language, derive app name, bootstrap GitHub repo, verify Convex setup and running state
next_step: steps/step-01-gather-info.md
---

# Step 1: Bootstrap Repository And Verify Setup

## Mandatory Rules

- This is always the first step.
- Detect `{language}` from the user's message before speaking.
- Derive `{app_name}` from the argument if provided; otherwise use the current folder name.
- Derive `{app_id}` as kebab-case from `{app_name}`.
- Bootstrap or verify the GitHub repository before checking Convex or asking product questions.
- Use GitHub CLI (`gh`) for repository creation and lookup.
- Default to a private GitHub repo named `{app_id}` under the authenticated `gh` account unless the user explicitly provided a repo target.
- Preserve a NowStack template remote as `upstream`; set the product repository as `origin`; set `main` to track `origin/main`.
- Clean commit history only for a fresh/template checkout. If the worktree has user changes or `origin` already points to a non-empty product repo, do not rewrite history.
- Check Convex before asking product questions.
- If Convex is not configured, try automatic setup with the current folder name as the project slug.
- Do not edit product files in this step.

## Gate

Start only when the skill is invoked. Before doing anything, declare:

```text
INIT STATE: step=1; waiting_for=none; completed=none
```

Do not load Step 2a until the GitHub repo was bootstrapped or explicitly verified, Convex was checked, and `{app_name}`, `{app_id}`, and `{language}` are set.

Create the runtime checklist before setup commands:

```bash
test -f INIT_CHECKLIST.md || cp .agents/skills/init-project/templates/INIT_CHECKLIST.md INIT_CHECKLIST.md
```

Then update `INIT_CHECKLIST.md`:

- Fill `Current step` with `1`.
- Fill `Waiting for` with `none`.
- Fill app name/id/language once detected.
- Check `[x] Runtime checklist created`.

## Sequence

### 1. Detect language and app identity

```bash
basename "$PWD"
```

Use the folder name as the fallback app name. Normalize the technical id:

```bash
basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]/-/g; s/-+/-/g; s/^-//; s/-$//'
```

### 2. Bootstrap or verify GitHub repository

Inspect local Git and GitHub CLI state:

```bash
git rev-parse --is-inside-work-tree >/dev/null 2>&1 && echo "git_repo" || echo "no_git_repo"
git status --short -- ':!INIT_CHECKLIST.md'
git remote -v || true
gh auth status
```

If `gh auth status` fails, STOP and ask the user to authenticate with `gh auth login`. Do not continue to Convex or the product question.

Resolve the default GitHub owner and repo slug:

```bash
GH_OWNER="$(gh api user --jq .login)"
REPO_NAME="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]/-/g; s/-+/-/g; s/^-//; s/-$//')"
REPO_SLUG="$GH_OWNER/$REPO_NAME"
```

If the user explicitly provided a GitHub repo slug or URL in the command, use that instead of `$REPO_SLUG`.

If this is not a Git repo yet, initialize it:

```bash
git init -b main
```

Classify remotes:

```bash
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
UPSTREAM_URL="$(git remote get-url upstream 2>/dev/null || true)"
printf '%s\n' "$ORIGIN_URL" "$UPSTREAM_URL"
```

If `origin` points to the NowStack starter/template repo and `upstream` is missing, preserve it:

```bash
git remote rename origin upstream
```

If `origin` points to the NowStack starter/template repo and `upstream` already exists, remove only the `origin` remote:

```bash
git remote remove origin
```

Create or attach the product repo with GitHub CLI:

```bash
gh repo view "$REPO_SLUG" --json nameWithOwner,sshUrl,url
```

If `ORIGIN_URL` is already set and it is neither a NowStack starter/template URL nor the resolved product repo URL/slug, STOP before creating or changing remotes. Do not steal an existing product checkout for a different repo.

If that repo does not exist, create it as private without pushing yet:

```bash
gh repo create "$REPO_SLUG" --private --source=. --remote=origin
```

If the repo already exists and `origin` is missing or wrong, set it:

```bash
PRODUCT_SSH_URL="$(gh repo view "$REPO_SLUG" --json sshUrl --jq .sshUrl)"
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$PRODUCT_SSH_URL" || git remote add origin "$PRODUCT_SSH_URL"
```

Before cleaning history, verify the remote is empty or this is still a fresh template checkout:

```bash
git ls-remote --exit-code --heads origin main >/dev/null 2>&1 && echo "origin_has_main" || echo "origin_main_empty"
git status --short -- ':!INIT_CHECKLIST.md'
git log --oneline --decorate -5 || true
```

If `origin` already has `main`, do not rewrite history. Instead verify tracking:

```bash
git fetch origin main
git branch -M main
git branch --set-upstream-to=origin/main main
```

If `origin` is empty and the worktree is clean except `INIT_CHECKLIST.md`, collapse starter/template history into one clean baseline commit:

```bash
git switch --orphan codex-clean-main
git add -A -- ':!INIT_CHECKLIST.md' ':!.env' ':!.env.local' ':!.env.production' ':!.env.preview' ':!.logs/**'
git commit -m "chore: initialize project from NowStack"
git branch -M main
git push -u origin main --force-with-lease
git rev-parse --short HEAD
```

If `git status --short -- ':!INIT_CHECKLIST.md'` shows user changes before this baseline commit, STOP. Do not stage, commit, push, or rewrite history until the user confirms what to include.

After repository setup, verify:

```bash
git remote -v
git branch -vv
gh repo view "$REPO_SLUG" --json nameWithOwner,url,isPrivate
```

Update `INIT_CHECKLIST.md` before continuing:

- Check `[x] GitHub CLI authenticated`.
- Check `[x] Product GitHub repo created or verified`.
- Check `[x] Template remote preserved as upstream or marked not applicable`.
- Check `[x] Clean baseline commit created or existing history preserved`.
- Check `[x] main tracks origin/main`.
- Fill `GitHub repo` with `{repo_slug}`.
- Fill `Git baseline commit` with the clean baseline SHA or `existing_history_preserved`.

### 3. Check Convex configuration

```bash
test -f .env.local && grep -q '^CONVEX_DEPLOYMENT=' .env.local && echo "configured" || echo "missing"
```

### 4. Check whether Convex is already running

Prefer logs and processes:

```bash
test -s .logs/convex.txt && tail -n 80 .logs/convex.txt || true
pgrep -fl 'convex dev|pnpm.*start-all' || true
```

Convex is considered running if a `convex dev` / `pnpm start-all` process is active or recent `.logs/convex.txt` output shows a healthy dev deployment.

### 5. Launch or configure automatically if needed

If Convex is configured but not running, verify and push once:

```bash
pnpm exec convex dev --once
```

If `.env.local` has no `CONVEX_DEPLOYMENT`, run:

```bash
PROJECT_SLUG="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]/-/g; s/-+/-/g; s/^-//; s/-$//')"
pnpm exec convex dev --configure new --project "$PROJECT_SLUG" --once
```

If Convex asks for login/team selection, let the user complete the terminal prompt. If `--project` fails because the CLI cannot infer the team, retry:

```bash
pnpm exec convex dev --configure new --once
```

If the retry still requires an interactive login/team prompt, STOP. Do not ask the product question yet.

After setup, verify:

```bash
test -f .env.local && grep -E '^(CONVEX_DEPLOYMENT|VITE_CONVEX_URL|VITE_CONVEX_SITE_URL)=' .env.local
```

Update `INIT_CHECKLIST.md` before continuing:

- Check `[x] Step 1 started`.
- Check `[x] App identity derived`.
- Check `[x] Convex configuration checked`.
- Check `[x] Convex running or verified with once-run`.
- Check `[x] Step 1 complete`.
- Set `Current step` to `2a`.
- Set `Waiting for` to `project_brief`.

### 6. Continue

Briefly state the product GitHub repo status and whether Convex was already configured/running or was initialized, then declare:

```text
INIT STATE: step=2a; waiting_for=project_brief; completed=repo_bootstrapped,convex_checked,identity_set
```

Then load `./step-01-gather-info.md`.
