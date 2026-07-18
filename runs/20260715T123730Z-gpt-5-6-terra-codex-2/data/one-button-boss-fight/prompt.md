# One-Button Boss Fight

## Mission

Create a complete, highly polished one-screen boss fight that is controlled with exactly one gameplay action.

The player faces an original boss in a visually distinctive arena. The encounter must be immediately understandable, genuinely playable, and satisfying to watch. Its quality should come from strong art direction, readable anticipation, expressive animation, timing, impact, and game feel—not from a large feature list.

## One-button rule

The same action must be available through Space, pointer click, and touch. That single action may parry, pulse, dash, jump, switch polarity, or perform another mechanic you invent, but it must remain one coherent action for the entire fight.

Movement may be automatic or derived from the mechanic. Do not add hidden secondary gameplay controls. Pause, Restart, mute, and accessibility controls do not count as gameplay actions.

## Encounter structure

Create one encounter lasting roughly 45 to 75 seconds for a successful run.

It must include:

- a clear player character or player-controlled entity;
- an original boss with a memorable silhouette and personality;
- three mechanically and visually distinct phases;
- readable telegraphs before every damaging attack;
- a health, stability, or progress system for both sides;
- a success state and a failure state;
- instant restart;
- a deterministic attract/demo mode that can complete a representative run without human input.

The three phases must evolve the one-button mechanic rather than merely increasing speed. A first-time player should learn through play, not through a wall of instructions.

## Game feel

Make every important action feel physical and consequential. Use animation principles and feedback such as anticipation, follow-through, hit-stop, recoil, squash and stretch, particles, trails, brief camera motion, arena reaction, layered flashes, or procedural sound where appropriate. Effects must preserve gameplay readability and respect reduced-motion preferences.

The arena, characters, attacks, interface, transitions, and effects must share one strong original visual direction. Avoid placeholder circles firing generic bullets unless they are transformed into a deliberate and beautiful graphic language.

## Fairness and determinism

- Use a seeded pseudo-random generator for attack selection and procedural visuals.
- The same seed and input timings must produce the same meaningful gameplay result.
- Base simulation on a fixed timestep or deterministic event schedule, not display refresh rate.
- Prevent unavoidable damage and obvious collision inconsistencies.
- Pause must stop simulation time.
- Attract mode must use the real gameplay systems, not a separate canned animation.

## Experience requirements

- Show a concise one-line instruction before play.
- Include Start, Pause, Restart, and Demo controls.
- Display boss and player progress clearly without covering the arena.
- Support keyboard, mouse, and touch.
- Adapt cleanly to desktop and narrow mobile screens.
- Provide visible focus states and a `prefers-reduced-motion` mode.
- Keep the console free of avoidable errors.

## Deterministic interface

Expose `window.__BOSS_FIGHT__` with callable methods:

- `reset(seed)` — restore the encounter with the supplied integer seed;
- `start()` — start normal play;
- `setDemo(enabled)` — enable or disable deterministic attract mode;
- `press()` — perform the single gameplay action;
- `step(milliseconds)` — advance the actual simulation deterministically;
- `snapshot()` — return a JSON-safe summary containing simulation time, phase, player state, boss state, active attacks, score or combo state, and outcome;
- `runSelfTest()` — run isolated checks through the real game systems and return `{ passed, tests }`.

The self-test must at least verify deterministic reset, pause behavior, phase progression, finite numeric state, reachable success/failure states, restart, and that Demo uses the normal gameplay state.

## Technical constraints

- Create exactly one complete `index.html` file.
- Put all HTML, CSS, rendering, gameplay, animation, and optional procedural audio in that file.
- Use browser-native HTML, CSS, SVG, Canvas, WebGL, and Web Audio only.
- Do not load external libraries, fonts, images, model files, audio files, APIs, or other assets.
- The file must open directly in a modern browser without a server or build step.
- Handle high-DPI rendering, resize, tab visibility changes, and capped frame deltas.
- Every visible control must work.

## Quality bar

The finished result should feel like a tiny festival-quality game: easy to understand, hard to fake, exciting in motion, and full of authored details. A viewer should recognize the boss, understand the danger, and feel the impact of the one-button action within a few seconds.

Choose one strong concept and implement it completely. Run one concise validation pass, fix blocking failures, and keep the final response brief.

Work only inside the current working directory.

Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Run the relevant checks yourself. Do not edit files outside the current working directory.
