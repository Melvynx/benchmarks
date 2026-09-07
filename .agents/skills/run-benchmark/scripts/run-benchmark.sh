#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
source "$SCRIPT_DIR/benchmark-id.sh"
BENCHMARKS_DIR="$ROOT/benchmarks"
PROMPT_CONTENT_DIR="${BENCHMARK_PROMPTS_DIR:-$ROOT/prompts}"
PROMPT_PUBLIC_ROOT="${BENCHMARK_PROMPT_PUBLIC_ROOT:-https://benchmark.melvynx.dev/prompts}"
TRANSCRIPT_ANALYZER="$ROOT/.agents/skills/run-benchmark/scripts/analyze-transcript.py"
SESSION_USAGE_ANALYZER="$ROOT/.agents/skills/run-benchmark/scripts/analyze-session-usage.py"
MODEL=""
HARNESS=""
TASKS=""
EFFORT="medium"
DRY_RUN=0
SMOKE=0
BENCHMARK_ID=""
STANDALONE=0

usage() {
  echo "Usage: $0 --model MODEL --harness codex|ccx|cc|cckimi|cursor-agent|opencode --tasks TASK[,TASK...] [--effort LEVEL] [--benchmark-id ID] [--dry-run|--smoke]"
}

task_type() {
  case "$1" in
    3d-sponge-bob|air-conditioning-understanding|bouncing-ball|car-crash|distributed-systems-playground|elysian-taste-challenge|little-red-riding-hood-film|living-identity-system|one-button-boss-fight|orbital-rescue-digital-twin|pentest|rocket-launch|the-last-signal) echo standalone-html ;;
    earthquake-explorer|figma-clone|gmail-clone|simulation-life|timezone-checker|youtube-thumbnail) echo web-app ;;
    saveit-now-landing|thumbfast) echo cloned-web-app ;;
    openclaw-benchmark) echo cli ;;
    *) return 1 ;;
  esac
}

task_wording() {
  case "$1" in
    3d-sponge-bob) echo "Build an interactive 3D Bikini Bottom / SpongeBob-inspired scene as a standalone HTML experience." ;;
    air-conditioning-understanding) echo "Build an interactive Three.js explainer for split-system and monoblock reversible air conditioning." ;;
    bouncing-ball) echo "Build a polished physics-based bouncing-ball simulation as a standalone HTML experience." ;;
    car-crash) echo "Build a cinematic interactive car-crash simulation as a standalone HTML experience." ;;
    distributed-systems-playground) echo "Build a deterministic visual distributed-systems playground as a standalone HTML experience." ;;
    earthquake-explorer) echo "Build a live-data earthquake exploration product using the canonical USGS-backed product brief." ;;
    elysian-taste-challenge) echo "Create an unforgettable landing page for the fictional premium brand Elysian." ;;
    figma-clone) echo "Build a polished Figma-inspired collaborative design editor with practical editing interactions." ;;
    gmail-clone) echo "Build the strongest Gmail-inspired email application you can, with polished, functional inbox and message workflows." ;;
    little-red-riding-hood-film) echo "Create a complete illustrated browser film of Little Red Riding Hood with deterministic autoplay and cinematic continuity." ;;
    living-identity-system) echo "Create a living visual identity expressed as a poster, kinetic title sequence, and interactive generative instrument." ;;
    one-button-boss-fight) echo "Create a polished one-screen boss fight controlled by exactly one gameplay action." ;;
    orbital-rescue-digital-twin) echo "Build a cinematic, deterministic autonomous orbital-rescue and docking digital twin as a standalone Three.js experience." ;;
    pentest) echo "Perform the authorized black-box web security assessment described by the canonical prompt and present the verified results in a standalone HTML report." ;;
    rocket-launch) echo "Build a cinematic interactive rocket-launch simulation as a standalone HTML experience." ;;
    saveit-now-landing) echo "Redesign the supplied SaveIt.now landing page using the bundled campaign artwork and product brief." ;;
    simulation-life) echo "Build an interactive artificial-life simulation with observable agents, controls, and emergent behavior." ;;
    thumbfast) echo "Implement the supplied feature request in the seeded Thumbfast repository and integrate it with existing product flows. Read the repository instructions before editing." ;;
    the-last-signal) echo "Create The Last Signal as a short interactive visual story in three acts with two distinct endings." ;;
    timezone-checker) echo "Build a responsive timezone overlap planner for comparing cities, working hours, and shared availability." ;;
    youtube-thumbnail) echo "Build a polished YouTube thumbnail editor with image, text, layout, and export workflows." ;;
    openclaw-benchmark) echo "Run the existing OpenClaw CLI benchmark suite, preserve its result artifacts, and report failures literally." ;;
    *) return 1 ;;
  esac
}

