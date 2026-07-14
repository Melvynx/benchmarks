#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

source_tree="$(resolve_source_tree)"
ensure_not_source_tree "$source_tree" "ALLOW_SOURCE_TREE_CLEANUP" "worktree-cleanup" "clean"

cleanup_convex_env_vars() {
  local deployment_mode
  deployment_mode="$(resolve_convex_deployment_mode)"

  if [ "$deployment_mode" != "cloud" ]; then
    return 0
  fi

  if [ "${CONVEX_WORKTREE_KEEP_CONVEX_ENV:-0}" = "1" ]; then
    echo "[worktree-cleanup] keeping Convex env vars"
    return 0
  fi

  local workspace_slug
  local target_deployment
  workspace_slug="$(slugify "$(resolve_workspace_name)")"
  target_deployment="$(resolve_convex_deployment_ref "$workspace_slug")"

  case "$target_deployment" in
    dev/*)
      ;;
    *)
      echo "[worktree-cleanup] refusing to remove Convex env vars from non-worktree deployment: $target_deployment"
      return 0
      ;;
  esac

  local env_file
  env_file="$(mktemp -t thumbfast-convex-env-cleanup)"

  if ! pnpm exec convex env list --deployment "$target_deployment" > "$env_file"; then
    rm -f "$env_file"
    echo "[worktree-cleanup] could not list Convex env vars for $target_deployment; skipping"
    return 0
  fi

  if [ ! -s "$env_file" ]; then
    rm -f "$env_file"
    echo "[worktree-cleanup] no Convex env vars to remove from $target_deployment"
    return 0
  fi

  echo "[worktree-cleanup] removing Convex env vars from $target_deployment"
  while IFS= read -r line; do
    local name
    name="${line%%=*}"
    name="${name#export }"

    if [[ ! "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      continue
    fi

    pnpm exec convex env remove --deployment "$target_deployment" "$name" >/dev/null
    echo "[worktree-cleanup] removed Convex env var $name"
  done < "$env_file"

  rm -f "$env_file"
}

cleanup_convex_env_vars

if [ "${CONVEX_WORKTREE_KEEP_LOCAL_STATE:-0}" != "1" ]; then
  if [ -d ".convex" ]; then
    echo "[worktree-cleanup] removing local Convex state"
    trash_path ".convex"
  fi
fi

rm -f ".env" ".env.local" ".env.development.local" ".env-convex"
echo "[worktree-cleanup] cleanup complete"
