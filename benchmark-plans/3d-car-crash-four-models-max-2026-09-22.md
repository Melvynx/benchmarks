# 3D car crash — four models, maximum thinking

One-shot `3d-car-crash` comparison. Each row is the highest thinking tier available for that model.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | grok-4.7-xhigh | cursor-agent | xhigh | 3d-car-crash |
| yes | claude-fable-5-1-thinking-max | cursor-agent | max | 3d-car-crash |
| yes | gemini-3.8-flash-high | cursor-agent | high | 3d-car-crash |
| yes | gpt-6-astra | codex | xhigh | 3d-car-crash |

## Notes

- Canonical prompt: `prompts/3d-car-crash/v1.md`.
- Cursor Agent encodes thinking in the model id. Grok 4.7 tops out at `grok-4.7-xhigh`. Fable 5.1 max thinking is `claude-fable-5-1-thinking-max`. Gemini 3.8 has no tier above `gemini-3.8-flash-high`.
- Claude Code subscription access is disabled on this machine, so Fable runs through Cursor Agent instead of `cc`.
- Codex Astra uses `model_reasoning_effort=xhigh`, the highest effort this harness has been run with here.
- The prompt tells every model to write `index.html` in one shot and not to open a browser, click, or visually test.
