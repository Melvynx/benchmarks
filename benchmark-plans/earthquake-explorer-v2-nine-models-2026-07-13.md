# Benchmark plan: Earthquake Explorer v2 — nine requested runs

Canonical local prompt: `~/Developer/saas/code.melvynx.dev/content/prompts/earthquake-explorer/v2.md`

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | ccx | medium | earthquake-explorer |
| yes | claude-fable-5 | cc | medium | earthquake-explorer |
| yes | claude-sonnet-5 | cc | max | earthquake-explorer |
| yes | gpt-5.6-sol | codex | medium | earthquake-explorer |
| yes | gpt-5.6-terra | codex | high | earthquake-explorer |
| yes | gpt-5.6-luna | codex | xhigh | earthquake-explorer |
| yes | gpt-5.6-sol | ccx | medium | earthquake-explorer |
| yes | gpt-5.6-terra | ccx | high | earthquake-explorer |
| yes | gpt-5.6-luna | ccx | xhigh | earthquake-explorer |

## Notes

- GPT models requested through the Claude Code harness family use `ccx` per repository routing rules.
- User wording `ultra` maps to harness effort `high`; `extra high` maps to `xhigh`.
- The repeated GPT 5.6 Sol medium / `ccx` request is intentionally retained as an independent run.
