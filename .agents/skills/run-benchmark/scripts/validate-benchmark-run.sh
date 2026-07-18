#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
BENCHMARKS_DIR="$ROOT/benchmarks"
JQ_BIN="$(type -P jq)"
[[ $# -gt 0 ]] || { echo "Usage: $0 <run-dir>..." >&2; exit 2; }
ports_file="$(mktemp "${TMPDIR:-/tmp}/benchmark-ports.XXXXXX")"
trap 'trash "$ports_file" 2>/dev/null || /usr/bin/trash "$ports_file" 2>/dev/null || true' EXIT
failures=0
task_count=0

fail() { echo "FAIL: $*" >&2; failures=$((failures + 1)); }

for run_dir in "$@"; do
  [[ -f "$run_dir/run.json" ]] || { fail "missing $run_dir/run.json"; continue; }
  run_output_name="$($JQ_BIN -r .output_name "$run_dir/run.json")"
  run_benchmark_id="$($JQ_BIN -r '.benchmark_id // empty' "$run_dir/run.json")"
  [[ "$run_benchmark_id" =~ ^benchmark-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$ ]] || fail "invalid benchmark ID: $run_dir/run.json"
  while IFS= read -r data_dir; do
    task_count=$((task_count + 1))
    for file in app-path.txt prompt.md command.sh transcript.jsonl stderr.log final.txt session-id.txt resume-command.sh metadata.json verification.json screenshot.png render.json; do
      [[ -f "$data_dir/$file" ]] || fail "missing $data_dir/$file"
    done
    [[ ! -d "$data_dir/app" ]] || fail "app incorrectly stored under runs: $data_dir/app"
    [[ -f "$data_dir/metadata.json" ]] || continue
    task="$($JQ_BIN -r .task "$data_dir/metadata.json")"
    model="$($JQ_BIN -r .model "$data_dir/metadata.json")"
    harness="$($JQ_BIN -r .harness "$data_dir/metadata.json")"
    app_name="$($JQ_BIN -r .app_name "$data_dir/metadata.json")"
    recorded_app_path="$($JQ_BIN -r .app_path "$data_dir/metadata.json")"
    package_manager="$($JQ_BIN -r '.package_manager // empty' "$data_dir/metadata.json")"
    benchmark_id="$($JQ_BIN -r '.benchmark_id // empty' "$data_dir/metadata.json")"
    [[ "$benchmark_id" == "$run_benchmark_id" ]] || fail "benchmark ID mismatch: $data_dir"
    if ! "$JQ_BIN" -e '
      if has("model_timing") then
        if .status == "prepared" then
          .model_timing == null
        else
          (.model_timing.started_at | type) == "string" and
          (.model_timing.completed_at | type) == "string" and
          (.model_timing.duration_ms | type) == "number" and
          .model_timing.duration_ms >= 0
        end
      else
        true
      end
    ' "$data_dir/metadata.json" >/dev/null; then
      fail "invalid model timing metadata: $data_dir"
    fi
    if ! "$JQ_BIN" -e '
      if has("transcript_analysis") then
        if .status == "prepared" then
          .transcript_analysis == null
        elif .transcript_analysis.status == "complete" then
          (.transcript_analysis.progress_bar | type) == "string" and
          (.transcript_analysis.categories | keys | sort) == ["context_gathering","implementation","planning","verification"] and
          ([.transcript_analysis.categories[].percentage] | add) as $total |
          ($total >= 99.99 and $total <= 100.01)
        else
          .transcript_analysis.status == "empty" or .transcript_analysis.status == "unavailable"
        end
      else
        true
      end
    ' "$data_dir/metadata.json" >/dev/null; then
      fail "invalid transcript analysis metadata: $data_dir"
    fi
    if ! "$JQ_BIN" -e '
      if has("session_usage") then
        if .status == "prepared" then
          .session_usage == null
        elif .session_usage.status == "complete" then
          .session_usage.schema_version == 1 and
          (.session_usage.source | type) == "string" and
          (.session_usage.processed_input_tokens | type) == "number" and
          (.session_usage.output_tokens == null or (.session_usage.output_tokens | type) == "number") and
          (.session_usage.total_tokens | type) == "number"
        else
          .session_usage.status == "unavailable"
        end
      else
        true
      end
    ' "$data_dir/metadata.json" >/dev/null; then
      fail "invalid session usage metadata: $data_dir"
    fi
    expected="$run_output_name"
    [[ "$app_name" == "$expected" ]] || fail "wrong app name: $app_name expected $expected"
    app_path="$BENCHMARKS_DIR/$task/$app_name"
    case "$recorded_app_path" in
      "$app_path"|*/"$task"/"$app_name") ;;
      *) fail "wrong recorded app path: $recorded_app_path" ;;
    esac
    [[ -d "$app_path" ]] || fail "missing app directory: $app_path"
    [[ "$(cat "$data_dir/app-path.txt")" == "$recorded_app_path" ]] || fail "app-path.txt mismatch: $data_dir"
    while IFS= read -r transcript_file; do
      "$JQ_BIN" -e . "$transcript_file" >/dev/null 2>&1 || fail "invalid transcript JSONL: $transcript_file"
    done < <(find "$data_dir" -maxdepth 1 -type f -name 'transcript*.jsonl' | sort)
    model_argument="$(printf '%q' "$model")"
    grep -Fq -- "--model $model_argument" "$data_dir/command.sh" || fail "command model mismatch: $data_dir"
    if "$JQ_BIN" -e 'has("completion_evidence_found")' "$data_dir/verification.json" >/dev/null; then
      "$JQ_BIN" -e '.status=="harness-verified" and .transcript_jsonl_valid and .completion_evidence_found and .session_id_captured and .app_build_verified and .app_runtime_verified' "$data_dir/verification.json" >/dev/null || fail "verification incomplete: $data_dir"
    else
      grep -q BENCHMARK_COMPLETE "$data_dir"/transcript*.jsonl "$data_dir"/final*.txt 2>/dev/null || fail "missing legacy completion marker: $data_dir"
      "$JQ_BIN" -e '.status=="harness-verified" and .transcript_jsonl_valid and .completion_marker_found and .session_id_captured and .app_build_verified and .app_runtime_verified' "$data_dir/verification.json" >/dev/null || fail "verification incomplete: $data_dir"
    fi
    prompt_source="$($JQ_BIN -r .prompt_source "$data_dir/metadata.json")"
    prompt_catalog_dir="$($JQ_BIN -r '.prompt_catalog_dir // empty' "$data_dir/metadata.json")"
    prompt_public_url="$($JQ_BIN -r '.prompt_public_url // empty' "$data_dir/metadata.json")"
    if [[ -n "$prompt_catalog_dir" ]]; then
      [[ "$prompt_catalog_dir" == "$ROOT/prompts/"* || "$prompt_catalog_dir" == /*/content/prompts/* ]] || fail "invalid local prompt catalog directory: $data_dir"
      [[ "$prompt_source" =~ ^${prompt_catalog_dir}/v[0-9]+\.md$ ]] || fail "invalid versioned local prompt source: $data_dir"
      prompt_slug="$(basename "$prompt_catalog_dir")"
      prompt_version="$(basename "$prompt_source" .md)"
      local_prompt_source="$ROOT/prompts/$prompt_slug/$prompt_version.md"
      canonical_prompt_source="$prompt_source"
      [[ -f "$canonical_prompt_source" ]] || canonical_prompt_source="$local_prompt_source"
      [[ -f "$canonical_prompt_source" ]] || fail "missing local prompt source: $local_prompt_source"
      [[ "$prompt_public_url" == "https://benchmark.melvynx.dev/prompts/$prompt_slug/$prompt_version" || "$prompt_public_url" == "https://code.melvynx.dev/prompts/$prompt_slug/$prompt_version" ]] || fail "prompt public URL mismatch: $data_dir"
      if ! python3 - "$canonical_prompt_source" "$data_dir/prompt.md" <<'PY'
import sys
from pathlib import Path

source_path, prompt_path = map(Path, sys.argv[1:])
canonical = source_path.read_text(encoding="utf-8")
saved = prompt_path.read_text(encoding="utf-8")
if not saved.startswith(canonical.rstrip("\n") + "\n\n"):
    raise SystemExit(1)
PY
      then
        fail "prompt does not match local canonical source: $data_dir"
      fi
    else
      [[ "$prompt_source" == local-catalog || "$prompt_source" == https://code.melvynx.dev/prompts/* || "$prompt_source" == https://benchmark.melvynx.dev/prompts/* ]] || fail "noncanonical legacy prompt source: $data_dir"
    fi
    if [[ "$package_manager" == pnpm ]]; then
      if ! grep -Fq 'Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.' "$data_dir/prompt.md" \
        && ! grep -Fq 'Use pnpm exclusively for dependency installation and package scripts. Do not use npm.' "$data_dir/prompt.md"; then
        fail "pnpm instruction absent from prompt: $data_dir"
      fi
      if [[ -f "$app_path/package.json" ]]; then
        [[ ! -f "$app_path/package-lock.json" ]] || fail "npm lockfile present: $app_path"
        [[ ! -f "$app_path/npm-shrinkwrap.json" ]] || fail "npm shrinkwrap present: $app_path"
        if rg -n --glob '!node_modules/**' --glob '!package-lock.json' --glob '!npm-shrinkwrap.json' '\bnpm(\s|$)' "$app_path" >/dev/null 2>&1; then
          fail "npm command/reference present in pnpm app: $app_path"
        fi
      fi
    fi
    if [[ "$harness" == ccx || "$harness" == cc || "$harness" == cckimi || "$harness" == cursor-agent ]]; then
      "$JQ_BIN" -e --arg model "$model" 'select(.type=="system" and .subtype=="init" and .model==$model)' "$data_dir/transcript.jsonl" >/dev/null || fail "transcript model mismatch: $data_dir"
    fi
    port="$($JQ_BIN -r '.port // empty' "$data_dir/metadata.json")"
    if [[ -n "$port" ]]; then
      ((port >= 9100 && port <= 9399)) || fail "invalid port $port: $data_dir"
      printf '%s\t%s\n' "$port" "$data_dir" >> "$ports_file"
      if ! grep -Fq "During setup, configure your app and package scripts to use port $port, then use that port for runtime verification." "$data_dir/prompt.md" \
        && ! grep -Fq "Configure your app to use port $port in order to create the benchmark." "$data_dir/prompt.md"; then
        fail "setup port absent from prompt: $data_dir"
      fi
      rg -q "$port" "$app_path/package.json" "$app_path"/vite.config.* 2>/dev/null || fail "assigned port absent from app config: $data_dir"
    fi
  done < <(find "$run_dir/data" -mindepth 1 -maxdepth 1 -type d | sort)
done

duplicates="$(cut -f1 "$ports_file" | sort | uniq -d)"
[[ -z "$duplicates" ]] || fail "duplicate ports: $duplicates"
echo "validation_failures=$failures"
echo "validated_task_count=$task_count"
((failures == 0))
