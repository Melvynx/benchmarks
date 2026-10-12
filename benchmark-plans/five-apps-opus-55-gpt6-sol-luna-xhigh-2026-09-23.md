# Five apps — Opus 5.5, GPT-6 Sol, GPT-6 Luna, extra high

One-shot comparison: one run per model/task pair, no retries.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-opus-5-5-xhigh | cursor-agent | xhigh | 3d-car-crash,car-crash,timezone-checker,gmail-clone,simulation-life |
| yes | gpt-6-sol | codex | xhigh | 3d-car-crash,car-crash,timezone-checker,gmail-clone,simulation-life |
| yes | gpt-6-luna | codex | xhigh | 3d-car-crash,car-crash,timezone-checker,gmail-clone,simulation-life |

## Notes

- Cursor Agent encodes effort in the model id: `claude-opus-5-5-xhigh` is "Claude Opus 5.5 1M Extra High".
- Codex uses `model_reasoning_effort=xhigh`.
- First plan run with isolated workspaces: each agent runs in `/tmp/workspace.*/app` outside the git repository, so no harness injects the repository `AGENTS.md` and no sibling model output directory is listable. Results are moved into `benchmarks/<task>/<app>` after the harness returns.

## Results

One-shot and every follow-up step are summed. Tokens = processed input (cache included) + output, from each step's transcript usage. Codex usage is cumulative on a resumed thread, so each step is billed as the delta from the previous step. Costs use official API rates from `benchmark-compare/src/lib/model-pricing.ts` (GPT-6 Sol $2/$10, GPT-6 Luna $0.10/$0.50, Claude Opus 5.5 $4/$20 with $0.20 cache reads) and ignore the >272K long-context multiplier. All transcripts parse as JSONL, every step has a session ID and a non-empty final response, and no step referenced a path outside its isolated workspace.

| model | task | one-shot | steps | total time | total tokens | total cost |
|---|---|---|---|---|---|---|
| claude-opus-5-5-xhigh | 3d-car-crash | 79.5m $5.983 | it1 running | 79.5m | 3,563,642 | $5.983 |
| claude-opus-5-5-xhigh | car-crash | 89.7m $8.35 | it1 running | 89.7m | 9,519,650 | $8.35 |
| claude-opus-5-5-xhigh | gmail-clone | 87.1m $16.343 | it1 running | 87.1m | 31,288,115 | $16.343 |
| claude-opus-5-5-xhigh | simulation-life | 98m $16.272 | it1 running | 98m | 29,140,870 | $16.272 |
| claude-opus-5-5-xhigh | timezone-checker | 37m $6.437 | it1 running | 37m | 9,882,380 | $6.437 |
| gpt-6-sol | 3d-car-crash | 9.1m $0.414 | it1 6.2m $0.349 | 15.3m | 841,640 | $0.763 |
| gpt-6-sol | car-crash | 18.9m $1.031 | it1 12.2m $0.985 | 31.1m | 4,730,536 | $2.016 |
| gpt-6-sol | gmail-clone | 26.8m $1.778 | it1 9.8m $1.182 | 36.6m | 8,407,505 | $2.96 |
| gpt-6-sol | simulation-life | 25.2m $1.976 | it1 11.3m $1.341 | 36.5m | 10,429,251 | $3.317 |
| gpt-6-sol | timezone-checker | 14.4m $0.894 | it1 9.5m $1.428 | 23.9m | 6,728,882 | $2.322 |
| gpt-6-luna | 3d-car-crash | 12.3m $0.027 | it1 1.1m $0.004, it2 1.1m $0.004, it3 21.6m $0.067 | 36.1m | 3,177,091 | $0.102 |
| gpt-6-luna | car-crash | 28.1m $0.085 | it1 running | 28.1m | 3,659,966 | $0.085 |
| gpt-6-luna | gmail-clone | 31.4m $0.126 | it1 19.5m $0.114 | 50.9m | 13,598,662 | $0.24 |
| gpt-6-luna | simulation-life | 19.3m $0.052 | it1 18.4m $0.089 | 37.7m | 6,784,388 | $0.141 |
| gpt-6-luna | timezone-checker | 18m $0.058 | it1 3.4m $0.016, it2 17.8m $0.08 | 39.2m | 7,603,546 | $0.154 |

| model | total time | total tokens | total cost |
|---|---|---|---|
| claude-opus-5-5-xhigh | 391.3m | 83,394,657 | $53.38 |
| gpt-6-sol | 143.4m | 31,137,814 | $11.38 |
| gpt-6-luna | 192.0m | 34,823,653 | $0.72 |

The two tables above were written at 09:55, before the Opus finalize passes (it1) and the gpt-6-luna car-crash finalize pass finished. Final totals with every step included:

| model | total time | total cost |
|---|---|---|
| claude-opus-5-5-xhigh | 483.6m | $76.66 |
| gpt-6-sol | 143.4m | $11.38 |
| gpt-6-luna | 241.0m | $0.92 |