prompt_slug() {
  case "$1" in
    3d-sponge-bob) echo spongebob-3d-world-threejs ;;
    air-conditioning-understanding) echo threejs-air-conditioning-understanding ;;
    bouncing-ball) echo bouncing-ball-polygon ;;
    car-crash) echo car-brick-wall-crash ;;
    distributed-systems-playground) echo distributed-systems-playground ;;
    earthquake-explorer) echo earthquake-explorer ;;
    elysian-taste-challenge) echo elysian-taste-challenge ;;
    figma-clone) echo mini-figma-clone ;;
    gmail-clone) echo gmail-clone ;;
    little-red-riding-hood-film) echo little-red-riding-hood-film ;;
    living-identity-system) echo living-identity-system ;;
    one-button-boss-fight) echo one-button-boss-fight ;;
    orbital-rescue-digital-twin) echo orbital-rescue-digital-twin ;;
    pentest) echo pentest ;;
    rocket-launch) echo rocket-launch-animation ;;
    saveit-now-landing) echo saveit-now-landing ;;
    simulation-life) echo ecosystem-evolution-simulator ;;
    thumbfast) echo thumbfast-drawing-inspiration-editor ;;
    the-last-signal) echo the-last-signal ;;
    timezone-checker) echo timezone-checker ;;
    youtube-thumbnail) echo youtube-thumbnail-generator ;;
    openclaw-benchmark) return 1 ;;
    *) return 1 ;;
  esac
}

latest_canonical_prompt_file() {
  local content_dir="$1"
  local slug="$2"
  python3 - "$content_dir" "$slug" <<'PY'
import re
import sys
from pathlib import Path

content_dir, slug = sys.argv[1:]
prompt_dir = Path(content_dir) / slug
if not prompt_dir.is_dir():
    raise SystemExit(f"Local canonical prompt directory not found: {prompt_dir}")

versions = []
for path in prompt_dir.iterdir():
    match = re.fullmatch(r"v(\d+)\.md", path.name)
    if match:
        versions.append((int(match.group(1)), path))
if not versions:
    raise SystemExit(f"No versioned local prompt found: {prompt_dir}/v<number>.md")

sys.stdout.write(str(max(versions, key=lambda item: item[0])[1].resolve()))
PY
}

utc_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

epoch_milliseconds() {
  python3 - <<'PY'
import time
print(time.time_ns() // 1_000_000)
PY
}

list_tasks() {
  for task in 3d-sponge-bob air-conditioning-understanding bouncing-ball car-crash distributed-systems-playground earthquake-explorer elysian-taste-challenge figma-clone gmail-clone little-red-riding-hood-film living-identity-system one-button-boss-fight orbital-rescue-digital-twin pentest rocket-launch saveit-now-landing simulation-life thumbfast the-last-signal timezone-checker youtube-thumbnail openclaw-benchmark; do
    printf '%-20s %s\n' "$task" "$(task_type "$task")"
  done
}

while (($#)); do
  case "$1" in
    --model) MODEL="${2:?}"; shift 2 ;;
    --harness) HARNESS="${2:?}"; shift 2 ;;
    --tasks) TASKS="${2:?}"; shift 2 ;;
    --effort) EFFORT="${2:?}"; shift 2 ;;
    --benchmark-id) BENCHMARK_ID="${2:?}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --smoke) SMOKE=1; shift ;;
    --list-tasks) list_tasks; exit 0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$BENCHMARK_ID" ]]; then
  BENCHMARK_ID="$(generate_benchmark_id)"
  STANDALONE=1
fi
valid_benchmark_id "$BENCHMARK_ID" || {
  echo "Invalid benchmark ID: $BENCHMARK_ID" >&2
  exit 2
}

