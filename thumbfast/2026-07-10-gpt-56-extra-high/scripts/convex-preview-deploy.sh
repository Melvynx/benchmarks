#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

root="$(cd "$script_dir/.." && pwd)"
cd "$root"

log() {
  printf '[convex-preview] %s\n' "$*"
}

cleanup() {
  if [ -n "${export_dir:-}" ] && [ -d "$export_dir" ]; then
    if command -v trash >/dev/null 2>&1; then
      trash "$export_dir" >/dev/null 2>&1 || true
    else
      rm -r "$export_dir" >/dev/null 2>&1 || true
    fi
  fi
}
trap cleanup EXIT

site_url="$(resolve_site_url || true)"
if [ -z "$site_url" ]; then
  echo "[convex-preview] ERROR: cannot resolve SITE_URL from Vercel env." >&2
  exit 1
fi

deploy_args=(
  deploy
  --cmd "SITE_URL='$site_url' VITE_APP_URL='$site_url' pnpm build"
  --cmd-url-env-var-name VITE_CONVEX_URL
)

if [ -n "${CONVEX_PREVIEW_RUN_FUNCTION:-}" ]; then
  deploy_args+=(--preview-run "$CONVEX_PREVIEW_RUN_FUNCTION")
fi

if [ "${VERCEL_ENV:-}" = "preview" ] && [ -n "${CONVEX_PREVIEW_NAME:-}" ]; then
  deploy_args+=(--preview-name "$CONVEX_PREVIEW_NAME")
fi

log "deploying Convex functions and building the app for $site_url"
pnpm exec convex "${deploy_args[@]}"

log "syncing Convex runtime URL env"
scripts/convex-sync-env.sh "$site_url"

if [ "${VERCEL_ENV:-}" != "preview" ]; then
  log "VERCEL_ENV is not preview; skipping production data import"
  exit 0
fi

if [ "${CONVEX_PREVIEW_IMPORT_PROD_DATA:-1}" != "1" ]; then
  log "CONVEX_PREVIEW_IMPORT_PROD_DATA is disabled; skipping production data import"
  exit 0
fi

if [ -z "${CONVEX_PROD_DEPLOY_KEY:-}" ]; then
  log "CONVEX_PROD_DEPLOY_KEY is missing; skipping production data import"
  log "run pnpm vercel:setup-convex-env once to enable automatic prod snapshot imports for previews"
  exit 0
fi

export_dir="$(mktemp -d "${TMPDIR:-/tmp}/thumbfast-convex-preview.XXXXXX")"
snapshot_path="$export_dir/production-snapshot.zip"
export_args=(export --prod --path "$snapshot_path")

if [ "${CONVEX_PREVIEW_IMPORT_FILE_STORAGE:-1}" = "1" ]; then
  export_args+=(--include-file-storage)
fi

log "exporting production data snapshot"
CONVEX_DEPLOY_KEY="$CONVEX_PROD_DEPLOY_KEY" pnpm exec convex "${export_args[@]}"

log "importing production snapshot into the preview deployment"
pnpm exec convex import "$snapshot_path" --replace-all -y

log "preview deployment data matches the production snapshot"
