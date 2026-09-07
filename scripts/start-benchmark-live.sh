#!/usr/bin/env bash
# Marks the benchmark that just started and makes sure the live dashboard is up.
# Safe to call repeatedly and concurrently. Set BENCHMARK_LIVE=0 to opt out.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${BENCHMARK_LIVE_PORT:-9500}"
BENCHMARK_ID="${1:-}"

[[ "${BENCHMARK_LIVE:-1}" != 0 ]] || exit 0

# The marker is what a running dashboard polls to discover the new group, so write
# it even when the server is already up.
mkdir -p "$ROOT/.benchmark-live"
printf '{"benchmark_id":"%s","started_at":"%s"}\n' \
  "$BENCHMARK_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ROOT/.benchmark-live/current.json"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Live dashboard: http://localhost:$PORT"
  exit 0
fi

NODE_BIN="$(command -v node || true)"
[[ -n "$NODE_BIN" ]] || NODE_BIN="$(zsh -lic 'command -v node' 2>/dev/null | tr -d '\r')"
[[ -n "$NODE_BIN" ]] || { echo "node not found; skipping live dashboard" >&2; exit 0; }

mkdir -p "$ROOT/.logs"
nohup "$NODE_BIN" "$ROOT/scripts/benchmark-live.mjs" >"$ROOT/.logs/benchmark-live.log" 2>&1 &
disown 2>/dev/null || true
echo "Live dashboard: http://localhost:$PORT"