[[ -n "$MODEL" && -n "$HARNESS" ]] || { usage >&2; exit 2; }
[[ "$HARNESS" == codex || "$HARNESS" == ccx || "$HARNESS" == cc || "$HARNESS" == cckimi || "$HARNESS" == cursor-agent || "$HARNESS" == opencode ]] || { echo "Unsupported harness: $HARNESS" >&2; exit 2; }
[[ -n "$TASKS" || "$SMOKE" == 1 ]] || { echo "--tasks is required unless --smoke is used" >&2; exit 2; }
model_lower="$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')"
if [[ "$HARNESS" == cc && "$model_lower" == gpt* ]]; then
  echo "GPT models using the Claude Code harness must use --harness ccx, never cc." >&2
  exit 2
fi
if [[ "$HARNESS" == ccx ]]; then
  [[ "$MODEL" == gpt-5.6-sol || "$MODEL" == gpt-5.6-terra || "$MODEL" == gpt-5.6-luna ]] || { echo "ccx model must be gpt-5.6-sol, gpt-5.6-terra, or gpt-5.6-luna" >&2; exit 2; }
  zsh -lic 'command -v ccx >/dev/null' || { echo "ccx alias is not available in the zsh login environment" >&2; exit 127; }
elif [[ "$HARNESS" == cc ]]; then
  zsh -lic 'command -v claude >/dev/null' || { echo "Claude Code is not installed (expected cc alias backed by claude)" >&2; exit 127; }
elif [[ "$HARNESS" == cckimi ]]; then
  zsh -lic 'alias cckimi >/dev/null 2>&1' || { echo "cckimi alias is not available in the zsh login environment" >&2; exit 127; }
elif [[ "$HARNESS" == opencode ]]; then
  command -v opencode >/dev/null || [[ -x "$HOME/.opencode/bin/opencode" ]] || { echo "Harness not installed: opencode" >&2; exit 127; }
else
  command -v "$HARNESS" >/dev/null || { echo "Harness not installed: $HARNESS" >&2; exit 127; }
fi
JQ_BIN="$(type -P jq || true)"
[[ -n "$JQ_BIN" ]] || { echo "jq is required" >&2; exit 127; }

# A plan runner already marked the group before fanning out; only a direct
# invocation announces itself to the live dashboard.
if [[ "$STANDALONE" == 1 && "$DRY_RUN" == 0 && "$SMOKE" == 0 ]]; then
  "$ROOT/scripts/start-benchmark-live.sh" "$BENCHMARK_ID" || true
fi

slug="$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')"
app_date="$(date -u +%Y-%m-%d)"
base_app_name="${app_date}-${HARNESS}-${slug}"
app_name="$base_app_name"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
run_id="${stamp}-${slug}-${HARNESS}"
mkdir -p "$ROOT/runs"
mkdir -p "$BENCHMARKS_DIR"
run_base="$ROOT/runs/$run_id"
run_dir="$run_base"
suffix=2
while ! mkdir "$run_dir" 2>/dev/null; do
  run_dir="${run_base}-${suffix}"
  suffix=$((suffix + 1))
done
mkdir -p "$run_dir/data"
mkdir -p "$ROOT/.benchmark-port-locks"
mkdir -p "$ROOT/.benchmark-output-locks"

case "$HARNESS" in
  codex|ccx) port_base=9100 ;;
  cc) port_base=9200 ;;
  cckimi|cursor-agent|opencode) port_base=9300 ;;
esac

if [[ "$SMOKE" == 1 ]]; then TASKS="harness-smoke"; fi
IFS=',' read -r -a task_list <<< "$TASKS"
printf '[]\n' > "$run_dir/ports.json"
web_index=0

