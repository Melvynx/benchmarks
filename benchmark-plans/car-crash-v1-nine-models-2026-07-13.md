# Car crash v1 — nine-model comparison

Run the local canonical `car-crash/v1` prompt across the requested Claude Code, Codex, and Claude-family model matrix.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | ccx | medium | car-crash |
| yes | claude-fable-5 | cc | medium | car-crash |
| yes | claude-sonnet-5 | cc | max | car-crash |
| yes | gpt-5.6-sol | codex | medium | car-crash |
| yes | gpt-5.6-terra | codex | high | car-crash |
| yes | gpt-5.6-luna | codex | xhigh | car-crash |
| yes | gpt-5.6-sol | ccx | medium | car-crash |
| yes | gpt-5.6-terra | ccx | high | car-crash |
| yes | gpt-5.6-luna | ccx | xhigh | car-crash |

## Notes

- Requested from `https://code.melvynx.dev/prompts/car-brick-wall-crash/v1` on 2026-07-13. The runner snapshots the numerically highest local version, confirmed as `v1.md` before execution.
- GPT models requested through the Claude Code or Claude harness family use `ccx` per repository routing rules.
- User-facing effort labels map as follows: `ultra` to `high`, and `extra high` to `xhigh`.
