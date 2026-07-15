# Little Red Riding Hood Film v1 — six-model X-High comparison

Run the canonical 112-second illustrated browser film across the established unique GPT 5.6 and Claude model matrix.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | codex | xhigh | little-red-riding-hood-film |
| yes | gpt-5.6-terra | codex | xhigh | little-red-riding-hood-film |
| yes | gpt-5.6-luna | codex | xhigh | little-red-riding-hood-film |
| yes | claude-fable-5 | cc | xhigh | little-red-riding-hood-film |
| yes | claude-opus-4.8 | cc | xhigh | little-red-riding-hood-film |
| yes | claude-sonnet-5 | cc | xhigh | little-red-riding-hood-film |

## Notes

- Every model receives the exact same canonical local v1 prompt and X-High effort.
- GPT models use the Codex harness; Claude models use Claude Code.
- Every model/task pair runs concurrently with a shared benchmark ID.
- The film starts automatically with seed 1812 and exposes deterministic scene seeking for step-by-step visual comparison.