The comparison workbench computes the same per-result totals live from `metadata.json` and `iterations/*/metadata.json`.

## Iterations

Follow-ups resume the same session inside its original isolated workspace with `.agents/skills/run-benchmark/scripts/iterate-benchmark-task.sh <data-dir> <prompt-file>` and are stored under `runs/<run-id>/data/<task>/iterations/<n>/`.

- gpt-6-luna · timezone-checker · it1 (fix): one-shot build failed (`Cannot find name 'Users'`, missing `./styles.css` types) and rendered a blank page. After it1 the build passes and the page renders.
- gpt-6-luna · 3d-car-crash · it1, it2 (fix): one-shot froze at ~2.95 s on impact (Rapier aliasing). it1 still froze (`RuntimeError: unreachable` in `createShard`); after it2 the impact completes with no console errors.
- Every run · last iteration (finalize): one identical finalize prompt for all models; 3d-car-crash uses the no-browser variant.

### Fix · gpt-6-luna timezone-checker it1

```text
The app does not work yet. `pnpm build` fails with TypeScript errors, including `Cannot find name 'Users'` in `src/App.tsx` and a missing type declaration for the `./styles.css` side-effect import in `src/main.tsx`. In the browser the page renders blank with `ReferenceError: Users is not defined`.

Fix these problems so `pnpm build` passes and the app renders correctly on port 9170. Dependencies are already installed in `node_modules`. Keep the existing design and features; only fix what is broken.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Run the relevant checks yourself.
```

### Fix · gpt-6-luna 3d-car-crash it1

```text
The crash simulation does not work yet. When the page loads, the car drives into the wall and the simulation clock freezes at about 2.95 s, at the moment of impact; nothing moves afterwards. The browser console reports the Rapier error `recursive use of an object detected which would lead to unsafe aliasing in rust`, which is thrown when the physics world is mutated while it is being stepped or while its contacts or colliders are being iterated.

Fix `index.html` so the impact completes: the car breaks apart, the wall reacts, and the debris settles. Keep the existing design, controls, and mandatory default values.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Implement the fix in one pass. Do not open a browser, do not click through the page, do not run the simulation, and do not iterate after a visual test.
```

### Fix · gpt-6-luna 3d-car-crash it2

```text
The simulation still freezes at about 2.93 s, at the moment of impact. The first error in the browser console is now:

RuntimeError: unreachable
    at wasm-function ...
    at rbTranslation (rapier3d-compat@0.14.0/rapier.es.js)
    at translation (rapier3d-compat@0.14.0/rapier.es.js)
    at createShard (index.html)

After that first panic, every later frame throws `recursive use of an object detected which would lead to unsafe aliasing in rust` from `stepWithEvents` and from `set timestep`, so the physics world never recovers. A Rapier "unreachable" panic from `translation()` usually means the rigid body handle was already removed from the world, or its world was freed, before it was read.

Fix `index.html` so no removed or freed body is ever read, and so the breakup completes: the car breaks apart, the glass shatters into shards, the wall reacts, and the debris settles. Keep the existing design, controls, and mandatory default values.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Implement the fix in one pass. Do not open a browser, do not click through the page, do not run the simulation, and do not iterate after a visual test.
```

### Finalize · all web apps and car-crash

```text
Do one final pass on this project before it ships. Re-read the original requirements, then review the current implementation against them. Fix anything that is missing, broken, incomplete, or only decorative, and optimize performance and polish where it clearly improves the result. Keep everything that already works, and do not start over.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Run the relevant checks yourself.
```

### Finalize · 3d-car-crash

```text
Do one final pass on this page before it ships. Re-read the original requirements, then review the current implementation against them. Fix anything that is missing, broken, incomplete, or only decorative, and optimize performance and polish where it clearly improves the result. Keep everything that already works, and do not start over.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Implement the pass in one shot. Do not open a browser, do not click through the page, do not run the simulation, and do not iterate after a visual test.
```

### Fix · gpt-6-sol 3d-car-crash it2

Requested after review: the car fell apart at spawn, before reaching the wall. Root cause reported by the model: constraint solver force was checked on every step, including settling, wheel contact, and acceleration; bonds now break only from car–brick contact above threshold. it2 took 1.8 min and cost $0.131; gpt-6-sol 3d-car-crash total is now 17.1 min and $0.894, and the gpt-6-sol total is 145.2 min and $11.51.

```text
The car falls apart right at the start. As soon as the page loads, parts detach from the car before it reaches the wall, so it is already in pieces during the approach.

The car must drive down the track fully assembled: body, cabin, glass, doors, hood, bumpers, and wheels stay attached while it accelerates. Constraints may break only when a contact force or impulse from the collision with the wall passes a finite threshold. Nothing may break on spawn, from the initial settling of the bodies, from wheel contact with the track, or from acceleration. Find why the car breaks before impact in `index.html` and fix it, while keeping the full breakup at impact, the existing design, controls, and mandatory default values.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Implement the fix in one pass. Do not open a browser, do not click through the page, do not run the simulation, and do not iterate after a visual test.
```
