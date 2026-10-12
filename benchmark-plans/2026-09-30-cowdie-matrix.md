# Benchmark plan: Cursor Claude 5.5 and Codex GPT 6

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-opus-5-5-medium | cursor-agent | medium | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |
| yes | claude-opus-5-5-xhigh | cursor-agent | xhigh | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |
| yes | claude-sonnet-5-5-medium | cursor-agent | medium | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |
| yes | claude-sonnet-5-5-xhigh | cursor-agent | xhigh | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |
| yes | gpt-6.1-sol | codex | medium | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |
| yes | gpt-6.1-sol | codex | xhigh | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |
| yes | gpt-6-astra | codex | medium | 3d-car-crash,simulation-life,gmail-clone,timezone-checker,cowdie,video-generation |

## Notes

42 independent sessions: the initial 35 sessions launched concurrently, followed by seven video-generation sessions in the same comparison group. Cursor effort is encoded in the model ID. Cowdie uses its local v1 prompt with full creative freedom over features and style.

## Launcher recovery

The ten GPT 6.1 Sol sessions were rejected by the globally installed Codex CLI 0.155.1 before implementation. A HARNESS_OK probe succeeded with bundled Codex CLI 0.159.0. These sessions are resumed concurrently using their exact original prompt in iterations/1; the rejected first-attempt evidence is preserved. No model or effort was substituted. Group: `benchmark-20260929T235308Z-b6133e94`.

## Video addition and CLI update

The requested video editing task is resolved to the existing `video-generation` catalog task: the Lumail 45-second launch video, using its exact local v1 prompt. Seven additional sessions share the original benchmark ID. Global `codex` is updated to registry latest 0.159.1; ongoing Sol retries retain the verified bundled 0.159.0 process they started with.

The first three Codex video launches failed before session creation because the global shim pointed at a pnpm shell launcher whose relative paths changed under the shim. The global shim now points directly to the installed 0.159.1 native executable. Three fresh video runs started successfully at 2026-09-29T23:59:09Z, with the same group ID and original canonical prompt. Failed launcher evidence remains intact.

## User-requested fresh Sol restart

All 12 GPT 6.1 Sol tasks (medium and xhigh across six tasks) are relaunched with global Codex CLI 0.159.1 in fresh sessions and empty isolated workspaces. Previous attempts and generated apps are preserved. New attempts live in numbered iterations with their own app paths. The live dashboard uses the latest attempt status, including running attempts, instead of the rejected first launcher status.
