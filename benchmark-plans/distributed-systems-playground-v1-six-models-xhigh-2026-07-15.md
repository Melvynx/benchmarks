# Distributed Systems Playground v1 — six-model maximum-reasoning comparison

Run the canonical deterministic distributed-systems playground across the established GPT 5.6 and Claude model matrix.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | gpt-5.6-sol | codex | xhigh | distributed-systems-playground |
| yes | gpt-5.6-terra | codex | xhigh | distributed-systems-playground |
| yes | gpt-5.6-luna | codex | xhigh | distributed-systems-playground |
| yes | claude-fable-5 | cc | xhigh | distributed-systems-playground |
| yes | claude-opus-4.8 | cc | xhigh | distributed-systems-playground |
| yes | claude-sonnet-5 | cc | xhigh | distributed-systems-playground |

## Notes

- User wording `extra high` maps to harness effort `xhigh`.
- GPT models use the Codex harness; Claude models use Claude Code.
- Every model/task pair runs concurrently with a shared benchmark ID.
- The earlier standalone Sol run used `high` and is preserved separately; this plan creates a new `xhigh` Sol run.
