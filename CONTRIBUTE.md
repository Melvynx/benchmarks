# Contribute

You can contribute to Model Benchmarks by proposing a prompt, proposing a task,
or running an existing benchmark. Contributions should remain reproducible,
reviewable, and compatible with the public comparison site.

## Before you begin

Install the repository with pnpm:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Do not commit `node_modules`, generated build output, local environment files,
or credentials. Historical results and run evidence are immutable: do not edit,
rename, or replace an existing result.

## Propose a prompt

Prompts live in `prompts/<slug>/v<number>.md`.

1. For a new prompt, create `prompts/<slug>/v1.md`.
2. To improve an existing prompt, add the next numeric version. Never rewrite a
   version that may already have been used.
3. Keep model-facing wording neutral. Do not reveal that the task is a
   benchmark, evaluation, or comparison, and do not add a completion sentinel.
4. Describe the expected product, constraints, interactions, and verification
   criteria clearly enough that different models receive the same task.
5. Regenerate and verify the prompt catalog:

   ```bash
   pnpm index:prompts
   pnpm verify:prompts
   ```

In the pull request, explain what the prompt tests and why the new version is
useful.

## Propose a task

A task connects a stable CLI name to a prompt, application type, optional seed,
port policy, and verification strategy.

Include the following in a task proposal:

- A stable kebab-case task name.
- Its prompt slug and initial version.
- Its type: standalone HTML, package web app, cloned web app, or CLI suite.
- Any seed repository or local assets required to start.
- Objective build, runtime, interaction, and evidence requirements.
- A short explanation of what capability the task is intended to exercise.

Add the task to the canonical catalog in
`.agents/skills/run-benchmark/references/task-catalog.md` and update the task
routing in `.agents/skills/run-benchmark/scripts/run-benchmark.sh`. If the task
uses a seed, place it under `benchmarks/<task>/` without installed dependencies
or generated output.

Validate the contribution with:

```bash
.agents/skills/run-benchmark/scripts/run-benchmark.sh --list-tasks
pnpm verify:prompts
pnpm validate:skill
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Configure a benchmark harness

The contributor must install and authenticate the CLI selected for the run.
Verify the commands from a fresh shell before asking Codex to run anything:

```bash
command -v jq
command -v codex
codex --version
zsh -lic 'command -v ccx && ccx --version'
command -v claude
claude --version
```

Harness routing is strict:

- `codex`: OpenAI and GPT models through the Codex CLI.
- `ccx`: `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna` through the Claude
  Code harness family. The `ccx` command must be available in a zsh login shell.
- `cc`: Claude models through the authenticated Claude Code `claude` CLI. The
  runner creates the `cc` wrapper itself; a system `cc` command may only be a C
  compiler.
- `cursor-agent`: other supported models through Cursor Agent.

If a selected CLI is missing, unauthenticated, or does not expose the requested
model, Codex must stop and ask the contributor to finish that CLI setup. It must
not silently choose another model or harness.

Use a smoke run to verify authentication and transcript capture before an
expensive task:

```bash
.agents/skills/run-benchmark/scripts/run-benchmark.sh \
  --model '<model-name>' \
  --harness '<codex|ccx|cc|cursor-agent>' \
  --smoke
```

## Run a benchmark with Codex

This repository includes the `run-benchmark` skill at
`.agents/skills/run-benchmark/SKILL.md`. In Codex, ask for it explicitly:

```text
Use the run-benchmark skill to run <model-name> with <harness> on <task-name>
at <effort> reasoning. Verify and validate the completed run.
```

Codex should use the skill's runner rather than invoking a model CLI manually:

```bash
.agents/skills/run-benchmark/scripts/run-benchmark.sh \
  --model '<model-name>' \
  --harness '<codex|ccx|cc|cursor-agent>' \
  --tasks '<task-name>' \
  --effort '<level>'
```

For a reusable comparison matrix, copy `benchmark-plans/TEMPLATE.md`, enable
only the rows you want, and ask Codex to run it with the `run-benchmark` skill.

A CLI exit code alone is not a successful benchmark. A contribution must retain
the session ID and parseable transcript, capture the final response, and pass
task-appropriate build/runtime verification plus the final validator. Report
failed runs literally; do not rewrite them into successful results.

## Submit the contribution

Before opening a pull request, review the changed files and run the relevant
validation commands. The pull request should identify whether it contributes a
prompt, task, run, or combination of them, and should include any known limits
or failed verification clearly.
