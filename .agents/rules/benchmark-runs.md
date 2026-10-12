# Benchmark Runs

Use these rules whenever creating, executing, resuming, or reviewing a model benchmark.

## Inputs and routing

- Require a model name, harness (`codex`, `ccx`, `cc`, `cckimi`, `cursor-agent`, or `opencode`), and comma-separated task list.
- Default routing: GPT/OpenAI -> `codex` or `ccx`; Claude -> `cc`; all other models -> `cursor-agent`. Use `opencode` only when the caller explicitly selects it.
- When a GPT model is run through the Claude Code harness family, use `ccx`; reject `cc` for every `gpt*` model.
- With `ccx`, accept only `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`, and pass `--effort` explicitly.
- Pass the model explicitly. Never silently fall back to a different model.
- Run one task per agent session so task transcripts and failures stay independent.
- Run all enabled model/task pairs concurrently. A Markdown row with two tasks produces two independent run directories.
- For reusable matrices, use `benchmark-plans/*.md`; each enabled table row creates one normal run and may select one task, a comma-separated task list, or `all`.
- Never execute rows marked `no`. Preserve the plan file unchanged as the user's reusable configuration.
- Treat this repository's `prompts/<slug>/` directory as the canonical prompt source. Read the numerically highest local `v<number>.md`, including uncommitted versions, then snapshot the exact prompt path, content, and public versioned URL into the run. Do not fetch the website or replace a missing local prompt with generic wording.

## Naming and layout

- Generate one `benchmark_id` per user-triggered benchmark operation. A plan shares that ID across every enabled model/task pair; a direct runner invocation creates a fresh ID unless its caller explicitly passes the shared `--benchmark-id`.
- Store `benchmark_id` in each run's `run.json` and every task's `metadata.json`. Keep `run_id` separate: it identifies one physical `runs/<run-id>` evidence directory, while `benchmark_id` identifies the comparison group.
- Generate run IDs as `<UTC timestamp>-<model slug>-<harness>`; append a numeric suffix on collision.
- Generate each app at `benchmarks/<task>/<YYYY-MM-DD>-<harness>-<model>/`. When the same model/harness/task appears again, allocate `-2`, `-3`, and so on atomically so one benchmark group may contain repeated identical model runs without overwriting evidence.
- Write all evidence below `runs/<run-id>/data/<task>/`.
- Store no app copy under `runs/`. Store `app-path.txt`, `prompt.md`, `command.sh`, `transcript.jsonl`, `stderr.log`, `final.txt`, `session-id.txt`, `view-transcript.sh`, `resume-command.sh`, `metadata.json`, verification logs, `screenshot.png`, render metadata, and `verification.json` there.
- Do not rename individual historical result directories. Keep every task and its results below `benchmarks/<task>/`.

## Ports

- Standalone HTML tasks have no port and must open directly from an HTML file.
- Assign non-standalone GPT apps ports `9100-9199`, Claude apps `9200-9299`, and other apps `9300-9399`.
- Allocate ports atomically and skip ports already locked, listening, or recorded in `runs/`; concurrency must never produce duplicate ports.
- Never allocate outside the harness family's 100-port range. Once every port in that range has been used, reuse a port that is not listening and not recorded by a live run (a run directory without `run.json`), claimed atomically under `.benchmark-port-locks/<port>/<benchmark_id>`.
- Add this sentence to every non-standalone app prompt: `During setup, configure your app and package scripts to use port <port>, then use that port for runtime verification.`
- Add this sentence to every generated task prompt: `Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.`
- Add this sentence to every non-CLI generated task prompt: `Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.`
- Keep model-facing prompts neutral: do not mention benchmarks, evaluations, evidence storage, comparison groups, or completion sentinels.
- Record every assignment in both task metadata and the run-level `ports.json` index.

## Timing

- Measure each task's harness invocation from immediately before harness execution until it returns, including failed invocations.
- Record UTC `started_at`, UTC `completed_at`, and integer `duration_ms` under `model_timing` in the task's `metadata.json`.
- Set `model_timing` to `null` for prepared dry runs; do not invent an elapsed time when no model ran.

## Transcript phases

- Analyze substantive model-authored transcript activity after each run and record it under `transcript_analysis` in task `metadata.json`.
- Categorize activity as `context_gathering`, `planning`, `implementation`, or `verification`; percentages must total exactly 100 for a complete analysis.
- Include a 40-cell stacked `progress_bar`, per-category percentage, activity-character count, segment count, and category bar.
- Exclude JSON transport records, encrypted thinking signatures, and duplicated tool results. Record the method and measurement basis so percentages are not presented as exact wall-clock time.
- Set `transcript_analysis` to `null` for prepared dry runs or to an explicit `unavailable` result when the transcript is missing or invalid.
- Persist terminal token and session accounting under `session_usage` in task `metadata.json`: input, processed input, output, cache read/creation, reasoning, total tokens, cost, API duration, turn count, service tier, raw usage, and per-model usage whenever the harness exposes them. Codex input already includes cached input and must not be double-counted; Claude Code and Cursor processed input includes their separate cache fields.
- Set `session_usage` to `null` for prepared dry runs or to an explicit `unavailable` result when no terminal usage record can be extracted.

## Harness commands

- Codex: `env -u NODE_USE_SYSTEM_CA codex exec --model <model> --json --sandbox workspace-write --skip-git-repo-check --output-last-message <final> <prompt>`; resume with `env -u NODE_USE_SYSTEM_CA codex exec resume <session-id>`. The workspace-write sandbox denies Keychain access, so an inherited `NODE_USE_SYSTEM_CA=1` makes `pnpm` and `node` crash with `SecItemCopyMatching failed -50` (exit 139).
- Claudex: `ccx -p --model <gpt-5.6-sol|gpt-5.6-terra|gpt-5.6-luna> --effort <effort> --permission-mode bypassPermissions --output-format stream-json --verbose --session-id <uuid> <prompt>`; resume with `ccx --resume <session-id>`.
- Claude: `cc -p --model <claude-model> --effort <effort> --permission-mode bypassPermissions --output-format stream-json --verbose --session-id <uuid> <prompt>`; resume with `cc --resume <session-id>`. Never use `cc` for GPT models.
- Kimi through Claude Code: `cckimi -p --model <kimi-model> --effort <effort> --permission-mode bypassPermissions --output-format stream-json --verbose --session-id <uuid> <prompt>`; resume with `cckimi --resume <session-id>`.
- Cursor: create a chat with `cursor-agent create-chat`, then use `cursor-agent --resume <chat-id> --model <model> --print --force --trust --output-format stream-json <prompt>`; resume with `cursor-agent --resume <chat-id>`.
- OpenCode: `opencode run --format json --auto --model <provider/model> <prompt>`; resume with `opencode run --session <session-id> --auto`. Capture `sessionID` and the last `text` event from the JSONL stream.

## Proof

- Preserve stdout in `transcript.jsonl` and stderr in `stderr.log`; do not replace raw evidence with a summary.
- Verify the transcript parses as JSONL and contains the session. Real task runs require a non-empty captured final response; smoke checks require `HARNESS_OK`.
- For standalone HTML, verify an HTML entry file exists and contains document markup.
- For package apps, use pnpm only; install only when necessary, run the declared build, start on the assigned port, and probe it with HTTP. New pnpm-governed runs must not contain npm lockfiles or npm commands.
- Record each check and its exit status in `verification.json`; report failures literally.
