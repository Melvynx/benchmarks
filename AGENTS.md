# Model Benchmarks

This repository compares coding models on reproducible visual, application, and CLI tasks. Historical result directories are evidence: do not rewrite or rename them.

## Commands

- `.agents/skills/run-benchmark/scripts/run-benchmark.sh --model <model> --harness <codex|ccx|cc|cursor-agent> --tasks <task[,task...]>` - create and execute a recorded benchmark run
- `.agents/skills/run-benchmark/scripts/run-benchmark-plan.sh benchmark-plans/<plan>.md` - execute every enabled row in an editable Markdown benchmark plan
- `.agents/skills/run-benchmark/scripts/verify-benchmark-run.sh runs/<run-id>...` - build and HTTP-probe completed apps
- `.agents/skills/run-benchmark/scripts/validate-benchmark-run.sh runs/<run-id>...` - enforce layout, naming, prompt, model, port, transcript, screenshot, and runtime evidence
- `.agents/skills/run-benchmark/scripts/run-benchmark.sh --list-tasks` - list canonical task names and types
- `python3 /Users/melvynx/.agents/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/run-benchmark` - validate the benchmark skill
- `cd benchmark-compare && pnpm start` - open the local 2-4 panel HTML comparison workbench at `http://127.0.0.1:9080`

## Rules

Read the relevant file before running or adding a benchmark:

- **Benchmark runs** - [.agents/rules/benchmark-runs.md](.agents/rules/benchmark-runs.md) - harness routing, output layout, ports, naming, and proof requirements
- **Benchmark catalog** - [.agents/skills/run-benchmark/references/task-catalog.md](.agents/skills/run-benchmark/references/task-catalog.md) - canonical task names, types, source templates, and prompts

## Universal Rules

- Use `codex` or `ccx` for GPT/OpenAI models, `cc` for Claude models, and `cursor-agent` for other models unless the caller explicitly selects another installed harness. When a GPT model runs through the Claude Code harness family, always use `ccx` and never `cc`. `ccx` supports `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` with explicit effort.
- Generated apps live under `<task>/<YYYY-MM-DD>-<harness>-<model>/`; repeated identical model runs use atomic `-2`, `-3`, and later suffixes. `runs/<run-id>/data/` retains only global/final evidence: prompt, source, app path, raw transcript, stderr, session ID, commands, ports, final output, metadata, logs, and verification.
- When the user asks to run a named Markdown benchmark plan, execute only rows whose `enabled` cell is `yes`; treat `tasks: all` as every task in the canonical catalog.
- Expand every enabled plan row into one run per task and launch all model/task runs concurrently. Allocate ports atomically so parallel apps never share a port.
- Read canonical task wording from this repository's `prompts/<slug>/` catalog before each supported run. Select the numerically highest local `v<number>.md`, including uncommitted versions, snapshot its exact text and path in the run, and fail instead of fetching the website or silently using generic wording.
- Never claim a model worked from CLI exit status alone; require a session ID, a parseable transcript, the requested completion marker, and task-appropriate build/runtime verification.
- Record each task's model invocation timing in `metadata.json` with UTC start/completion timestamps and elapsed milliseconds; prepared dry runs use `null` because no model ran.
- Categorize every valid transcript in `metadata.json` across context gathering, planning, implementation, and verification. Include percentages totaling 100 and a stacked progress bar; exclude transport noise, signatures, and duplicated tool results.
- Use pnpm exclusively for package installation and package scripts in benchmark apps and benchmark tooling; do not use npm.
- Standalone HTML tasks need no server port. Other web apps use a unique valid port from `9100-9199` (GPT), `9200-9299` (Claude), or `9300-9399` (other). Values `91000`, `92000`, and `93000` are invalid because TCP ports end at `65535`.
- NEVER use `rm -rf`; move disposable artifacts with `trash`.
