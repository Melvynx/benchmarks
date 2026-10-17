# Benchmark plan: Tesla Roadster "The Ramp" (prompt v2)

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-opus-5-5 | cc | medium | tesla-roadster |
| yes | claude-opus-5-5 | cc | xhigh | tesla-roadster |
| yes | gpt-6.1-sol | codex | medium | tesla-roadster |
| yes | gpt-6.1-sol | codex | xhigh | tesla-roadster |
| yes | gemini-4-argon-medium | cursor-agent | medium | tesla-roadster |
| yes | gemini-4-argon-high | cursor-agent | high | tesla-roadster |
| yes | muse-wonder-full-1.0 | muse | medium | tesla-roadster |
| yes | muse-wonder-full-1.0 | muse | xhigh | tesla-roadster |

## Notes

Requested 2026-10-17, replacing the stopped v1 plan (`2026-10-17-tesla-roadster.md`). Prompt `prompts/tesla-roadster-stunt-show/v2.md` keeps only Tesla's "The Ramp" clip (https://www.youtube.com/watch?v=7p5LxFdc-Qg): high-fidelity ramp, real physics, working thrusters, clean landing, and a car built from breakable parts that comes apart when a run fails. User priorities, in order: ramp quality, ramp visibility, the climb, the thrusters and the car's reactions, a normal landing.

The seed `benchmarks/tesla-roadster/base-repo/references/` now holds the 1080p clip `the-ramp.mp4` and 24 stills from it (1280 px), indexed in its `README.md`. The v1 kickflip and launch frames were moved to the trash; v1 runs keep their own copies in their app directories.

Gemini 4 Argon has no extra high tier in any installed harness; the top Argon lane is `gemini-4-argon-high`. Opus 5.5 runs through Claude Code (`cc`).

## Results

Run on the Linux VPS, benchmark `benchmark-20261017T025331Z-f7e062b5`, all eight lanes launched together at 02:53Z. Comparison: `comparisons/cmp-20261017T044818Z-tesla-roadster-the-ramp-v2.json` (workbench `?run=cmp-20261017T044818Z-tesla-roadster-the-ramp-v2`).

Every lane that produced an app got one follow-up iteration, `benchmark-plans/2026-10-17-tesla-roadster-v2-fix-ramp.md`, after Melvyn asked for a taller ramp whose curve continues to an almost horizontal top platform where the car hangs (reference frame `22`). The published app in each lane is the fixed version. The first version is kept under `runs/<run>/data/tesla-roadster/one-shot/index.html`. The same request is folded into prompt `v3` for future runs.

Time is model time. Cost is the harness-reported cost (Claude Code, Muse) or a token estimate at list price (Codex), with resumed-session counters reduced to the increment. Argon cost is from the Cursor billing ledger.

| Lane | First pass | Fix iteration | Total |
|---|---|---|---|
| Opus 5.5 cc medium | 52.5 min, $9.70 | 8.6 min, $2.89 | 61 min, $12.59 |
| Opus 5.5 cc xhigh | 75.3 min, $16.24 | 22.9 min, $6.97 | 98 min, $23.21 |
| GPT-6.1 Sol codex medium | 12.3 min, $0.68 | 6.5 min, $0.34 | 19 min, $1.02 |
| GPT-6.1 Sol codex xhigh | 19.8 min, $1.32 | 12.8 min, $1.00 | 33 min, $2.32 |
| Muse Wonder FULL 1.0 medium | 19.1 min, $2.26 | 21.9 min, $1.37 | 41 min, $3.63 |
| Muse Wonder FULL 1.0 xhigh | 58.4 min, $5.81 | 33.2 min, $2.98 | 92 min, $8.79 |
| Gemini 4 Argon medium | failed ×3 (25.3, 6.8, 21.1 min) | not sent | 53 min, $4.09, no app |
| Gemini 4 Argon high | failed ×3 (7.6, 38.1, 9.0 min) | not sent | 55 min, $3.85, no app |

### Browser checks of the fixed apps

Checked in headless Chromium with SwiftShader (1–4 fps, so slow apps run their simulation several times slower than wall time): screenshots and telemetry over the default run, then each failure button. Jets are judged from the active-nozzle telemetry and the plumes visible in stills, not from frame-by-frame direction analysis. Real-GPU frame rate is not measured.

