#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

source_tree="$(resolve_source_tree)"
ensure_source_tree_exists "$source_tree" "worktree-setup"
ensure_not_source_tree "$source_tree" "ALLOW_SOURCE_TREE_SETUP" "worktree-setup" "set up"

workspace_slug="$(slugify "$(resolve_workspace_name)")"
auth_cookie_prefix="$(resolve_worktree_auth_cookie_prefix "$workspace_slug")"
convex_deployment_mode="$(resolve_convex_deployment_mode)"
convex_target_deployment=""
convex_created_deployment=0

echo "[worktree-setup] setting up Thumbfa.st worktree: $workspace_slug"

warn_and_continue() {
  echo "[worktree-setup] warning: $*; continuing" >&2
}

copy_local_env() {
  local env_path="$1"
  local source_path="$source_tree/$env_path"
  local target_path="$PWD/$env_path"

  if [ -f "$source_path" ]; then
    if [ "$source_path" = "$target_path" ]; then
      return 0
    fi
    cp "$source_path" "$env_path"
    echo "[worktree-setup] copied $env_path"
  fi
}

copy_local_env ".env"
copy_local_env ".env.local"
copy_local_env ".env.development.local"

set_local_env_value() {
  local env_path="$1"
  local key="$2"
  local value="$3"

  touch "$env_path"

  if grep -Eq "^${key}=" "$env_path"; then
    ENV_KEY="$key" ENV_VALUE="$value" perl -0pi -e 'my $key = $ENV{ENV_KEY}; my $value = $ENV{ENV_VALUE}; s/^\Q$key\E=.*/$key . "=" . $value/me' "$env_path"
  else
    printf '%s=%s\n' "$key" "$value" >> "$env_path"
  fi
}

set_local_env_value ".env" "BETTER_AUTH_COOKIE_PREFIX" "$auth_cookie_prefix"
set_local_env_value ".env.local" "BETTER_AUTH_COOKIE_PREFIX" "$auth_cookie_prefix"
echo "[worktree-setup] using Better Auth cookie prefix: $auth_cookie_prefix"

echo "[worktree-setup] installing dependencies"
CONVEX_CODEGEN_SKIP=1 pnpm install

configure_convex_local() {
  if [ -f ".env.local" ] && grep -q "^CONVEX_DEPLOYMENT=local" ".env.local"; then
    echo "[worktree-setup] local Convex deployment already selected"
    return 0
  fi

  trash_path ".convex"

  echo "[worktree-setup] creating isolated local Convex deployment"
  if pnpm exec convex deployment create local --select; then
    echo "[worktree-setup] local Convex deployment selected"
    return 0
  fi

  echo "[worktree-setup] local deployment create failed; trying convex dev --local --once"
  pnpm exec convex dev --local --once
}

configure_convex_cloud() {
  local ref
  ref="$(resolve_convex_deployment_ref "$workspace_slug")"
  convex_target_deployment="$ref"

  echo "[worktree-setup] creating/selecting Convex dev deployment: $ref"
  if pnpm exec convex deployment create "$ref" --type dev --select; then
    convex_created_deployment=1
  else
    pnpm exec convex deployment select "$ref"
  fi
}

export_convex_snapshot() {
  local source_deployment="$1"
  local export_path="$2"
  local export_dir="$3"
  local cache_key
  local cache_dir
  local cache_path
  local export_log
  local max_attempts
  local wait_seconds
  local attempt=1

  cache_key="$(printf '%s' "$source_deployment" | tr '/: .' '----' | tr -cd '[:alnum:]-' | tr '[:upper:]' '[:lower:]')"
  cache_dir="${CONVEX_WORKTREE_SNAPSHOT_CACHE_DIR:-$HOME/Library/Caches/thumbfast/convex-worktree-snapshots}"
  cache_path="$cache_dir/${cache_key:-dev}.zip"
  export_log="$export_dir/export.log"
  max_attempts="${CONVEX_WORKTREE_EXPORT_WAIT_ATTEMPTS:-24}"
  wait_seconds="${CONVEX_WORKTREE_EXPORT_WAIT_SECONDS:-5}"

  mkdir -p "$cache_dir"

  while [ "$attempt" -le "$max_attempts" ]; do
    if pnpm exec convex export --deployment "$source_deployment" --path "$export_path" 2>&1 | tee "$export_log"; then
      cp "$export_path" "$cache_path"
      echo "[worktree-setup] cached Convex snapshot for $source_deployment"
      return 0
    fi

    if ! grep -q "ExportInProgress" "$export_log"; then
      return 1
    fi

    if [ -f "$cache_path" ]; then
      cp "$cache_path" "$export_path"
      echo "[worktree-setup] using cached latest Convex snapshot for $source_deployment because an export is already in progress"
      return 0
    fi

    echo "[worktree-setup] Convex export already in progress; waiting ${wait_seconds}s for latest snapshot ($attempt/$max_attempts)"
    sleep "$wait_seconds"
    attempt=$((attempt + 1))
  done

  echo "[worktree-setup] Convex export stayed in progress and no cached snapshot exists for $source_deployment" >&2
  return 1
}

