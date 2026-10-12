#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
BENCHMARKS_DIR="$ROOT/benchmarks"
JQ_BIN="$(type -P jq)"
[[ $# -gt 0 ]] || { echo "Usage: $0 <run-dir>..." >&2; exit 2; }
mkdir -p "$ROOT/.benchmark-verification-port-locks"
# Apps pin the pnpm version the model had; the verifier's corepack pnpm may
# differ and would otherwise refuse to run the app's scripts at all.
export npm_config_pm_on_fail=ignore pnpm_config_pm_on_fail=ignore
# Background jobs need their own process group so the whole dev-server tree dies
# with them; killing the pnpm wrapper alone leaves the bundler holding the port.
set -m

# A dev server may bind IPv4, IPv6, or both; a run is only unreachable when no
# loopback family answers.
probe() {
  local path="$1" port="$2"
  curl -fsS --max-time 5 "http://127.0.0.1:$port$path" >/dev/null 2>&1 ||
    curl -fsS --max-time 5 "http://[::1]:$port$path" >/dev/null 2>&1
}

stop_server() {
  local pid="$1"
  kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

# A fresh-session iteration writes into a suffixed sibling app, so the newest
# verified iteration is what the run delivered.
delivered_app_path() {
  local data_dir="$1" app_path="$2" task="$3" iteration candidate
  [[ -d "$data_dir/iterations" ]] || { printf '%s\n' "$app_path"; return; }
  # A glob, not ls: CLICOLOR_FORCE makes ls color piped names.
  for iteration in $(cd "$data_dir/iterations" && printf '%s\n' * | sort -rn); do
    candidate="$($JQ_BIN -r 'select(.status == "harness-verified") | .app_path // empty' "$data_dir/iterations/$iteration/metadata.json" 2>/dev/null || true)"
    if [[ "$candidate" == "$BENCHMARKS_DIR/$task/"* && -d "$candidate" ]]; then printf '%s\n' "$candidate"; return; fi
  done
  printf '%s\n' "$app_path"
}

for run_dir in "$@"; do
  [[ -f "$run_dir/run.json" ]] || { echo "Missing run.json: $run_dir" >&2; exit 1; }
  while IFS= read -r data_dir; do
    metadata="$data_dir/metadata.json"
    verification="$data_dir/verification.json"
    recorded_app_path="$($JQ_BIN -r .app_path "$metadata")"
    task="$($JQ_BIN -r .task "$metadata")"
    app_name="$($JQ_BIN -r .app_name "$metadata")"
    app_path="$BENCHMARKS_DIR/$task/$app_name"
    case "$recorded_app_path" in
      "$app_path"|*/"$task"/"$app_name") ;;
      *) echo "Invalid recorded app path: $recorded_app_path" >&2; exit 1 ;;
    esac
    app_path="$(delivered_app_path "$data_dir" "$app_path" "$task")"
    type="$($JQ_BIN -r .type "$metadata")"
    port="$($JQ_BIN -r '.port // empty' "$metadata")"
    [[ -d "$app_path" ]] || { echo "Missing app: $app_path" >&2; exit 1; }

    build_ok=false
    runtime_ok=false
    if [[ "$type" == standalone-html ]]; then
      entry="$app_path/index.html"
      [[ -s "$entry" ]] || { echo "Missing standalone index.html: $app_path" >&2; exit 1; }
      grep -Eiq '<!doctype html>|<html' "$entry"
      verify_port=9400
      while lsof -nP -iTCP:"$verify_port" -sTCP:LISTEN >/dev/null 2>&1 || ! mkdir "$ROOT/.benchmark-verification-port-locks/$verify_port" 2>/dev/null; do verify_port=$((verify_port + 1)); done
      (cd "$app_path" && python3 -m http.server "$verify_port" --bind 127.0.0.1) > "$data_dir/runtime.log" 2>&1 &
      server_pid=$!
      trap 'stop_server "$server_pid"' EXIT
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        if probe /index.html "$verify_port"; then runtime_ok=true; break; fi
        sleep 1
      done
      stop_server "$server_pid"
      trap - EXIT
      build_ok=true
    elif [[ "$type" == web-app || "$type" == cloned-web-app ]]; then
      [[ -f "$app_path/package.json" ]] || { echo "Missing package.json: $app_path" >&2; exit 1; }
      # Apps live below the repository's pnpm workspace but are standalone
      # projects, and a sandboxed harness may have left dependencies uninstalled.
      if "$JQ_BIN" -e '((.dependencies // {}) + (.devDependencies // {})) | length > 0' "$app_path/package.json" >/dev/null; then
        (cd "$app_path" && pnpm --ignore-workspace install --prefer-offline) > "$data_dir/install.log" 2>&1 ||
          { echo "Install failed: $app_path (see $data_dir/install.log)" >&2; exit 1; }
      fi
      if "$JQ_BIN" -e '.scripts.build // empty' "$app_path/package.json" >/dev/null; then
        (cd "$app_path" && PORT="$port" pnpm --ignore-workspace run build) > "$data_dir/build.log" 2>&1 && build_ok=true
      else
        echo "No build script declared; nothing to build." > "$data_dir/build.log"
        build_ok=true
      fi
      [[ "$build_ok" == true ]] || { echo "Build failed: $app_path (see $data_dir/build.log)" >&2; exit 1; }
      (cd "$app_path" && PORT="$port" pnpm --ignore-workspace run dev) > "$data_dir/runtime.log" 2>&1 &
      server_pid=$!
      trap 'stop_server "$server_pid"' EXIT
      # A cold dependency re-optimization can outlast a short probe window.
      for _ in $(seq 45); do
        if probe / "$port"; then runtime_ok=true; break; fi
        sleep 1
      done
      stop_server "$server_pid"
      trap - EXIT
    else
      build_ok=true
      runtime_ok=true
    fi
    [[ "$runtime_ok" == true ]] || { echo "Runtime probe failed: $app_path" >&2; exit 1; }
    tmp="$verification.tmp"
    "$JQ_BIN" --argjson build "$build_ok" --argjson runtime "$runtime_ok" '.app_build_verified=$build | .app_runtime_verified=$runtime' "$verification" > "$tmp"
    mv "$tmp" "$verification"
  done < <(find "$run_dir/data" -mindepth 1 -maxdepth 1 -type d | sort)
done
