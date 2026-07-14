# Earthquake Explorer v1 — six-model comparison

Run the local canonical `earthquake-explorer/v1` prompt across the requested Claude Code and Codex model matrix.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | ccx | medium | earthquake-explorer |
| yes | claude-fable-5 | cc | medium | earthquake-explorer |
| yes | claude-sonnet-5 | cc | medium | earthquake-explorer |
| yes | gpt-5.6-sol | codex | medium | earthquake-explorer |
| yes | gpt-5.6-terra | codex | high | earthquake-explorer |
| yes | gpt-5.6-luna | codex | xhigh | earthquake-explorer |

## Notes

Requested from `https://code.melvynx.dev/prompts/earthquake-explorer/v1` on 2026-07-13. The runner snapshots the numerically highest local version, which was confirmed as `v1.md` before execution. GPT on the Claude Code harness family routes through `ccx` per the benchmark skill.
