# Benchmark plan: Tesla Roadster "The Ramp" (prompt v2)

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-opus-5-5 | cc | medium | tesla-roadster |
| yes | claude-opus-5-5 | cc | xhigh | tesla-roadster |
| yes | gpt-6.1-sol | codex | medium | tesla-roadster |
| yes | gpt-6.1-sol | codex | xhigh | tesla-roadster |
| yes | gemini-4-argon-medium | cursor-agent | medium | tesla-roadster |
| yes | gemini-4-argon-high | cursor-agent | high | tesla-roadster |
| yes | muse-wonder-full-1.0 | muse | medium | tesla-roadster |
| yes | muse-wonder-full-1.0 | muse | xhigh | tesla-roadster |

## Notes

Requested 2026-10-17, replacing the stopped v1 plan (`2026-10-17-tesla-roadster.md`). Prompt `prompts/tesla-roadster-stunt-show/v2.md` keeps only Tesla's "The Ramp" clip (https://www.youtube.com/watch?v=7p5LxFdc-Qg): high-fidelity ramp, real physics, working thrusters, clean landing, and a car built from breakable parts that comes apart when a run fails. User priorities, in order: ramp quality, ramp visibility, the climb, the thrusters and the car's reactions, a normal landing.

The seed `benchmarks/tesla-roadster/base-repo/references/` now holds the 1080p clip `the-ramp.mp4` and 24 stills from it (1280 px), indexed in its `README.md`. The v1 kickflip and launch frames were moved to the trash; v1 runs keep their own copies in their app directories.

Gemini 4 Argon has no extra high tier in any installed harness; the top Argon lane is `gemini-4-argon-high`. Opus 5.5 runs through Claude Code (`cc`).
