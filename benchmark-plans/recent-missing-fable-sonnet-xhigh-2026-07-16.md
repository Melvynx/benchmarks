# Benchmark plan: recent missing Fable 5 and Sonnet 5 runs

Run only the missing valid results for the recently added benchmark tasks.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-fable-5 | cc | xhigh | distributed-systems-playground,little-red-riding-hood-film,living-identity-system,one-button-boss-fight,orbital-rescue-digital-twin,the-last-signal |
| yes | claude-sonnet-5 | cc | xhigh | air-conditioning-understanding,gmail-clone,little-red-riding-hood-film,living-identity-system,one-button-boss-fight,orbital-rescue-digital-twin,the-last-signal |

## Notes

- Existing valid Fable 5 results for air conditioning and Gmail are preserved.
- The existing valid Sonnet 5 result for distributed systems is preserved.
- Failed historical runs remain untouched and are replaced by new independently recorded runs.
- The runner selects the highest local prompt version for every task, including `the-last-signal/v2`.
