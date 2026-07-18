# Benchmark plan: The Last Signal v2 — five models at X-High

Every enabled row runs the autoplay-first v2 prompt for `the-last-signal`.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | codex | xhigh | the-last-signal |
| yes | gpt-5.6-terra | codex | xhigh | the-last-signal |
| yes | gpt-5.6-luna | codex | xhigh | the-last-signal |
| yes | claude-sonnet-5 | cc | xhigh | the-last-signal |
| yes | claude-fable-5 | cc | xhigh | the-last-signal |

## Notes

- This is a new comparison group; historical v1 outputs remain unchanged.
- All five models use the same canonical local v2 prompt and X-High effort.
- The generated story must autoplay from page load using seed `217` and the `answer` ending.
