# Benchmark plan: GPT-5.6 Sol xhigh — all tasks once

Run every canonical benchmark exactly once with GPT-5.6 Sol at X-High reasoning effort.

For Ultra reasoning, use `gpt-5-6-sol-ultra-all-once-2026-07-15.md` instead.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | codex | xhigh | all |

## Notes

This plan intentionally has one enabled model row. The plan runner expands `all` into one independent concurrent run per canonical task under a shared benchmark ID.
