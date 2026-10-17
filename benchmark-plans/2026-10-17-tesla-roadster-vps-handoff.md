# Handoff: continue the Tesla Roadster "The Ramp" benchmark on code-vps

Paste the prompt below into an agent session on `code-vps` (Linux, `root`).

---

You are continuing a benchmark task that started on Melvyn's Mac and moved to this VPS because the Mac was too slow. Reply in French. Be terse.

## Where things are

- Repository: `/root/projects/agent-benchmarks` (clone of `https://github.com/Melvynx/benchmarks.git`, branch `main`, includes commit `077564da` or later). Read `AGENTS.md`, `.agents/rules/benchmark-runs.md`, and `.agents/skills/run-benchmark/SKILL.md` before acting.
- Files that were not committed were copied to `/root/tmp/bench-extra/`:
  - `repo/runs/20261017T*` and `repo/benchmarks/tesla-roadster/2026-10-17-*`: the stopped v1 and v2 runs from the Mac. Evidence only. Move them into the repository at the same relative paths if useful, but do not resume them.
  - `repo/jev/`: a stray root directory from an older run. Leave it out of commits.
  - `roadster-work/`: the downloaded clips (`the-ramp.mp4`, `7p5LxFdc-Qg.mp4`, ABC `video.mp4`, the kickflip clips), frame contact sheets, and `shoot.sh`, the browser screenshot script (uses the `dev-browser` CLI).
  - `transcripts/`: the full transcript of the Mac session.
- Task `tesla-roadster` is registered in `run-benchmark.sh`, `run-benchmark-plan.sh`, the task catalog, and the layout audit. It is a standalone HTML task (no port). The runner copies `benchmarks/tesla-roadster/base-repo/.` into each isolated workspace, so every model gets `references/the-ramp.mp4`, 24 stills, and `references/README.md`.
- Canonical prompt: `prompts/tesla-roadster-stunt-show/v2.md` (ramp only). v1 (three stunts) was rejected by Melvyn because the models did not reproduce the video. Do not use v1.

## What Melvyn wants

Recreate Tesla's "The Ramp" clip (https://www.youtube.com/watch?v=7p5LxFdc-Qg) in high fidelity, with real physics and a free camera to watch the run. Priorities, in order:

1. A high-quality ramp.
2. The ramp is clearly visible.
3. The car really climbs it.
4. The thrusters and the car's reactions work correctly.
5. The car lands normally.

If anything goes wrong, the car must break apart. The v2 prompt encodes all of this. If Melvyn asks for prompt changes, add `v3.md`; never edit a version a run has used. Then run `pnpm index:prompts`.

## Plan to run

`benchmark-plans/2026-10-17-tesla-roadster-v2.md`, 8 concurrent sessions:

| model | harness | effort |
|---|---|---|
| claude-opus-5-5 | cc | medium, xhigh |
| gpt-6.1-sol | codex | medium, xhigh |
| gemini-4-argon-medium / gemini-4-argon-high | cursor-agent | medium, high (Argon has no xhigh) |
| muse-wonder-full-1.0 | muse | medium, xhigh |

On the Mac, this plan was launched as group `benchmark-20261017T012815Z-abe90d2e`, then stopped by Melvyn before any run finished. Start a fresh group on the VPS.

## Steps

1. `git -C /root/projects/agent-benchmarks status --short --branch`, then `pnpm install` if needed and `pnpm validate:skill`.
2. Check the harnesses in a login shell (`bash -lc`): `codex`, `claude` (`cc` must resolve; the runner checks `zsh -lic 'command -v claude'`, so make sure zsh and the `cc`/`ccx` setup exist or adapt), `cursor-agent`, `muse`, `jq`, `ffmpeg`, `dev-browser`. Run `run-benchmark.sh --smoke` once per harness before the real plan.
3. Fix any macOS-only assumptions in the scripts you hit (for example `/usr/bin/trash`, `uuidgen`, `lsof`, `date`, BSD `sed -i ''`, `security` keychain in `recover-cursor-usage.py`). Keep changes minimal and portable; do not break the Mac path.
4. Launch with Portly, never `nohup`: `job_id="$(portly temp '.agents/skills/run-benchmark/scripts/run-benchmark-plan.sh benchmark-plans/2026-10-17-tesla-roadster-v2.md' --path /root/projects/agent-benchmarks --timeout 4h)"`. Opus xhigh can take more than an hour.
5. Known failures:
   - Gemini 4 Argon often dies with `NonRetriableError: Provider Error` after a 180 s silence. Retry with a fresh session using the exact original prompt: `iterate-benchmark-task.sh runs/<run>/data/tesla-roadster runs/<run>/data/tesla-roadster/prompt.md --fresh-session`, up to 2 times. Record a third failure as genuine.
   - Muse and Cursor Agent sessions can leave dev servers running; kill only processes whose cwd is that session's isolated workspace.
6. When runs finish: `verify-benchmark-run.sh`, then `capture-benchmark-run.mjs` (needs `BENCHMARK_PLAYWRIGHT_ROOT` pointing at a project with `@playwright/test`), then `validate-benchmark-run.sh`.
7. Check every app in a real browser with `dev-browser`, never a model's own self-test. Use `roadster-work/shoot.sh` as a starting point: screenshots over 0 to 90 s plus page errors. Then check, for each app: ramp quality and visibility, the climb past vertical, the inverted hold, jets matching thrust, a clean landing on the default run, and that each failure button (Low downforce, Thruster failure, Too slow) breaks the car. Report each point literally per model.
8. Build the comparison: `create-comparison.mjs --models 'claude-opus-5-5@cc:medium,claude-opus-5-5@cc:xhigh,gpt-6.1-sol@codex:medium,gpt-6.1-sol@codex:xhigh,gemini-4-argon-medium,gemini-4-argon-high,muse-wonder-full-1.0@muse:medium,muse-wonder-full-1.0@muse:xhigh' --tasks tesla-roadster --title 'Tesla Roadster The Ramp v2'`.
9. Write results (time, cost, pass/fail per priority) under `## Results` in `benchmark-plans/2026-10-17-tesla-roadster-v2.md`. Commit and push the runs, apps, and plan. Scan for secrets first, and do not commit browser profiles or downloaded browsers (`.gitignore` already excludes `.validate-profile/`, `.pw-browsers/`, `.browsers/`).
10. Tell Melvyn when it is done, with the comparison link and a one-line verdict per model.

## Rules

- pnpm only, never npm. No `rm -rf`; use `trash`. Do not rewrite historical run directories.
- Keep model-facing prompts neutral: no mention of benchmarks.
- Never claim a model succeeded from exit status alone.