if [[ "$SMOKE" == 0 ]]; then
  for task in "${task_list[@]}"; do
    task="$(printf '%s' "$task" | xargs)"
    task_type "$task" >/dev/null || { echo "Unknown task: $task" >&2; exit 2; }
  done

  output_suffix=1
  while true; do
    if ((output_suffix == 1)); then
      candidate_app_name="$base_app_name"
    else
      candidate_app_name="${base_app_name}-${output_suffix}"
    fi
    candidate_available=true
    claimed_locks=()

    for task in "${task_list[@]}"; do
      task="$(printf '%s' "$task" | xargs)"
      target="$BENCHMARKS_DIR/$task/$candidate_app_name"
      if [[ -e "$target" ]]; then
        candidate_available=false
        break
      fi
      if [[ "$DRY_RUN" == 0 ]]; then
        output_lock="$ROOT/.benchmark-output-locks/${task}--${candidate_app_name}"
        if mkdir "$output_lock" 2>/dev/null; then
          claimed_locks+=("$output_lock")
        else
          candidate_available=false
          break
        fi
      fi
    done

    if [[ "$candidate_available" == true ]]; then
      app_name="$candidate_app_name"
      break
    fi
    for output_lock in "${claimed_locks[@]-}"; do
      [[ -n "$output_lock" ]] && /usr/bin/trash "$output_lock"
    done
    output_suffix=$((output_suffix + 1))
  done
fi

for index in "${!task_list[@]}"; do
  task="${task_list[$index]}"
  task="$(printf '%s' "$task" | xargs)"
  if [[ "$SMOKE" == 1 ]]; then
    type=smoke
    wording="Reply with exactly HARNESS_OK and nothing else."
    prompt_catalog_dir=""
    prompt_source="smoke"
    prompt_public_url="smoke"
  else
    type="$(task_type "$task")" || { echo "Unknown task: $task" >&2; exit 2; }
    if slug_value="$(prompt_slug "$task")"; then
      prompt_catalog_dir="$PROMPT_CONTENT_DIR/$slug_value"
      prompt_source="$(latest_canonical_prompt_file "$PROMPT_CONTENT_DIR" "$slug_value")" || {
        echo "Failed to load latest local canonical prompt: $prompt_catalog_dir" >&2
        exit 1
      }
      prompt_version="$(basename "$prompt_source" .md)"
      prompt_public_url="$PROMPT_PUBLIC_ROOT/$slug_value/$prompt_version"
      wording="$(cat "$prompt_source")"
    else
      prompt_catalog_dir=""
      prompt_source="local-catalog"
      prompt_public_url="local-catalog"
      wording="$(task_wording "$task")"
    fi
  fi

  data_dir="$run_dir/data/$task"
  if [[ "$SMOKE" == 1 ]]; then
    app_dir="$(mktemp -d "${TMPDIR:-/tmp}/run-benchmark-smoke.XXXXXX")"
  else
    app_dir="$BENCHMARKS_DIR/$task/$app_name"
  fi
  mkdir -p "$data_dir"
  [[ "$DRY_RUN" == 1 ]] || mkdir -p "$app_dir"
  printf '%s\n' "$app_dir" > "$data_dir/app-path.txt"
  if [[ "$DRY_RUN" == 0 && "$task" == thumbfast ]]; then cp -R "$BENCHMARKS_DIR/thumbfast/base-repo/." "$app_dir/"; fi
  if [[ "$DRY_RUN" == 0 && "$task" == saveit-now-landing ]]; then cp -R "$BENCHMARKS_DIR/saveit-now-landing/base-repo/." "$app_dir/"; fi
  if [[ "$DRY_RUN" == 0 && "$task" == openclaw-benchmark ]]; then
    for seed_item in package.json tsconfig.json src benchmarks; do
      cp -R "$BENCHMARKS_DIR/openclaw-benchmark/$seed_item" "$app_dir/"
    done
  fi

  port_json=null
  port_line=""
  if [[ "$type" == web-app || "$type" == cloned-web-app ]]; then
    port=$((port_base + web_index))
    while true; do
      if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || rg -l "\"port\"[[:space:]]*:[[:space:]]*$port" "$ROOT/runs" -g 'ports.json' | grep -q .; then
        port=$((port + 1)); continue
      fi
      if mkdir "$ROOT/.benchmark-port-locks/$port" 2>/dev/null; then break; fi
      port=$((port + 1))
    done
    if ((port > port_base + 99)); then echo "Port range exhausted" >&2; exit 2; fi
    web_index=$((port - port_base + 1))
    port_json="$port"
    port_line="During setup, configure your app and package scripts to use port $port, then use that port for runtime verification."
    "$JQ_BIN" --arg task "$task" --argjson port "$port" '. + [{task:$task,port:$port}]' "$run_dir/ports.json" > "$run_dir/ports.tmp"
    mv "$run_dir/ports.tmp" "$run_dir/ports.json"
  fi

  if [[ "$SMOKE" == 1 ]]; then
    prompt="$wording"
  else
    title_line=""
    if [[ "$type" != cli ]]; then
      title_line="Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title."
    fi
    if [[ "$task" == pentest ]]; then
      workspace_line="Keep the standalone HTML deliverable in the current working directory. The web-pentest skill is authorized to create and update only its required engagement directory outside the current working directory; do not edit other external files."
      checks_line="Run the relevant checks yourself."
    else
      workspace_line="Work only inside the current working directory. Do not edit files outside the current working directory."
      checks_line="Run the relevant checks yourself. Do not edit files outside the current working directory."
    fi
    prompt="$wording

