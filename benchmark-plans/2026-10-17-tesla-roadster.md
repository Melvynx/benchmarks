# Benchmark plan: Tesla Roadster stunt show

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

Requested 2026-10-17: new task `tesla-roadster` (prompt `prompts/tesla-roadster-stunt-show/v1.md`), recreating the three stunts from the ABC News report on the Tesla Roadster reveal (https://www.youtube.com/watch?v=BYWy6SyJRZo): the kickflip, the 0-60 launch, and the ramp. Opus 5.5, GPT 6.1 Sol, Gemini 4 Argon, and Muse Wonder Full, each at medium and extra high. 8 independent concurrent sessions in one comparison group.

The seed `benchmarks/tesla-roadster/base-repo/references/` holds 25 frames (1280 px) from the ABC report and Tesla's official "The Kickflip" and "The Ramp" uploads, indexed with source timestamps in its `README.md`. The runner copies it into each isolated workspace.

Gemini 4 Argon has no extra high tier: Cursor Agent exposes low, medium, and high only, and OpenRouter and Vercel expose no effort levels. The top Argon lane uses `gemini-4-argon-high`, as in the 2026-10-14 and 2026-10-15 plans.

Opus 5.5 runs through Claude Code (`cc`), the repository default for Claude models.

## Stopped

Group `benchmark-20261017T004206Z-f5cca7a1`, launched 2026-10-17T00:42Z. Stopped by request at about 2026-10-17T01:20Z: the user judged that the v1 prompt does not reproduce the stunt from the video and asked for a new test. Finished before the stop: GPT 6.1 Sol medium and xhigh, Muse Wonder Full medium. Gemini 4 Argon high failed with the Cursor provider error, and its fresh-session retry was stopped. Opus 5.5 medium and xhigh, Argon medium, and Muse Wonder Full xhigh were stopped mid-run. No result was verified or added to a comparison.
