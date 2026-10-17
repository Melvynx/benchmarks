# Benchmark Task Catalog

Canonical names are stable CLI identifiers. Historical directories remain unchanged. Resolve every listed slug under the repository-owned `prompts/<slug>/` catalog and select its numerically highest `v<number>.md` locally.

| Task | Type | Seed | Benchmark wording |
|---|---|---|---|
| `video-generation` | standalone HTML/MP4 player | empty | Canonical: `https://benchmark.melvynx.dev/prompts/video-generation` |
| `3d-sponge-bob` | standalone HTML/WebGL | empty | Canonical: `https://benchmark.melvynx.dev/prompts/spongebob-3d-world-threejs` |
| `3d-car-crash` | standalone HTML/Three.js | empty | Canonical: `https://benchmark.melvynx.dev/prompts/3d-car-crash` |
| `air-conditioning-understanding` | standalone HTML/Three.js | empty | Canonical: `https://benchmark.melvynx.dev/prompts/threejs-air-conditioning-understanding` |
| `bouncing-ball` | standalone HTML/canvas | empty | Canonical: `https://benchmark.melvynx.dev/prompts/bouncing-ball-polygon` |
| `car-crash` | standalone HTML/canvas | empty | Canonical: `https://benchmark.melvynx.dev/prompts/car-brick-wall-crash` |
| `cowdie` | package web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/cowdie` |
| `distributed-systems-playground` | standalone HTML/canvas | empty | Canonical: `https://benchmark.melvynx.dev/prompts/distributed-systems-playground` |
| `earthquake-explorer` | package web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/earthquake-explorer` |
| `elysian-taste-challenge` | standalone HTML | empty | Canonical: `https://benchmark.melvynx.dev/prompts/elysian-taste-challenge` |
| `figma-clone` | package web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/mini-figma-clone` |
| `gmail-clone` | package web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/gmail-clone` |
| `lava-lamp-3d` | standalone HTML/Three.js | empty | Canonical: `https://benchmark.melvynx.dev/prompts/lava-lamp-3d` |
| `little-red-riding-hood-film` | standalone HTML/illustrated film | empty | Canonical: `https://benchmark.melvynx.dev/prompts/little-red-riding-hood-film` |
| `living-identity-system` | standalone HTML/creative coding | empty | Canonical: `https://benchmark.melvynx.dev/prompts/living-identity-system` |
| `one-button-boss-fight` | standalone HTML/game | empty | Canonical: `https://benchmark.melvynx.dev/prompts/one-button-boss-fight` |
| `orbital-rescue-digital-twin` | standalone HTML/Three.js | empty | Canonical: `https://benchmark.melvynx.dev/prompts/orbital-rescue-digital-twin` |
| `pentest` | standalone HTML/security report | empty | Canonical: `https://benchmark.melvynx.dev/prompts/pentest` |
| `rocket-launch` | standalone HTML/3D | empty | Canonical: `https://benchmark.melvynx.dev/prompts/rocket-launch-animation` |
| `saveit-now-landing` | cloned SaaS landing page | `benchmarks/saveit-now-landing/base-repo` | Canonical: `https://benchmark.melvynx.dev/prompts/saveit-now-landing` |
| `simulation-life` | web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/ecosystem-evolution-simulator` |
| `thumbfast` | cloned SaaS app | `benchmarks/thumbfast/base-repo` | Canonical: `https://benchmark.melvynx.dev/prompts/thumbfast-drawing-inspiration-editor` |
| `tesla-roadster` | standalone HTML/Three.js | `benchmarks/tesla-roadster/base-repo` (reference clip and frames) | Canonical: `https://benchmark.melvynx.dev/prompts/tesla-roadster-stunt-show` |
| `the-last-signal` | standalone HTML/interactive story | empty | Canonical: `https://benchmark.melvynx.dev/prompts/the-last-signal` |
| `timezone-checker` | package web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/timezone-checker` |
| `youtube-thumbnail` | package web app | empty | Canonical: `https://benchmark.melvynx.dev/prompts/youtube-thumbnail-generator` |
| `openclaw-benchmark` | CLI evaluation suite | `benchmarks/openclaw-benchmark` | Run or extend the existing OpenClaw CLI benchmark suite; this is not a generated web app and has no port. |

## Type rules

- `standalone HTML/*`: create an entry HTML file with inline or local assets; no dev server or port.
- `package web app` and `web app`: create a self-contained app in the task `app/` directory and bind its dev/preview server to the assigned port.
- `tesla-roadster`: copy the seed's `references/` clip and frames into the working directory; the deliverable is still one standalone `index.html` with no port.
- `cloned SaaS app`: copy the seed into `app/`, preserve repository instructions, and use the assigned port.
- `CLI evaluation suite`: copy the seed into `app/`, run its documented command, and do not allocate a port.

Every task prompt also requires the agent to work only inside its current working directory, use pnpm exclusively if dependency installation or package scripts are needed (never npm), and run its own checks. Every non-CLI task must use its model name, based only on identity information already available to it, as both the browser title and primary visible title with no additional title text. Every non-standalone task must configure and verify its assigned setup port. The runner proves completion from the captured final response without exposing benchmark language or a completion sentinel to the model.
