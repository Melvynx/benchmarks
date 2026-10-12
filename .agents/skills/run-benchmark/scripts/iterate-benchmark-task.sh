#!/usr/bin/env bash
# Resume a finished task session with a follow-up prompt and record it as a
# numbered iteration next to the original evidence.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_USAGE_ANALYZER="$SCRIPT_DIR/analyze-session-usage.py"
TRANSCRIPT_ANALYZER="$SCRIPT_DIR/analyze-transcript.py"
JQ_BIN="$(type -P jq)"

[[ $# -eq 2 || ( $# -eq 3 && "$3" == --fresh-session ) ]] || { echo "Usage: $0 <runs/<run-id>/data/<task>> <prompt-file> [--fresh-session]" >&2; exit 2; }
fresh_session=false
[[ "${3:-}" != --fresh-session ]] || fresh_session=true
data_dir="$(cd "$1" && pwd)"
prompt="$(cat "$2")"
[[ -n "$prompt" ]] || { echo "Empty prompt: $2" >&2; exit 2; }

metadata="$data_dir/metadata.json"
harness="$($JQ_BIN -r .harness "$metadata")"
[[ "$fresh_session" == false || "$harness" == codex ]] || { echo "Fresh sessions currently require the Codex harness" >&2; exit 2; }
model="$($JQ_BIN -r .model "$metadata")"
effort="$($JQ_BIN -r .effort "$metadata")"
app_dir="$($JQ_BIN -r .app_path "$metadata")"
session_id="$(tr -d '[:space:]' < "$data_dir/session-id.txt")"
source_dir="$data_dir"
if [[ "$fresh_session" == false && -d "$data_dir/iterations" ]]; then
  latest=0
  for candidate in "$data_dir"/iterations/*; do
    number="${candidate##*/}"
    [[ "$number" =~ ^[0-9]+$ && -f "$candidate/metadata.json" ]] || continue
    (( number <= latest )) || latest="$number"
  done
  if (( latest > 0 )); then
    source_dir="$data_dir/iterations/$latest"
    app_dir="$($JQ_BIN -r --arg fallback "$app_dir" '.app_path // $fallback' "$source_dir/metadata.json")"
    session_id="$($JQ_BIN -r --arg fallback "$session_id" '.session_id // $fallback' "$source_dir/metadata.json")"
  fi
fi
[[ -n "$session_id" ]] || { echo "No session id in $data_dir" >&2; exit 1; }

iteration=1
while [[ -e "$data_dir/iterations/$iteration" ]]; do iteration=$((iteration + 1)); done
iter_dir="$data_dir/iterations/$iteration"
mkdir -p "$iter_dir"
printf '%s\n' "$prompt" > "$iter_dir/prompt.md"

# Resume inside the original isolated directory so the harness never walks up
# into this repository and picks up its instructions or sibling outputs.
work_dir="$app_dir"
if [[ "$fresh_session" == true ]]; then
  app_base="$(printf '%s' "$app_dir" | sed -E 's/-[0-9]+$//')"
  suffix=2
  while ! mkdir "${app_base}-${suffix}" 2>/dev/null; do suffix=$((suffix + 1)); done
  app_dir="${app_base}-${suffix}"
  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/workspace.XXXXXX")/app"
  mkdir -p "$work_dir"
  printf '%s\n' "$work_dir" > "$iter_dir/isolated-workdir.txt"
elif [[ -f "$source_dir/isolated-workdir.txt" ]]; then
  work_dir="$(cat "$source_dir/isolated-workdir.txt")"
  [[ -L "$work_dir" ]] && unlink "$work_dir"
  mkdir -p "$work_dir"
  # Copy rather than move so the published app stays viewable during the pass.
  cp -Rp "$app_dir/." "$work_dir/"
fi
printf '%s\n' "$work_dir" > "$iter_dir/isolated-workdir.txt"
restore_app() {
  if [[ "$work_dir" != "$app_dir" && -d "$work_dir" && ! -L "$work_dir" ]]; then
    rsync -a --delete "$work_dir/" "$app_dir/"
    /usr/bin/trash "$work_dir" && ln -s "$app_dir" "$work_dir"
  fi
}
trap restore_app EXIT

transcript="$iter_dir/transcript.jsonl"
final="$iter_dir/final.txt"
command_file="$iter_dir/command.sh"
case "$harness" in
  codex)
    if [[ "$fresh_session" == true ]]; then
      printf '%q ' env -u NODE_USE_SYSTEM_CA codex exec --model "$model" -c "model_reasoning_effort=\"$effort\"" --sandbox workspace-write --json --skip-git-repo-check --output-last-message "$final" "$prompt" > "$command_file"
    else
      printf '%q ' env -u NODE_USE_SYSTEM_CA codex exec resume --model "$model" -c "model_reasoning_effort=\"$effort\"" -c 'sandbox_mode="workspace-write"' --json --skip-git-repo-check --output-last-message "$final" "$session_id" "$prompt" > "$command_file"
    fi
    ;;
  cursor-agent)
    printf '%q ' cursor-agent --resume "$session_id" --model "$model" --print --force --trust --output-format stream-json "$prompt" > "$command_file"
    ;;
  ccx|cc|cckimi)
    printf '%s\n' '#!/usr/bin/env zsh' 'source "$HOME/.zshrc" >/dev/null 2>&1' > "$command_file"
    printf '%q ' "$harness" -p --resume "$session_id" --model "$model" --effort "$effort" --permission-mode bypassPermissions --output-format stream-json --verbose "$prompt" >> "$command_file"
    ;;
  *) echo "Unsupported harness for iteration: $harness" >&2; exit 2 ;;
