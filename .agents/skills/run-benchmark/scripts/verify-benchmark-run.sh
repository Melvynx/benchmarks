#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
BENCHMARKS_DIR="$ROOT/benchmarks"
JQ_BIN="$(type -P jq)"
[[ $# -gt 0 ]] || { echo "Usage: $0 <run-dir>..." >&2; exit 2; }
mkdir -p "$ROOT/.benchmark-verification-port-locks"

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
      trap 'kill "$server_pid" 2>/dev/null || true' EXIT
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        if curl -fsS "http://127.0.0.1:$verify_port/index.html" >/dev/null; then runtime_ok=true; break; fi
        sleep 1
      done
      kill "$server_pid" 2>/dev/null || true
      wait "$server_pid" 2>/dev/null || true
      trap - EXIT
      build_ok=true
    elif [[ "$type" == web-app || "$type" == cloned-web-app ]]; then
      [[ -f "$app_path/package.json" ]] || { echo "Missing package.json: $app_path" >&2; exit 1; }
      (cd "$app_path" && pnpm run build) > "$data_dir/build.log" 2>&1 && build_ok=true
      [[ "$build_ok" == true ]] || { echo "Build failed: $app_path (see $data_dir/build.log)" >&2; exit 1; }
      (cd "$app_path" && pnpm run dev --host 127.0.0.1 --port "$port") > "$data_dir/runtime.log" 2>&1 &
      server_pid=$!
      trap 'kill "$server_pid" 2>/dev/null || true' EXIT
      for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
        if curl -fsS "http://127.0.0.1:$port/" >/dev/null; then runtime_ok=true; break; fi
        sleep 1
      done
      kill "$server_pid" 2>/dev/null || true
      wait "$server_pid" 2>/dev/null || true
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
