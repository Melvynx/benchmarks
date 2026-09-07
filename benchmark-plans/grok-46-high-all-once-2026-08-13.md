# Benchmark plan: Cursor Grok 4.6 High — all tasks once

Run every canonical benchmark exactly once with Cursor Grok 4.6 at High reasoning
effort, mirroring the previous Grok 4.5 High runs (`cursor-grok-4.5-high`).

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | cursor-grok-4.6-high | cursor-agent | high | all |

## Notes

This plan intentionally has one enabled model row. The plan runner expands `all`
into one independent concurrent run per canonical task under a shared benchmark
ID. `cursor-grok-4.6-high` was confirmed present in the `cursor-agent
--list-models` catalog on 2026-08-13.