esac
printf '\n' >> "$command_file"
chmod +x "$command_file"

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
started_ms="$(python3 -c 'import time; print(int(time.time() * 1000))')"
"$JQ_BIN" -n --arg status running --arg app_path "$app_dir" --arg started_at "$started_at" --argjson fresh_session "$fresh_session" \
  '{status:$status,app_path:$app_path,fresh_session:$fresh_session,model_timing:{started_at:$started_at,completed_at:null,duration_ms:null}}' > "$iter_dir/metadata.json"
exit_code=0
if [[ "$harness" == codex || "$harness" == cursor-agent ]]; then
  (cd "$work_dir" && bash "$command_file") > "$transcript" 2> "$iter_dir/stderr.log" || exit_code=$?
else
  (cd "$work_dir" && zsh "$command_file") > "$transcript" 2> "$iter_dir/stderr.log" || exit_code=$?
fi
completed_ms="$(python3 -c 'import time; print(int(time.time() * 1000))')"
completed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "$fresh_session" == true && -s "$transcript" ]]; then
  session_id="$($JQ_BIN -r 'select(.type == "thread.started") | .thread_id' "$transcript" | head -1)"
  printf '%s\n' "$session_id" > "$iter_dir/session-id.txt"
fi

if [[ "$harness" != codex && -s "$transcript" ]]; then
  "$JQ_BIN" -sr '[.[] | select(.type == "result")] | last | .result // .text // empty' "$transcript" > "$final" || true
fi
restore_app
trap - EXIT

transcript_valid=false
[[ -s "$transcript" ]] && "$JQ_BIN" -e . "$transcript" >/dev/null 2>&1 && transcript_valid=true
usage='{"status":"unavailable","reason":"transcript is missing or invalid JSONL"}'
analysis="$usage"
if [[ "$transcript_valid" == true ]]; then
  usage="$(python3 "$SESSION_USAGE_ANALYZER" "$transcript" --compact)" || usage='{"status":"unavailable","reason":"session usage analyzer failed"}'
  analysis="$(python3 "$TRANSCRIPT_ANALYZER" "$transcript" --compact)" || analysis='{"status":"unavailable","reason":"transcript analyzer failed"}'
fi
status=failed
[[ "$exit_code" == 0 && "$transcript_valid" == true && -s "$final" ]] && status=harness-verified

"$JQ_BIN" -n --argjson iteration "$iteration" --arg session_id "$session_id" --arg status "$status" \
  --arg app_path "$app_dir" --argjson fresh_session "$fresh_session" \
  --argjson exit_code "$exit_code" --arg started_at "$started_at" --arg completed_at "$completed_at" \
  --argjson duration_ms "$((completed_ms - started_ms))" --argjson session_usage "$usage" \
  --argjson transcript_analysis "$analysis" \
  '{iteration:$iteration,session_id:$session_id,status:$status,harness_exit_code:$exit_code,app_path:$app_path,fresh_session:$fresh_session,
    model_timing:{started_at:$started_at,completed_at:$completed_at,duration_ms:$duration_ms},
    session_usage:$session_usage,transcript_analysis:$transcript_analysis}' > "$iter_dir/metadata.json"
echo "$iter_dir $status"