$workspace_line
$port_line
Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
$title_line
$checks_line"
  fi
  printf '%s\n' "$prompt" > "$data_dir/prompt.md"

  transcript="$data_dir/transcript.jsonl"
  stderr_log="$data_dir/stderr.log"
  final="$data_dir/final.txt"
  session_file="$data_dir/session-id.txt"
  command_file="$data_dir/command.sh"
  view_file="$data_dir/view-transcript.sh"
  resume_file="$data_dir/resume-command.sh"
  exit_code=0
  model_timing_json=null
  if [[ "$DRY_RUN" == 0 ]]; then
    model_started_at="$(utc_now)"
    model_started_ms="$(epoch_milliseconds)"
  fi

  case "$HARNESS" in
    codex)
      printf '%q ' codex exec --model "$MODEL" -c "model_reasoning_effort=\"$EFFORT\"" --json --sandbox workspace-write --skip-git-repo-check --output-last-message "$final" "$prompt" > "$command_file"
      printf '\n' >> "$command_file"
      if [[ "$DRY_RUN" == 0 ]]; then (cd "$app_dir" && bash "$command_file") > "$transcript" 2> "$stderr_log" || exit_code=$?; fi
      if [[ -s "$transcript" ]]; then "$JQ_BIN" -r 'select(.type == "thread.started") | .thread_id' "$transcript" | head -1 > "$session_file" || true; fi
      [[ -e "$session_file" ]] || printf '%s\n' '<captured-at-runtime>' > "$session_file"
      ;;
    ccx)
      session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
      printf '%s\n' "$session_id" > "$session_file"
      printf '%s\n' '#!/usr/bin/env zsh' 'source "$HOME/.zshrc" >/dev/null 2>&1' > "$command_file"
      printf '%q ' ccx -p --model "$MODEL" --effort "$EFFORT" --permission-mode bypassPermissions --output-format stream-json --verbose --session-id "$session_id" "$prompt" >> "$command_file"
      printf '\n' >> "$command_file"
      if [[ "$DRY_RUN" == 0 ]]; then (cd "$app_dir" && zsh "$command_file") > "$transcript" 2> "$stderr_log" || exit_code=$?; fi
      if [[ -s "$transcript" ]]; then "$JQ_BIN" -r 'select(.type == "result") | .result // empty' "$transcript" | tail -1 > "$final" || true; fi
      ;;
    cc)
      session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
      printf '%s\n' "$session_id" > "$session_file"
      printf '%s\n' '#!/usr/bin/env zsh' 'source "$HOME/.zshrc" >/dev/null 2>&1' 'unalias cc 2>/dev/null || true' 'cc() { claude --dangerously-skip-permissions "$@"; }' > "$command_file"
      printf '%q ' cc -p --model "$MODEL" --effort "$EFFORT" --permission-mode bypassPermissions --output-format stream-json --verbose --session-id "$session_id" "$prompt" >> "$command_file"
      printf '\n' >> "$command_file"
      if [[ "$DRY_RUN" == 0 ]]; then (cd "$app_dir" && zsh "$command_file") > "$transcript" 2> "$stderr_log" || exit_code=$?; fi
      if [[ -s "$transcript" ]]; then "$JQ_BIN" -r 'select(.type == "result") | .result // empty' "$transcript" | tail -1 > "$final" || true; fi
      ;;
    cckimi)
      session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
      printf '%s\n' "$session_id" > "$session_file"
      printf '%s\n' '#!/usr/bin/env zsh' 'source "$HOME/.zshrc" >/dev/null 2>&1' > "$command_file"
      printf '%q ' cckimi -p --model "$MODEL" --effort "$EFFORT" --permission-mode bypassPermissions --output-format stream-json --verbose --session-id "$session_id" "$prompt" >> "$command_file"
      printf '\n' >> "$command_file"
      if [[ "$DRY_RUN" == 0 ]]; then (cd "$app_dir" && zsh "$command_file") > "$transcript" 2> "$stderr_log" || exit_code=$?; fi
      if [[ -s "$transcript" ]]; then "$JQ_BIN" -r 'select(.type == "result") | .result // empty' "$transcript" | tail -1 > "$final" || true; fi
      ;;
    cursor-agent)
      if [[ "$DRY_RUN" == 0 ]]; then cursor-agent create-chat > "$session_file"; else printf '%s\n' '<created-at-runtime>' > "$session_file"; fi
      session_id="$(tr -d '[:space:]' < "$session_file")"
      printf '%q ' cursor-agent --resume "$session_id" --model "$MODEL" --print --force --trust --output-format stream-json "$prompt" > "$command_file"
      printf '\n' >> "$command_file"
      if [[ "$DRY_RUN" == 0 ]]; then (cd "$app_dir" && bash "$command_file") > "$transcript" 2> "$stderr_log" || exit_code=$?; fi
      if [[ -s "$transcript" ]]; then "$JQ_BIN" -r 'select(.type == "result") | .result // .text // empty' "$transcript" | tail -1 > "$final" || true; fi
      ;;
    opencode)
      opencode_bin="$(command -v opencode || true)"
      [[ -n "$opencode_bin" ]] || opencode_bin="$HOME/.opencode/bin/opencode"
      printf '%q ' "$opencode_bin" run --format json --auto --model "$MODEL" "$prompt" > "$command_file"
      printf '\n' >> "$command_file"
      if [[ "$DRY_RUN" == 1 ]]; then
        printf '%s\n' '<captured-at-runtime>' > "$session_file"
      else
        (cd "$app_dir" && bash "$command_file") > "$transcript" 2> "$stderr_log" || exit_code=$?
        if [[ -s "$transcript" ]]; then
          "$JQ_BIN" -r 'select(.sessionID != null) | .sessionID' "$transcript" | head -1 > "$session_file" || true
          "$JQ_BIN" -r 'select(.type == "text") | .part.text // empty' "$transcript" | awk 'NF { line = $0 } END { if (line) print line }' > "$final" || true
        fi
        [[ -s "$session_file" ]] || : > "$session_file"
      fi
      ;;
  esac

  if [[ "$DRY_RUN" == 0 ]]; then
    model_completed_ms="$(epoch_milliseconds)"
    model_completed_at="$(utc_now)"
    model_duration_ms=$((model_completed_ms - model_started_ms))
    model_timing_json="$($JQ_BIN -n \
      --arg started_at "$model_started_at" \
      --arg completed_at "$model_completed_at" \
      --argjson duration_ms "$model_duration_ms" \
      '{started_at:$started_at,completed_at:$completed_at,duration_ms:$duration_ms}')"
  fi

  session_id="$(tr -d '[:space:]' < "$session_file" 2>/dev/null || true)"
  case "$HARNESS" in
    codex) printf '%q ' codex exec resume "$session_id" > "$resume_file" ;;
    ccx) printf '%s\n' '#!/usr/bin/env zsh' 'source "$HOME/.zshrc" >/dev/null 2>&1' > "$resume_file"; printf '%q ' ccx --resume "$session_id" >> "$resume_file" ;;
    cc) printf '%q ' cc --resume "$session_id" > "$resume_file" ;;
    cckimi) printf '%s\n' '#!/usr/bin/env zsh' 'source "$HOME/.zshrc" >/dev/null 2>&1' > "$resume_file"; printf '%q ' cckimi --resume "$session_id" >> "$resume_file" ;;
    cursor-agent) printf '%q ' cursor-agent --resume "$session_id" > "$resume_file" ;;
    opencode)
      opencode_bin="$(command -v opencode || true)"
      [[ -n "$opencode_bin" ]] || opencode_bin="$HOME/.opencode/bin/opencode"
      printf '%q ' "$opencode_bin" run --session "$session_id" --auto > "$resume_file"
      ;;
  esac
  printf '\n' >> "$resume_file"
  printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail' 'dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"' 'jq . "$dir/transcript.jsonl"' > "$view_file"
  chmod +x "$command_file" "$view_file" "$resume_file"

  transcript_valid=false; completion_evidence_found=false; session_captured=false
  if [[ "$DRY_RUN" == 1 ]]; then
    status=prepared
  else
    status=failed
    [[ -n "$session_id" ]] && session_captured=true
    [[ -s "$transcript" ]] && "$JQ_BIN" -e . "$transcript" >/dev/null 2>&1 && transcript_valid=true
    if [[ "$SMOKE" == 1 ]]; then
      if grep -q HARNESS_OK "$transcript" "$final" 2>/dev/null; then completion_evidence_found=true; fi
    elif [[ -s "$final" ]]; then
      completion_evidence_found=true
    fi
    if [[ "$exit_code" == 0 && "$transcript_valid" == true && "$completion_evidence_found" == true && "$session_captured" == true ]]; then status=harness-verified; fi
  fi

  transcript_analysis_json=null
  session_usage_json=null
  if [[ "$DRY_RUN" == 0 ]]; then
    if [[ "$transcript_valid" == true ]]; then
      transcript_analysis_json="$(python3 "$TRANSCRIPT_ANALYZER" "$transcript" --compact)" || {
        transcript_analysis_json='{"status":"unavailable","reason":"transcript analyzer failed"}'
      }
      session_usage_json="$(python3 "$SESSION_USAGE_ANALYZER" "$transcript" --compact)" || {
        session_usage_json='{"status":"unavailable","schema_version":1,"reason":"session usage analyzer failed"}'
      }
    else
      transcript_analysis_json='{"status":"unavailable","reason":"transcript is missing or invalid JSONL"}'
      session_usage_json='{"status":"unavailable","schema_version":1,"reason":"transcript is missing or invalid JSONL"}'
    fi
  fi

  "$JQ_BIN" -n --arg benchmark_id "$BENCHMARK_ID" --arg run_id "$(basename "$run_dir")" --arg task "$task" --arg model "$MODEL" --arg harness "$HARNESS" --arg effort "$EFFORT" --arg type "$type" --arg app_name "$app_name" --arg app_path "$app_dir" --arg status "$status" --arg prompt_catalog_dir "$prompt_catalog_dir" --arg prompt_source "$prompt_source" --arg prompt_public_url "$prompt_public_url" --arg package_manager pnpm --argjson port "$port_json" --argjson model_timing "$model_timing_json" --argjson transcript_analysis "$transcript_analysis_json" --argjson session_usage "$session_usage_json" '{benchmark_id:$benchmark_id,run_id:$run_id,task:$task,model:$model,harness:$harness,effort:$effort,type:$type,app_name:$app_name,app_path:$app_path,port:$port,prompt_catalog_dir:$prompt_catalog_dir,prompt_source:$prompt_source,prompt_public_url:$prompt_public_url,package_manager:$package_manager,model_timing:$model_timing,transcript_analysis:$transcript_analysis,session_usage:$session_usage,status:$status}' > "$data_dir/metadata.json"
  "$JQ_BIN" -n --arg status "$status" --argjson exit_code "$exit_code" --argjson transcript_valid "$transcript_valid" --argjson completion_evidence_found "$completion_evidence_found" --argjson session_captured "$session_captured" '{status:$status,harness_exit_code:$exit_code,transcript_jsonl_valid:$transcript_valid,completion_evidence_found:$completion_evidence_found,session_id_captured:$session_captured,app_build_verified:false,app_runtime_verified:false}' > "$data_dir/verification.json"
done

"$JQ_BIN" -n --arg benchmark_id "$BENCHMARK_ID" --arg run_id "$(basename "$run_dir")" --arg model "$MODEL" --arg harness "$HARNESS" --arg effort "$EFFORT" --arg output_name "$app_name" --arg created_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg tasks "$TASKS" '{benchmark_id:$benchmark_id,run_id:$run_id,model:$model,harness:$harness,effort:$effort,output_name:$output_name,tasks:($tasks|split(",")),created_at:$created_at}' > "$run_dir/run.json"
echo "Benchmark ID: $BENCHMARK_ID"
echo "$run_dir"
