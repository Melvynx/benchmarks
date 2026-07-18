# Benchmark plan: retry session-limited Fable 5 and Sonnet 5 runs

Retry only the runs that hit the Claude session limit during `benchmark-20260716T103323Z-8ea3ad92`.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-fable-5 | cc | xhigh | little-red-riding-hood-film,orbital-rescue-digital-twin |
| yes | claude-sonnet-5 | cc | xhigh | gmail-clone,orbital-rescue-digital-twin |

## Notes

- The 9 validated runs from `benchmark-20260716T103323Z-8ea3ad92` should be preserved and not rerun.
- Retry after the Claude session limit reset reported by the failed runs: 6:30pm Europe/Kiev.
- The runner selects the highest local prompt version for every task.
