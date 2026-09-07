# SaveIt.now landing page: Kimi K3 vs GPT-5.6 Sol

Redesign the same historical SaveIt.now landing page seed with the two requested Claude Code-compatible model routes. Both runs use the immutable local `saveit-now-landing/v1` prompt and maximum requested effort.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | k3[1m] | cckimi | xhigh | saveit-now-landing |
| yes | gpt-5.6-sol | ccx | xhigh | saveit-now-landing |

## Notes

- Kimi K3 uses the local `cckimi` Claude Code-compatible harness.
- GPT-5.6 Sol uses `ccx`, the required Claude Code-family route for GPT models.
- The plan runner launches both rows concurrently under one comparison ID.
