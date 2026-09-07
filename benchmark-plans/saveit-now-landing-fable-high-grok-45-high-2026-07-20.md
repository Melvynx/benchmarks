# SaveIt.now landing page additions: Fable 5 and Grok 4.5

Additional rows requested for comparison with `benchmark-20260720T064049Z-1b03c743`. These rows use the same immutable local `saveit-now-landing/v1` prompt and historical seed as the already-running Kimi K3 and GPT-5.6 Sol rows.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-fable-5 | cc | high | saveit-now-landing |
| yes | cursor-grok-4.5-high | cursor-agent | high | saveit-now-landing |

## Notes

- Fable 5 runs through Claude Code at High effort.
- Cursor does not expose Grok 4.3 on this account. The available newer replacement is Grok 4.5 High.
- The direct runner commands pass the existing comparison ID so all four results remain grouped.
