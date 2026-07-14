---
name: run-benchmark
description: Run reproducible coding-model benchmarks from a model name, CLI harness, and task list. Use when creating, executing, resuming, or verifying benchmark runs with Codex, Claudex via ccx, Claude Code, or Cursor Agent in this repository.
---

# Run Benchmark

Create one independently resumable session per task. Put the app in `benchmarks/<task>/<YYYY-MM-DD>-<harness>-<model>/` (with `-2`, `-3`, and so on for repeated identical runs) and final/global evidence in `runs/<run-id>/data/`. Every invocation gets a unique `benchmark_id`; a Markdown plan generates it once and shares it across every enabled model/task run so the comparison UI can recover the exact benchmark group.

## Workflow

1. Read [references/task-catalog.md](references/task-catalog.md) for task names, application types, and seed sources.
2. Read canonical prompts locally from `<benchmark-repository>/prompts/<slug>/` (or `BENCHMARK_PROMPTS_DIR` when explicitly overridden). Select the numerically highest `v<number>.md`, including uncommitted local versions, and fail closed if the version is missing. Save the exact local file path, `https://benchmark.melvynx.dev/prompts/<slug>/<version>`, and prompt in the immutable run snapshot; do not fetch either website.
3. Confirm the requested model exists in the chosen harness when the harness exposes a model catalog. Never substitute a model silently.
4. Run:

   ```bash
   .agents/skills/run-benchmark/scripts/run-benchmark.sh \
     --model '<model-name>' \
     --harness '<codex|ccx|cc|cursor-agent>' \
     --tasks '<task-a,task-b>' \
     --effort '<level>'
   ```

   Or run a reusable Markdown plan:

   ```bash
   .agents/skills/run-benchmark/scripts/run-benchmark-plan.sh \
     benchmark-plans/<plan-name>.md
   ```

5. Inspect the printed run directory and each `verification.json`. A completed process is not proof unless the transcript is valid, a session ID was captured, and a non-empty final response was captured.
6. Run `scripts/verify-benchmark-run.sh <run-dir>...` for task-appropriate build/runtime checks, then `scripts/validate-benchmark-run.sh <run-dir>...` as the deterministic final gate.
7. Resume a task using its generated `resume-command.sh`; append new output to a new transcript file rather than overwriting the original.

## Modes

- Use `--dry-run` to create prompts, commands, metadata, ports, and app directories without calling a model.
- Use `--smoke` to ask each harness for only `HARNESS_OK`; this verifies authentication, model selection, transcript capture, and resumability without running a benchmark task.
- Use `--list-tasks` to print the catalog.
- Use `run-benchmark-plan.sh <plan.md> --dry-run` to validate and prepare every enabled plan row without calling models.

## Markdown plans

- Copy [../../../benchmark-plans/TEMPLATE.md](../../../benchmark-plans/TEMPLATE.md) to create a reusable plan.
- Set `enabled` to `yes` or `no` for each row.
- Set `tasks` to one canonical task, comma-separated tasks, or `all`.
- Add as many rows as needed to compare models and harnesses. Each row remains an independent recorded run.
- The plan runner expands rows by task and launches every model/task pair concurrently. Expect interleaved progress and one run directory per pair.

## Constraints

- Follow [.agents/rules/benchmark-runs.md](../../rules/benchmark-runs.md).
- For `ccx`, select exactly `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`; forward effort through `--effort`.
- When a GPT model uses the Claude Code harness family, route it through `ccx`; never run a GPT model with `cc`.
- Do not combine tasks into one model session.
- Never store an app below `runs/`; `app-path.txt` and `metadata.json` must point to the task-local output directory.
- Do not mark a generated application verified until its build and real serving port have been checked.
- Every generated-task prompt requires `pnpm` exclusively when dependency installation or package scripts are needed; do not introduce npm commands or npm lockfiles.
- Keep model-facing prompts neutral: never disclose that the task is a benchmark or evaluation, never mention run evidence, and never expose a completion sentinel.
- For every non-CLI task, instruct the model to set the browser title and primary visible title to its model name using only identity information already available to it, with no additional title text.
- Every non-standalone prompt must include its allocated port as a setup, package-script, and runtime-verification requirement.
- Record each model invocation in task `metadata.json` as `model_timing.started_at`, `model_timing.completed_at`, and `model_timing.duration_ms`. Use `null` for prepared dry runs.
- Record `benchmark_id` in both `run.json` and every task `metadata.json`. Pass `--benchmark-id` only when several direct runner invocations intentionally belong to the same comparison group; otherwise let the runner generate a fresh ID.
- Analyze each valid transcript with `scripts/analyze-transcript.py`. Store a stacked progress bar and percentages for `context_gathering`, `planning`, `implementation`, and `verification` under `transcript_analysis` in task metadata. Exclude transport noise, encrypted signatures, and duplicated tool results.
- Extract the terminal harness usage record with `scripts/analyze-session-usage.py` and persist normalized input, output, cache, reasoning, total, cost, duration, turn, and raw model-usage details under `session_usage`. Use `null` only for prepared dry runs and an explicit `unavailable` object when usage cannot be recovered.
- Keep the exact raw JSONL. Redact secrets if a harness unexpectedly emits them before sharing or committing artifacts.
- Treat `prompts/<slug>/v<number>.md` as immutable after use. Add changes as a new numeric version and run `pnpm index:prompts` before committing.
