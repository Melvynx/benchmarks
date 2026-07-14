#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

convex_env_list="$(pnpm exec convex env list)"

convex_has_env_key() {
  local key="$1"

  printf '%s\n' "$convex_env_list" | grep -Eq "^${key}="
}

read_env_value() {
  local key="$1"
  local file
  local line
  local value

  value="${!key:-}"
  if [ -n "$value" ]; then
    printf '%s\n' "$value"
    return 0
  fi

  for file in .env.local .env .env.development.local; do
    if [ ! -f "$file" ]; then
      continue
    fi

    line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
    if [ -z "$line" ]; then
      continue
    fi

    value="${line#*=}"
    value="${value%$'\r'}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf '%s\n' "$value"
    return 0
  done

  return 1
}

set_convex_env_value() {
  local key="$1"
  local value="$2"

  pnpm exec convex env set "$key" "$value" >/dev/null
  echo "[convex-env] set $key"
}

with_https() {
  local host="$1"

  if [ -z "$host" ]; then
    return 0
  fi

  if [[ "$host" == http://* || "$host" == https://* ]]; then
    printf '%s\n' "$host"
    return 0
  fi

  printf 'https://%s\n' "$host"
}

append_trusted_origin() {
  local origin="$1"
  local existing_origin

  if [ -z "$origin" ]; then
    return 0
  fi

  for existing_origin in "${trusted_origins[@]:-}"; do
    if [ "$existing_origin" = "$origin" ]; then
      return 0
    fi
  done

  trusted_origins+=("$origin")
}

append_loopback_aliases() {
  local origin="$1"
  local port

  case "$origin" in
    http://localhost:*)
      port="${origin##*:}"
      append_trusted_origin "http://127.0.0.1:$port"
      ;;
    http://127.0.0.1:*)
      port="${origin##*:}"
      append_trusted_origin "http://localhost:$port"
      ;;
  esac
}

sync_missing_env_value() {
  local key="$1"
  local value

  if value="$(read_env_value "$key")" && [ -n "$value" ]; then
    if convex_has_env_key "$key"; then
      return 0
    fi

    set_convex_env_value "$key" "$value"
  fi
}

site_url="$(resolve_site_url "${1:-}" || true)"
if [ -n "$site_url" ]; then
  trusted_origins=()

  append_trusted_origin "$site_url"
  append_loopback_aliases "$site_url"
  append_trusted_origin "$(with_https "${VERCEL_URL:-}")"
  append_trusted_origin "$(with_https "${VERCEL_BRANCH_URL:-}")"
  append_trusted_origin "$(with_https "${VERCEL_PROJECT_PRODUCTION_URL:-}")"
  append_trusted_origin "https://beta.thumbfa.st"
  append_trusted_origin "http://localhost:3000"
  append_trusted_origin "http://127.0.0.1:3000"

  set_convex_env_value SITE_URL "$site_url"
  set_convex_env_value BETTER_AUTH_URL "$site_url"
  set_convex_env_value BETTER_AUTH_TRUSTED_ORIGINS "$(
    IFS=,
    printf '%s' "${trusted_origins[*]}"
  )"
fi

sync_missing_env_value BETTER_AUTH_SECRET
sync_missing_env_value BETTER_AUTH_COOKIE_PREFIX
sync_missing_env_value GITHUB_CLIENT_ID
sync_missing_env_value GITHUB_CLIENT_SECRET
sync_missing_env_value GOOGLE_CLIENT_ID
sync_missing_env_value GOOGLE_CLIENT_SECRET
sync_missing_env_value RESEND_API_KEY
sync_missing_env_value EMAIL_FROM
sync_missing_env_value LOG_AUTH_OTP
sync_missing_env_value MIGRATION_SECRET
sync_missing_env_value CLOUDFLARE_WATERMARK_WORKER_URL
