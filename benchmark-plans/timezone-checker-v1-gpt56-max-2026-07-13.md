# Benchmark plan: Timezone Checker v1 — GPT 5.6 Codex effort comparison

Canonical local prompt: `~/Developer/saas/code.melvynx.dev/content/prompts/timezone-checker/v1.md`

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | codex | medium | timezone-checker |
| yes | gpt-5.6-terra | codex | high | timezone-checker |
| yes | gpt-5.6-luna | codex | xhigh | timezone-checker |

## Notes

- User wording `ultra or max` maps to Terra's strongest supported Codex effort, `high`.
- User wording `extra high` maps to Luna's strongest supported Codex effort, `xhigh`.
- All three runs use the explicitly requested `codex` harness and execute concurrently.
