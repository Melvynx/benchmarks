#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
source "$SCRIPT_DIR/benchmark-id.sh"
PLAN="${1:-}"
DRY_RUN="${2:-}"

if [[ -z "$PLAN" || "$PLAN" == -h || "$PLAN" == --help ]]; then
  echo "Usage: $0 <benchmark-plan.md> [--dry-run]"
  exit 0
fi
[[ -f "$PLAN" ]] || { echo "Benchmark plan not found: $PLAN" >&2; exit 2; }
[[ "$PLAN" == *.md ]] || { echo "Benchmark plan must be a Markdown file" >&2; exit 2; }
[[ -z "$DRY_RUN" || "$DRY_RUN" == --dry-run ]] || { echo "Unknown option: $DRY_RUN" >&2; exit 2; }

all_tasks="video-generation,3d-sponge-bob,3d-car-crash,air-conditioning-understanding,bouncing-ball,car-crash,cowdie,distributed-systems-playground,earthquake-explorer,elysian-taste-challenge,figma-clone,gmail-clone,lava-lamp-3d,little-red-riding-hood-film,living-identity-system,one-button-boss-fight,orbital-rescue-digital-twin,pentest,rocket-launch,saveit-now-landing,simulation-life,thumbfast,tesla-roadster,the-last-signal,timezone-checker,youtube-thumbnail,openclaw-benchmark"
rows=0
enabled_rows=0
pids=()
labels=()
benchmark_id="$(generate_benchmark_id)"
echo "Benchmark ID: $benchmark_id"
[[ "$DRY_RUN" == --dry-run ]] || "$ROOT/scripts/start-benchmark-live.sh" "$benchmark_id" || true

while IFS=$'\t' read -r enabled model harness effort tasks; do
  rows=$((rows + 1))
  normalized_enabled="$(printf '%s' "$enabled" | tr '[:upper:]' '[:lower:]')"
  case "$normalized_enabled" in
    yes|true|x) ;;
    no|false|'') continue ;;
    *) echo "Invalid enabled value '$enabled' on plan data row $rows" >&2; exit 2 ;;
  esac
  enabled_rows=$((enabled_rows + 1))
  [[ -n "$model" && -n "$harness" && -n "$effort" && -n "$tasks" ]] || { echo "Missing value on enabled plan data row $rows" >&2; exit 2; }
  [[ "$tasks" != all ]] || tasks="$all_tasks"

  IFS=',' read -r -a task_list <<< "$tasks"
  for task in "${task_list[@]}"; do
    task="$(printf '%s' "$task" | xargs)"
    args=(--model "$model" --harness "$harness" --effort "$effort" --tasks "$task" --benchmark-id "$benchmark_id")
    [[ "$DRY_RUN" != --dry-run ]] || args+=(--dry-run)
    "$SCRIPT_DIR/run-benchmark.sh" "${args[@]}" < /dev/null &
    pids+=("$!")
    labels+=("$model/$harness/$task")
  done
done < <(
  awk -F'|' '
    function trim(value) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", value); return value }
    /^\|/ {
      enabled=trim($2); model=trim($3); harness=trim($4); effort=trim($5); tasks=trim($6)
      if (tolower(enabled) == "enabled" || enabled ~ /^-+$/) next
      if (NF >= 7) printf "%s\t%s\t%s\t%s\t%s\n", enabled, model, harness, effort, tasks
    }
  ' "$PLAN"
)

((rows > 0)) || { echo "No benchmark rows found in $PLAN" >&2; exit 2; }
((enabled_rows > 0)) || { echo "No enabled benchmark rows found in $PLAN" >&2; exit 2; }

failures=0
for index in "${!pids[@]}"; do
  if ! wait "${pids[$index]}"; then
    echo "Benchmark failed: ${labels[$index]}" >&2
    failures=$((failures + 1))
  fi
done
((failures == 0))
