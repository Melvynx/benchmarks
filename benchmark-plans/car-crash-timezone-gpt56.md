# Car crash and timezone checker: GPT 5.6 comparison

Compare Codex and Claude Code-compatible GPT harnesses on the same two tasks.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | codex | medium | car-crash,timezone-checker |
| yes | gpt-5.6-luna | codex | xhigh | car-crash,timezone-checker |
| yes | gpt-5.6-luna | ccx | xhigh | car-crash,timezone-checker |

## Notes

- `ccx` is the Claude Code harness configured to run GPT models.
- `car-crash` is standalone HTML and receives no port.
- `timezone-checker` receives a unique GPT port in the `9100-9199` range.
