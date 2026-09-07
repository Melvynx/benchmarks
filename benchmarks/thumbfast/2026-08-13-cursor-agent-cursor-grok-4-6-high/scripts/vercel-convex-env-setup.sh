#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

log() {
  printf '[vercel-convex-env] %s\n' "$*"
}

warn() {
  printf '[vercel-convex-env] WARN: %s\n' "$*" >&2
}

ensure_tools() {
  command -v vercel >/dev/null 2>&1 || {
    echo "[vercel-convex-env] ERROR: vercel CLI is missing" >&2
    exit 1
  }

  pnpm exec convex --version >/dev/null
}

vercel_env_list() {
  vercel env ls 2>/dev/null || true
}

has_vercel_env() {
  local name="$1"
  local target="$2"
  vercel_env_list | awk -v key="$name" -v env="$target" '
    $1 == key && index(tolower($0), tolower(env)) > 0 { found = 1 }
    END { exit(found ? 0 : 1) }
  '
}

delete_convex_prod_key() {
  local key_name="$1"
  pnpm exec convex deployment token delete "$key_name" --prod >/dev/null 2>&1 || true
}

create_convex_prod_key() {
  local key_name="$1"
  pnpm exec convex deployment token create "$key_name" --prod | tail -n 1
}

add_preview_env_all_branches() {
  local name="$1"
  local value="$2"

  if [ -t 0 ]; then
    vercel env add "$name" preview --value "$value" --sensitive --force --yes
    return 0
  fi

  warn "cannot add $name to all Preview branches non-interactively with this Vercel CLI version"
  warn "run this command in a terminal and press Enter at the git branch prompt:"
  warn "  vercel env add $name preview --value '<redacted>' --sensitive --force --yes"
  return 1
}

ensure_prod_export_key_for_previews() {
  if has_vercel_env CONVEX_PROD_DEPLOY_KEY preview; then
    log "CONVEX_PROD_DEPLOY_KEY already exists for Vercel Preview"
    return 0
  fi

  local key_name
  local prod_key
  key_name="vercel-preview-prod-export-$(date +%Y%m%d%H%M%S)"
  prod_key="$(create_convex_prod_key "$key_name")"

  if [ -z "$prod_key" ]; then
    echo "[vercel-convex-env] ERROR: failed to create Convex prod deploy key" >&2
    exit 1
  fi

  if add_preview_env_all_branches CONVEX_PROD_DEPLOY_KEY "$prod_key"; then
    log "added CONVEX_PROD_DEPLOY_KEY to Vercel Preview"
  else
    delete_convex_prod_key "$key_name"
    exit 1
  fi
}

verify_required_vercel_envs() {
  local missing=0

  if ! has_vercel_env CONVEX_DEPLOY_KEY production; then
    warn "missing CONVEX_DEPLOY_KEY for Vercel Production"
    missing=1
  fi

  if ! has_vercel_env CONVEX_DEPLOY_KEY preview; then
    warn "missing CONVEX_DEPLOY_KEY for Vercel Preview"
    missing=1
  fi

  if ! has_vercel_env CONVEX_PROD_DEPLOY_KEY preview; then
    warn "missing CONVEX_PROD_DEPLOY_KEY for Vercel Preview"
    missing=1
  fi

  if [ "$missing" = "1" ]; then
    return 1
  fi
}

ensure_tools
ensure_prod_export_key_for_previews
verify_required_vercel_envs

log "Vercel Convex env is ready: production/preview deploy keys exist, and preview can export prod snapshots"
