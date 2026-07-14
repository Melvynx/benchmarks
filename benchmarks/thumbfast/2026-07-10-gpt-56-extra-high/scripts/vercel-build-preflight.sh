#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[vercel-build-preflight] %s\n' "$*"
}

if [ -z "${VERCEL_ENV:-}" ]; then
  exit 0
fi

log "using existing Convex deployment env; Vercel build does not mutate env"
