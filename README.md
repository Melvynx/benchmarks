# Model Benchmarks

Reproducible coding-model benchmarks with recorded prompts, transcripts, timing,
verification evidence, generated applications, and a browser-based comparison
workbench.

## Repository layout

- `.agents/skills/run-benchmark/` — canonical benchmark runner and validators.
- `.agents/rules/benchmark-runs.md` — routing, evidence, naming, and proof rules.
- `benchmark-compare/` — TanStack Start comparison application.
- `benchmark-plans/` — reusable model/task matrices.
- `prompts/` — canonical, immutable versioned task prompts.
- `prompts.json` — deterministic prompt paths, public URLs, sizes, and hashes.
- `runs/` — immutable run-level evidence and metadata.
- `transcripts.json` — portable index of every primary and resumed transcript.
- `<task>/<date>-<harness>-<model>/` — historical generated applications.

Historical result directories are evidence. Do not rename or rewrite them.

## Requirements

- Node.js 22 or newer
- pnpm 10.12.1 through Corepack
- One or more supported harnesses: `codex`, `ccx`, `cc`, `cursor-agent`

## Install and open the comparison app

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The comparison app opens on `http://127.0.0.1:9080` and reads benchmark data
from the repository root. Override the data directory with `BENCHMARK_ROOT`.
Canonical prompts are available at `/prompts` and each immutable version at
`/prompts/<slug>/v<number>`.

Production:

```bash
pnpm build
BENCHMARK_ROOT="$PWD" HOST=127.0.0.1 PORT=9080 pnpm serve
```

## Run benchmarks

List canonical tasks:

```bash
.agents/skills/run-benchmark/scripts/run-benchmark.sh --list-tasks
```

Run one model/task combination:

```bash
.agents/skills/run-benchmark/scripts/run-benchmark.sh \
  --model gpt-5.6-terra \
  --harness codex \
  --tasks elysian-taste-challenge \
  --effort medium
```

Run an enabled Markdown matrix:

```bash
.agents/skills/run-benchmark/scripts/run-benchmark-plan.sh \
  benchmark-plans/example.md
```

Every real run must have a session ID, parseable transcript, completion marker,
and task-appropriate build/runtime verification. A successful process exit alone
is not a successful benchmark.

## Validation

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm validate:skill
pnpm verify:prompts
pnpm verify:transcripts
```

## Repository hygiene

The Git repository contains source and benchmark evidence, not installed
dependencies or reproducible framework output. Generated applications retain
their own `package.json` and pnpm lockfile where available, while `node_modules`,
build caches, local environment files, and nested Git histories stay outside the
published repository.

## Deployment

See [`deploy/README.md`](deploy/README.md) for the hardened systemd deployment
used by `benchmark.melvynx.dev`.