| Lane | Ramp quality | Ramp visible | Climbs past vertical, inverted hold | Jets and reactions | Clean landing | Low downforce breaks | Thruster failure breaks | Too slow breaks |
|---|---|---|---|---|---|---|---|---|
| Opus medium | PASS, best ramp: full hook, dense truss, worn concrete | PASS | PASS, 163° at 38.8 m | PASS, corner lift and side jets | PASS, touchdown in smoke, drive-out | PASS | PASS | PASS |
| Opus xhigh | PASS, tall concrete hook, red strips, truss | PASS | PASS, 163° hold | PASS, lift jets in flight and hover | PASS | PASS, parts listed torn off | PASS | PASS |
| Sol medium | PASS, hook with truss-held platform | PASS, surface very bright | PASS, 167° hold | PASS, attitude, lift, rear groups | PASS, four wheels at the foot | PASS | PASS | PASS |
| Sol xhigh | PASS, 38 m hook, horizontal platform | PARTIAL, blown out white from the foot camera | PASS, 167° at 38 m | PASS, lift, roll, attitude | PASS | PASS | PASS | PASS |
| Muse medium | PASS, 37 m hook with overhang | PASS, dark scene | PASS, 165° hold | PASS, four down jets and side jets | PASS | PASS | PASS | PASS |
| Muse xhigh | PASS, large C arc on a steel frame | PASS, dark scene | PASS, about 158°, hang about 1 s | PASS, four lift jets and side jet, hover | PASS, 13/13 parts intact | PASS, 1/13 intact | PASS, 1/13 intact | FAIL, rolls back intact (13/13) |
| Argon medium, high | FAIL, no app | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |

### One-shot versions (before the fix prompt)

- Sol medium: climb to 113°, hold, clean landing; Low downforce and Thruster failure break the car; Too slow rolls back with no break seen in the window.
- Sol xhigh: passes every check (108°, two-second hold, jets, "zero joint failures" landing, all three failures separate joints); ramp overexposed from the rear camera.
- Muse medium: 115° hold, jets, touchdown, drive-away; Thruster failure crashes; Low downforce oscillates on the curve and Too slow stalls, with no break seen in the window.
- Opus medium: climb to 112° at 18 m, hold, descent, landing ("Complete"); Low downforce and Thruster failure end in "Structural failure"; Too slow rolls back to the foot and reports "Complete" without breaking.
- Opus xhigh: 112° hold, flight, hover, touchdown, drive out; all three failures end in a FAULT with parts torn off (bumpers, rear section, glass, wheels).
- Muse xhigh: climbs, hangs, flies with jets, hovers, touches down, COMPLETE with 13/13 parts; Low downforce and Thruster failure crash (1/13 intact); Too slow fails intact (13/13).

The one-shot ramps were all about 20 m with the hold near 110–115°, as prompt v2 asked. The fix prompt moved every lane to a 36–40 m ramp with the hold at 158–167°.

### Argon

Both Argon lanes ended with `NonRetriableError: Provider Error ... trouble connecting to the model provider` from Cursor Agent on the first pass and on two fresh-session retries each, without writing `index.html`. Per the handoff rule this is recorded as a genuine failure. Cursor CLI was already the latest build (2026.10.16).

### Incidents and tooling fixes

- `iterate-benchmark-task.sh` overwrote the published one-shot app; one-shots were saved under `one-shot/` and the script now snapshots them before the first iteration. The Sol medium one-shot was rebuilt byte-exact from the Codex rollout (`one-shot/README.txt`).
- Argon medium retry 2 started under an earlier copy of `iterate-benchmark-task.sh` that was edited while it ran; its post-processing exited early and its iteration metadata was finalized by hand (noted in that `metadata.json`).
- At 03:50Z an operator command replaced `/dev/null` for about a minute; one tool call each in Opus xhigh (first pass) and Opus medium (fix) failed with `/dev/null: No such file or directory`, and both sessions continued.
- Opus medium's fix iteration ended its turn while a background render it had started was still running ("I'll review them when the job completes"). The app was already rewritten and passes the browser checks.
- Opus scratch folders (`.dev/`, `.scratch/`, with a Chrome profile, `node_modules`, and screenshots) are left out of the commit.
- Linux portability: `IS_SANDBOX=1` for Claude Code as root, a `cc()` function because `cc` is the C compiler, Cursor usage token from `~/.config/cursor/auth.json`, Muse support and per-iteration usage in `iterate-benchmark-task.sh`, fresh retries seeded with `base-repo`, and an undici crash fix in `capture-benchmark-run.mjs`.
- The comparison ledger double-counted resumed Claude Code sessions, whose `total_cost_usd` includes earlier invocations; `transcript-accounting.server.ts` now bills only the increment.