import_convex_dev_data() {
  local source_deployment
  local target_deployment="$1"
  source_deployment="$(resolve_convex_import_source)"

  if [ -z "$target_deployment" ]; then
    return 0
  fi

  if [ "$source_deployment" = "$target_deployment" ]; then
    echo "[worktree-setup] import source and target are both $target_deployment; skipping import"
    return 0
  fi

  if [ "$convex_created_deployment" != "1" ] && [ "${CONVEX_WORKTREE_RESET_DATA:-0}" != "1" ]; then
    echo "[worktree-setup] Convex deployment already existed; skipping data import"
    return 0
  fi

  case "$source_deployment" in
    prod|prod:*|prod/*|production|production:*|production/*)
      if [ "${CONVEX_WORKTREE_ALLOW_PROD_IMPORT:-0}" != "1" ]; then
        warn_and_continue "refusing to import Convex data from production source: $source_deployment"
        return 0
      fi
      ;;
    *prod*|*production*)
      if [ "${CONVEX_WORKTREE_ALLOW_PROD_IMPORT:-0}" != "1" ]; then
        warn_and_continue "Convex import source looks like production: $source_deployment"
        return 0
      fi
      ;;
  esac

  local export_dir
  local export_path
  local snapshot_dir
  local filtered_dir
  local filtered_path
  local selected_count=0
  export_dir="$(mktemp -d -t thumbfast-convex-seed)"
  export_path="$export_dir/source-snapshot.zip"
  snapshot_dir="$export_dir/source"
  filtered_dir="$export_dir/filtered"
  filtered_path="$export_dir/selected-snapshot.zip"

  echo "[worktree-setup] exporting Convex snapshot from $source_deployment without file storage"
  if ! export_convex_snapshot "$source_deployment" "$export_path" "$export_dir"; then
    warn_and_continue "could not export or reuse Convex snapshot from $source_deployment"
    trash_path "$export_dir"
    return 0
  fi

  mkdir -p "$snapshot_dir" "$filtered_dir"
  if ! unzip -qq "$export_path" -d "$snapshot_dir"; then
    warn_and_continue "could not unpack Convex snapshot from $source_deployment"
    trash_path "$export_dir"
    return 0
  fi

  if [ -f "$snapshot_dir/README.md" ]; then
    cp "$snapshot_dir/README.md" "$filtered_dir/README.md"
  fi

  if [ -d "$snapshot_dir/_tables" ]; then
    mkdir -p "$filtered_dir/_tables"
    cp "$snapshot_dir/_tables/documents.jsonl" "$filtered_dir/_tables/documents.jsonl"
  fi

  if [ -f "$snapshot_dir/_components/betterAuth/_tables/documents.jsonl" ]; then
    mkdir -p "$filtered_dir/_components/betterAuth/_tables"
    cp "$snapshot_dir/_components/betterAuth/_tables/documents.jsonl" "$filtered_dir/_components/betterAuth/_tables/documents.jsonl"
  fi

  echo "[worktree-setup] building filtered Convex snapshot for selected tables"

  while IFS= read -r table_entry; do
    table_entry="${table_entry%%#*}"
    table_entry="$(printf '%s' "$table_entry" | xargs)"

    if [ -z "$table_entry" ]; then
      continue
    fi

    if [[ "$table_entry" == *:* ]]; then
      local component="${table_entry%%:*}"
      local table="${table_entry#*:}"
      local source_table_dir="$snapshot_dir/_components/$component/$table"
      local target_table_dir="$filtered_dir/_components/$component/$table"

      if [ -d "$source_table_dir" ]; then
        mkdir -p "$(dirname "$target_table_dir")"
        cp -R "$source_table_dir" "$target_table_dir"
        selected_count=$((selected_count + 1))
        echo "[worktree-setup] selected Convex component table: $table_entry"
      else
        echo "[worktree-setup] selected Convex table not found in snapshot: $table_entry"
      fi
    else
      local source_table_dir="$snapshot_dir/$table_entry"
      local target_table_dir="$filtered_dir/$table_entry"

      if [ -d "$source_table_dir" ]; then
        cp -R "$source_table_dir" "$target_table_dir"
        selected_count=$((selected_count + 1))
        echo "[worktree-setup] selected Convex table: $table_entry"
      else
        echo "[worktree-setup] selected Convex table not found in snapshot: $table_entry"
      fi
    fi
  done < <(resolve_convex_import_tables | tr ',' '\n')

  if [ "$selected_count" = "0" ]; then
    echo "[worktree-setup] no Convex tables selected for import"
    trash_path "$export_dir"
    return 0
  fi

  if ! (cd "$filtered_dir" && zip -qr "$filtered_path" .); then
    warn_and_continue "could not build filtered Convex snapshot"
    trash_path "$export_dir"
    return 0
  fi

  echo "[worktree-setup] importing filtered Convex snapshot with $selected_count selected tables"
  if ! pnpm exec convex import "$filtered_path" --deployment "$target_deployment" --replace-all -y; then
    warn_and_continue "could not import filtered Convex snapshot into $target_deployment"
    trash_path "$export_dir"
    return 0
  fi

  trash_path "$export_dir"
}

clone_convex_dev_env() {
  local source_deployment
  local target_deployment="$1"
  source_deployment="$(resolve_convex_env_source)"

  if [ -z "$target_deployment" ]; then
    return 0
  fi

  if [ "$source_deployment" = "$target_deployment" ]; then
    echo "[worktree-setup] env source and target are both $target_deployment; skipping env clone"
    return 0
  fi

  local env_file
  env_file=".env-convex"

  (
    trap 'rm -f "$env_file"' EXIT
    rm -f "$env_file"

    echo "[worktree-setup] cloning Convex env vars from $source_deployment to $target_deployment"
    pnpm exec convex env list --deployment "$source_deployment" > "$env_file"

    if [ ! -s "$env_file" ]; then
      echo "[worktree-setup] source Convex deployment has no env vars"
      return 0
    fi

    pnpm exec convex env set --deployment "$target_deployment" --from-file "$env_file" --force >/dev/null
  )
}

set_convex_auth_cookie_prefix() {
  local target_deployment="$1"

  if [ -n "$target_deployment" ]; then
    pnpm exec convex env set --deployment "$target_deployment" BETTER_AUTH_COOKIE_PREFIX "$auth_cookie_prefix" >/dev/null
  else
    pnpm exec convex env set BETTER_AUTH_COOKIE_PREFIX "$auth_cookie_prefix" >/dev/null
  fi

  echo "[worktree-setup] set Convex BETTER_AUTH_COOKIE_PREFIX=$auth_cookie_prefix"
}

case "$convex_deployment_mode" in
  local)
    configure_convex_local
    ;;
  cloud)
    configure_convex_cloud
    ;;
  existing)
    copy_local_env ".env.local"
    echo "[worktree-setup] copied existing Convex .env.local"
    ;;
  *)
    echo "[worktree-setup] invalid CONVEX_WORKTREE_DEPLOYMENT_MODE; use local, cloud, or existing" >&2
    exit 1
    ;;
esac

if [ "$convex_deployment_mode" = "cloud" ]; then
  clone_convex_dev_env "$convex_target_deployment" || warn_and_continue "could not clone Convex env vars"
  set_convex_auth_cookie_prefix "$convex_target_deployment" || warn_and_continue "could not set Convex auth cookie prefix"
  scripts/convex-sync-env.sh || warn_and_continue "could not sync Convex URL env"
  echo "[worktree-setup] pushing Convex schema and functions"
  pnpm exec convex dev --once || warn_and_continue "could not push Convex schema and functions"
  import_convex_dev_data "$convex_target_deployment" || warn_and_continue "could not seed Convex data"
else
  set_convex_auth_cookie_prefix "$convex_target_deployment" || warn_and_continue "could not set Convex auth cookie prefix"
fi

echo "[worktree-setup] generating Convex client"
pnpm exec convex codegen || warn_and_continue "could not generate Convex client"

echo "[worktree-setup] setup complete"
