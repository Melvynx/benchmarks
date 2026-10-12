# Benchmark plan: GPT 6 Luna and Claude Haiku 5.5, medium vs xhigh

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-6-luna | codex | medium | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation,lava-lamp-3d |
| yes | gpt-6-luna | codex | xhigh | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation,lava-lamp-3d |
| yes | claude-haiku-5-5-thinking-medium | cursor-agent | medium | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation,lava-lamp-3d |
| yes | claude-haiku-5-5-thinking-xhigh | cursor-agent | xhigh | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation,lava-lamp-3d |

## Notes

Requested 2026-10-09: same task set as `2026-09-30-cowdie-matrix.md`, plus the new `lava-lamp-3d` task (local v1 prompt). 4 configurations × 7 tasks = 28 independent concurrent sessions. GPT 6 Luna runs through Codex with explicit reasoning effort. Claude Haiku 5.5 runs through Cursor Agent like the previous Claude rows; Cursor encodes effort in the model ID, and the `thinking` variants are used because the plain `claude-haiku-5-5-<effort>` IDs are Cursor's "No Thinking" variants.

Group: `benchmark-20261009T010656Z-a22b3585`. The GPT range 9100-9199 was fully recorded by historical runs, so the port allocator now reuses ports not held by a live run (see `.agents/rules/benchmark-runs.md`).

## Codex sandbox environment fix and GPT reruns

The plan was launched through `portly temp`, whose environment carries `NODE_USE_SYSTEM_CA=1`. Inside Codex's workspace-write sandbox, Keychain access is denied, so `pnpm` and `node` exited 139 with `SecItemCopyMatching failed -50`. Eight Luna sessions hit it and could not install, build, or serve: cowdie (medium, xhigh), simulation-life (medium, xhigh), timezone-checker (medium, xhigh), gmail-clone (medium), lava-lamp-3d (xhigh). The other six Luna sessions never invoked node or pnpm. Reproduced with two minimal `codex exec` probes: with the variable `pnpm` crashed, without it `pnpm` 11.17.0 ran.

Codex invocations now run through `env -u NODE_USE_SYSTEM_CA`. The eight affected sessions were relaunched at 2026-10-09T01:55Z as fresh sessions with their exact original prompt in `iterations/1` (`iterate-benchmark-task.sh --fresh-session`). First attempts and their apps are preserved; reruns write to new suffixed app directories.

## Runner edited mid-run

`run-benchmark.sh` was edited at ~01:21Z while the Haiku sessions were running. Bash had already parsed the per-task loop, so metadata, verification, and resume files are intact, but the post-loop `run.json` write failed with a syntax error for every Haiku run that returned after the edit. Those `run.json` files are backfilled from task metadata with identical fields; `created_at` is the `metadata.json` write time.

## Hung foreground dev servers

Three Haiku medium sessions (simulation-life, timezone-checker, cowdie) ran `pnpm dev` as a blocking foreground tool call; Cursor Agent in print mode waited 33-45 minutes with no output. At 2026-10-09T01:57:22Z only those three Vite process groups received SIGTERM so the tool calls returned; the sessions then resumed on their own. No prompt was sent.

The models were notified of the exit, restarted `pnpm dev` in the background, confirmed HTTP 200 with curl, and ended their turn. Cursor Agent in print mode then waited on the live background shell instead of emitting its result: four sessions (Haiku medium simulation-life, timezone-checker, cowdie; Haiku xhigh simulation-life) sat idle for about 5 hours. At 2026-10-09T07:12Z each received SIGINT; Cursor Agent flushed the pending assistant message and a `result` event (`subtype: success`, `is_error: false`), so the final responses are captured. Their recorded status is `failed` only because the harness exit code is 130; model timing includes the idle wait.

## Genuine failure

Haiku xhigh 3d-car-crash ran 3h03 and ended with `RetriableError: [resource_exhausted]` and no final response or `index.html`.

## Delivered app evidence

The eight fresh-session GPT reruns wrote into suffixed app directories (`-3`, `-4`), while each run's `metadata.json` still names the crashed first attempt. Verify, validate, and capture now resolve the newest `harness-verified` iteration's `app_path`, so build, runtime, port, and screenshot evidence describe the delivered app. Captures use SwiftShader WebGL so 3D tasks do not render black headless.

Luna xhigh cowdie (`-4`) and gmail-clone (`-2`) fail runtime verification on their own servers: `root` keeps a trailing slash, so `startsWith(root + sep)` rejects every path and each request returns 404/403. Both still render in the comparison UI, which serves the files statically.
