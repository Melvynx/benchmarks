# Benchmark plan: Gemini 4 Argon vs Claude Opus 5.5, Cursor Agent

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gemini-4-argon-medium | cursor-agent | medium | 3d-car-crash,car-crash,timezone-checker,simulation-life,air-conditioning-understanding,gmail-clone,elysian-taste-challenge |
| yes | gemini-4-argon-high | cursor-agent | high | 3d-car-crash,car-crash,timezone-checker,simulation-life,air-conditioning-understanding,gmail-clone,elysian-taste-challenge |
| yes | claude-opus-5-5-medium | cursor-agent | medium | car-crash,timezone-checker,simulation-life,air-conditioning-understanding,gmail-clone,elysian-taste-challenge |
| yes | claude-opus-5-5-xhigh | cursor-agent | xhigh | car-crash,timezone-checker,simulation-life,air-conditioning-understanding,gmail-clone,elysian-taste-challenge |

## Notes

Requested 2026-10-14: the six main tasks (car crash, timezone checker, simulation life, air-conditioning visualisation, Gmail app, Elysian page) on Gemini 4 Argon medium and high, with Claude Opus 5.5 medium and extra high as the reference lanes. 4 configurations × 6 tasks = 24 independent concurrent sessions in one comparison group. Every lane runs through Cursor Agent, which encodes effort in the model ID.

Gemini 4 Argon is priced at Google's introductory API rates ($2 input, $0.10 cached input, $10 output per MTok through 2026-11-30; $4 / $0.20 / $20 afterwards).

Group: `benchmark-20261013T232525Z-87bf587b`, launched 2026-10-13T23:25Z through `portly temp`. Wall time 1h21m. All 24 runs pass `verify-benchmark-run.sh` except the one genuine failure below; `validate-benchmark-run.sh` passes 23/24.

## Results

Times are model invocation time and include the idle waits described below. Costs and tokens come from Cursor's account usage ledger (`usage-evidence.json` next to each transcript, source `cursor-dashboard.usage-events`): every request Cursor billed to the session's conversation, priced at API rates. Air-conditioning cells include the failed attempts.

| task | opus-5.5 xhigh | opus-5.5 medium | gemini-4-argon high | gemini-4-argon medium |
|---|---|---|---|---|
| air-conditioning-understanding | 1h10m $5.11 | 23m $4.16 | 5m $0.72 (3rd attempt) | failed ×3 $0.10 |
| car-crash | 1h20m $8.17 | 28m $5.25 | 23m $3.33 | 5m $0.46 |
| elysian-taste-challenge | 36m $6.32 | 19m $2.39 | 13m $1.49 | 9m $0.81 |
| gmail-clone | 1h20m $17.23 | 41m $8.33 | 45m $4.02 | 24m $1.62 |
| simulation-life | 1h20m $12.76 | 42m $6.70 | 24m $1.57 | 24m $1.15 |
| timezone-checker | 29m $5.68 | 11m $2.20 | 24m $1.13 | 23m $0.53 |
| **lane total** | **6/6 · 6h16m · $55.28 · 81.0M tok** | **6/6 · 2h44m · $29.01 · 35.9M tok** | **6/6 · 2h13m · $12.25 · 19.8M tok** | **5/6 · 1h27m · $4.68 · 5.5M tok** |

### Why the first cost table was wrong

Cursor Agent's final `result.usage` (and the CLI log's `agent_cli.turn.outcome`) restarts when a turn reconnects mid-stream and resumes from a checkpoint, so it only counted the requests after the last reconnect. 18 of the 23 sessions with a `result.usage` under-counted. The 5 single-request sessions without one match `result.usage` exactly, which validates the ledger as the same counter. The undercount was largest on Opus xhigh (gmail-clone missed 15.0M cache-read and 338k output tokens), which is why xhigh first looked cheaper than medium; it actually costs 1.9× medium. The failed Gemini attempts, previously unpriced character estimates, now have their billed tokens.

All requests were billed to a free credit grant (`charged_usd` 0); the costs above are the API-rate equivalent Cursor computes per request.

## 3d-car-crash (added 2026-10-14T03:45Z)

Gemini 4 Argon only, in the same group; Opus 5.5 already has Cursor Agent runs from `benchmark-20260929T235308Z-b6133e94`. Two Opus runs launched by mistake were stopped within two minutes and moved to the trash. Both Argon runs pass verify, capture, and validate.

