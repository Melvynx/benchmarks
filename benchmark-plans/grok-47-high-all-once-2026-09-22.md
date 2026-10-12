# Benchmark plan: Grok 4.7 High — all tasks once

Run every canonical benchmark exactly once with Grok 4.7 at High reasoning
effort, mirroring the Grok 4.6 High sweep (`cursor-grok-4.6-high`).

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | grok-4.7-high | cursor-agent | high | all |

## Notes

This plan intentionally has one enabled model row. The plan runner expands `all`
into one independent concurrent run per canonical task under a shared benchmark
ID. `grok-4.7-high` was confirmed present in the `cursor-agent --list-models`
catalog on 2026-09-22. Effort is encoded in the model id; Cursor Agent does not
take a separate `--effort` flag. Token rates for cost estimates are the
official xAI rates: $2 / $0.50 / $6 per million input, cached input, and output
tokens below 200k prompt tokens.
