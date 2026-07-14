# Benchmark Task Catalog

Canonical names are stable CLI identifiers. Historical directories remain unchanged. Resolve every listed slug under `${CODE_MELVYNX_REPO:-$HOME/Developer/saas/code.melvynx.dev}/content/prompts/<slug>/` and select its numerically highest `v<number>.md` locally.

| Task | Type | Seed | Benchmark wording |
|---|---|---|---|
| `3d-sponge-bob` | standalone HTML/WebGL | empty | Canonical: `https://code.melvynx.dev/prompts/spongebob-3d-world-threejs` |
| `bouncing-ball` | standalone HTML/canvas | empty | Canonical: `https://code.melvynx.dev/prompts/bouncing-ball-polygon` |
| `car-crash` | standalone HTML/canvas | empty | Canonical: `https://code.melvynx.dev/prompts/car-brick-wall-crash` |
| `earthquake-explorer` | package web app | empty | Canonical: `https://code.melvynx.dev/prompts/earthquake-explorer` |
| `elysian-taste-challenge` | standalone HTML | empty | Canonical: `https://code.melvynx.dev/prompts/elysian-taste-challenge` |
| `figma-clone` | package web app | empty | Canonical: `https://code.melvynx.dev/prompts/mini-figma-clone` |
| `rocket-launch` | standalone HTML/3D | empty | Canonical: `https://code.melvynx.dev/prompts/rocket-launch-animation` |
| `simulation-life` | web app | empty | Canonical: `https://code.melvynx.dev/prompts/ecosystem-evolution-simulator` |
| `thumbfast` | cloned SaaS app | `thumbfast/base-repo` | Canonical: `https://code.melvynx.dev/prompts/thumbfast-drawing-inspiration-editor` |
| `timezone-checker` | package web app | empty | Canonical: `https://code.melvynx.dev/prompts/timezone-checker` |
| `youtube-thumbnail` | package web app | empty | Canonical: `https://code.melvynx.dev/prompts/youtube-thumbnail-generator` |
| `openclaw-benchmark` | CLI evaluation suite | `openclaw-benchmark` | Run or extend the existing OpenClaw CLI benchmark suite; this is not a generated web app and has no port. |

## Type rules

- `standalone HTML/*`: create an entry HTML file with inline or local assets; no dev server or port.
- `package web app` and `web app`: create a self-contained app in the task `app/` directory and bind its dev/preview server to the assigned port.
- `cloned SaaS app`: copy the seed into `app/`, preserve repository instructions, and use the assigned port.
- `CLI evaluation suite`: copy the seed into `app/`, run its documented command, and do not allocate a port.

Every task prompt also requires the agent to work only inside its assigned `app/` directory, use pnpm exclusively if dependency installation or package scripts are needed (never npm), run its own checks, and finish its final response with `BENCHMARK_COMPLETE`. Every non-standalone task must configure and verify its assigned setup port.
