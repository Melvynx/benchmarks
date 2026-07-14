#!/usr/bin/env bash
set -euo pipefail

REMOTE_NAME="nowstack"
REPO="melvynx/nowstack"
BRANCH=""
MODE="merge"
DRY_RUN=0
RUN_INSTALL=1
RUN_VERIFY=1
ALLOW_DIRTY=0

usage() {
  cat <<'EOF'
Usage: sync-with-nowstack.sh [options]

Options:
  --dry-run             Print the actions without changing the repository.
  --merge               Merge the upstream branch into the current branch (default).
  --rebase              Rebase the current branch onto the upstream branch.
  --remote <name>       Remote name to use (default: nowstack).
  --repo <owner/name>   Canonical repo owner/name or full git URL (default: melvynx/nowstack).
  --branch <name>       Upstream branch to sync from (default: remote HEAD).
  --allow-dirty         Allow sync with uncommitted local changes.
  --no-install          Skip pnpm install when dependency files changed.
  --no-verify           Skip pnpm ts after sync.
  -h, --help            Show this help.
EOF
}

log() {
  printf '%s\n' "$*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] %q' "$1"
    shift
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

normalize_repo_url() {
  local value="$1"

  if [[ "$value" == *"://"* || "$value" == git@*:* ]]; then
    printf '%s\n' "$value"
    return
  fi

  if [[ "$value" == */* ]]; then
    printf 'https://github.com/%s.git\n' "$value"
    return
  fi

  fail "--repo must be owner/name or a full git URL"
}

remote_head_branch() {
  local remote="$1"
  local ref

  ref="$(git symbolic-ref --quiet --short "refs/remotes/${remote}/HEAD" 2>/dev/null || true)"
  if [[ -n "$ref" ]]; then
    printf '%s\n' "${ref#${remote}/}"
    return
  fi

  ref="$(git remote show "$remote" 2>/dev/null | sed -n 's/^[[:space:]]*HEAD branch: //p' | head -n 1)"
  if [[ -n "$ref" ]]; then
    printf '%s\n' "$ref"
    return
  fi

  if git show-ref --verify --quiet "refs/remotes/${remote}/main"; then
    printf 'main\n'
    return
  fi

  if git show-ref --verify --quiet "refs/remotes/${remote}/master"; then
    printf 'master\n'
    return
  fi

  return 1
}

ensure_not_mid_operation() {
  local git_dir
  git_dir="$(git rev-parse --git-dir)"

  [[ ! -d "${git_dir}/rebase-merge" && ! -d "${git_dir}/rebase-apply" ]] || fail "a rebase is already in progress"
  [[ ! -f "${git_dir}/MERGE_HEAD" ]] || fail "a merge is already in progress"
  [[ ! -f "${git_dir}/CHERRY_PICK_HEAD" ]] || fail "a cherry-pick is already in progress"
  [[ ! -f "${git_dir}/REVERT_HEAD" ]] || fail "a revert is already in progress"
}

ensure_clean_worktree() {
  if [[ "$DRY_RUN" == "1" || "$ALLOW_DIRTY" == "1" ]]; then
    return
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    fail "working tree has uncommitted changes. Commit them first, or rerun with --allow-dirty if you intentionally want Git to merge over local changes."
  fi
}

changed_between() {
  local before="$1"
  local after="$2"
  shift 2

  git diff --name-only "$before" "$after" -- "$@" | grep -q .
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --merge)
      MODE="merge"
      shift
      ;;
    --rebase)
      MODE="rebase"
      shift
      ;;
    --remote)
      REMOTE_NAME="${2:-}"
      [[ -n "$REMOTE_NAME" ]] || fail "--remote requires a value"
      shift 2
      ;;
    --repo)
      REPO="${2:-}"
      [[ -n "$REPO" ]] || fail "--repo requires a value"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      [[ -n "$BRANCH" ]] || fail "--branch requires a value"
      shift 2
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      shift
      ;;
    --no-install)
      RUN_INSTALL=0
      shift
      ;;
    --no-verify)
      RUN_VERIFY=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
done

git rev-parse --show-toplevel >/dev/null 2>&1 || fail "run this script inside a git repository"
cd "$(git rev-parse --show-toplevel)"

ensure_not_mid_operation
ensure_clean_worktree

REPO_URL="$(normalize_repo_url "$REPO")"
CURRENT_BRANCH="$(git branch --show-current)"
[[ -n "$CURRENT_BRANCH" ]] || fail "detached HEAD is not supported; checkout a branch first"

log "Checking access to ${REPO_URL}"
if [[ "$DRY_RUN" == "1" ]]; then
  log "[dry-run] git ls-remote --symref ${REPO_URL} HEAD"
elif ! git ls-remote --symref "$REPO_URL" HEAD >/dev/null 2>&1; then
  fail "cannot access ${REPO_URL}. Confirm the repository exists and this GitHub account has collaborator access, or pass --repo <owner/name-or-url>."
fi

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  log "Adding remote ${REMOTE_NAME}: ${REPO_URL}"
  run git remote add "$REMOTE_NAME" "$REPO_URL"
else
  CURRENT_REMOTE_URL="$(git remote get-url "$REMOTE_NAME")"
  if [[ "$CURRENT_REMOTE_URL" != "$REPO_URL" ]]; then
    log "Updating remote ${REMOTE_NAME}: ${REPO_URL}"
    run git remote set-url "$REMOTE_NAME" "$REPO_URL"
  fi
fi

log "Fetching ${REMOTE_NAME}"
run git fetch --prune "$REMOTE_NAME"

if [[ "$DRY_RUN" == "1" ]]; then
  BRANCH="${BRANCH:-main}"
else
  BRANCH="${BRANCH:-$(remote_head_branch "$REMOTE_NAME")}"
fi

[[ -n "$BRANCH" ]] || fail "could not detect ${REMOTE_NAME}'s default branch; pass --branch <name>"
UPSTREAM_REF="${REMOTE_NAME}/${BRANCH}"

if [[ "$DRY_RUN" != "1" ]]; then
  git show-ref --verify --quiet "refs/remotes/${UPSTREAM_REF}" || fail "remote branch ${UPSTREAM_REF} does not exist"
fi

BEFORE_SHA="$(git rev-parse HEAD)"
BACKUP_BRANCH="backup/${CURRENT_BRANCH//\//-}-before-nowstack-${BEFORE_SHA:0:12}-$(date +%Y%m%d-%H%M%S)"

log "Current branch: ${CURRENT_BRANCH}"
log "Upstream branch: ${UPSTREAM_REF}"
log "Backup branch: ${BACKUP_BRANCH}"
run git branch "$BACKUP_BRANCH" "$CURRENT_BRANCH"

set +e
if [[ "$MODE" == "rebase" ]]; then
  log "Rebasing ${CURRENT_BRANCH} onto ${UPSTREAM_REF}"
  run git rebase "$UPSTREAM_REF"
  RESULT=$?
else
  log "Merging ${UPSTREAM_REF} into ${CURRENT_BRANCH}"
  run git merge --no-edit "$UPSTREAM_REF"
  RESULT=$?
fi
set -e

if [[ "$RESULT" != "0" ]]; then
  log ""
  log "Sync stopped because Git reported conflicts."
  if [[ "$MODE" == "rebase" ]]; then
    log "Resolve conflicts, then run: git rebase --continue"
    log "To abort: git rebase --abort"
  else
    log "Resolve conflicts, then run: git commit"
    log "To abort: git merge --abort"
  fi
  log "Backup branch remains available at: ${BACKUP_BRANCH}"
  exit "$RESULT"
fi

AFTER_SHA="$(git rev-parse HEAD)"

if [[ "$BEFORE_SHA" == "$AFTER_SHA" ]]; then
  log "Already up to date."
else
  log "Synced ${CURRENT_BRANCH} with ${UPSTREAM_REF}."
fi

if [[ "$DRY_RUN" == "1" ]]; then
  log "Dry run complete."
  exit 0
fi

if [[ "$RUN_INSTALL" == "1" ]] && changed_between "$BEFORE_SHA" "$AFTER_SHA" package.json pnpm-lock.yaml; then
  if command -v pnpm >/dev/null 2>&1; then
    log "Dependency files changed; running pnpm install."
    pnpm install
  else
    log "Dependency files changed, but pnpm is not available. Run pnpm install manually."
  fi
fi

if [[ "$RUN_VERIFY" == "1" && -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    log "Running pnpm ts."
    pnpm ts
  else
    log "pnpm is not available. Skipping pnpm ts."
  fi
fi

log "Done. Review with: git status --short --branch && git diff --stat ${BEFORE_SHA}..HEAD"