| | time | cost | tokens |
|---|---|---|---|
| gemini-4-argon high | 7m 44s | $0.74 | 152k |
| gemini-4-argon medium | 3m 34s | $0.38 | 93k |

Side-by-side with Opus 5.5 (Cursor Agent, 2026-09-29) and GPT 6.1 Sol (Codex, 2026-09-29), medium and xhigh each: `http://127.0.0.1:9080/?compare=3d-car-crash/2026-10-14-cursor-agent-gemini-4-argon-medium,3d-car-crash/2026-10-14-cursor-agent-gemini-4-argon-high,3d-car-crash/2026-09-29-cursor-agent-claude-opus-5-5-medium,3d-car-crash/2026-09-29-cursor-agent-claude-opus-5-5-xhigh,3d-car-crash/2026-09-29-codex-gpt-6-1-sol-3,3d-car-crash/2026-09-29-codex-gpt-6-1-sol-4&layout=grid`

## Gemini air-conditioning provider failures

Every Gemini air-conditioning attempt that failed died the same way: thinking completes, the stream stays silent for exactly 180 s (consistent with one very large single-file tool call), Cursor reconnects, then the session ends with `NonRetriableError: Provider Error We're having trouble connecting to the model provider`. No final response, no `index.html`.

- Medium: 3/3 attempts failed (first attempt plus fresh-session `iterations/1` and `iterations/2`). Recorded as a genuine failure.
- High: first attempt and `iterations/1` failed; the fresh-session `iterations/2` delivered `2026-10-13-cursor-agent-gemini-4-argon-high-3`, which passes build, runtime, and capture. Its `verification.json` carries the delivered iteration and keeps the first attempt under `first_attempt`; `metadata.json` still describes the first attempt.

Fresh retries use the exact original `prompt.md`. Each failed attempt billed one request of about 16.8k tokens ($0.02–0.03).

## Cursor Agent waiting on model-started dev servers

Six Gemini sessions finished their work, left `pnpm dev` running in the background, and Cursor Agent in print mode kept waiting on that shell instead of emitting its result. Longest transcript silences: timezone-checker medium 18m, high 15m; simulation-life medium 13m, high 10m; gmail-clone high 11m, medium 10m. No prompt was sent. Only the Vite process tree in the session's isolated workspace received SIGTERM; Cursor Agent then flushed its final message and a `result` event (`subtype: success`, exit 0).

- 2026-10-13T23:48:39Z timezone-checker medium (manual)
- 2026-10-13T23:49:39Z timezone-checker high, simulation-life medium and high, gmail-clone medium (manual)
- 2026-10-13T23:59:04Z and 2026-10-14T00:11:05Z gmail-clone high (watchdog; the model restarted the server after the first stop, then ended its turn)

The watchdog stopped a workspace's dev-server processes only after 10 minutes without transcript output; its log is `.logs/argon-watchdog.log`. Model timings include these waits, so Gemini durations are inflated by up to ~18 minutes on the web-app tasks.

Several Opus sessions started their dev servers through `portly temp` (the Cursor user rules reach Cursor Agent sessions). Those jobs lived in the isolated workspaces, did not block the harness, and expired on their own timeouts.

## Tooling changes made for this plan

- `model-pricing.ts`: Gemini 4 Argon introductory and standard rates, with tests.
- `iterate-benchmark-task.sh --fresh-session` now supports Cursor Agent (new chat via `cursor-agent create-chat`).
- `verify-benchmark-run.sh`: when a fresh-session iteration is harness-verified, `verification.json` reports that delivered attempt and keeps the first attempt under `first_attempt`.
- Comparison UI: in the live group, `failed` and `interrupted` tasks now count as finished failures instead of "Building".
- `recover-cursor-usage.py`: writes Cursor billing-ledger usage to `usage-evidence.json` for every cursor-agent attempt (keychain CLI login, conversation id = session id, filtered to the attempt's `model_timing` window). `run-benchmark.sh` and `iterate-benchmark-task.sh` now call it after cursor-agent runs, and the comparison UI prefers that ledger over `result.usage`.
- Screenshots: `BENCHMARK_PLAYWRIGHT_ROOT=/Users/melvynx/Developer/projects/codelynx.dev-v2` (Playwright 1.58, matching the cached Chromium 1208).
