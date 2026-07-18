# The Last Signal

## Mission

Create a short interactive visual story titled **The Last Signal**. It should feel like a complete miniature film that can only exist in a browser: authored composition, recurring visual motifs, expressive transitions, environmental animation, restrained interaction, and two meaningful endings.

Do not build a conventional article, slideshow, landing page, or collection of cards. The experience should unfold as one continuous visual world.

## Fixed story spine

Use this exact narrative foundation so every version tells the same essential story:

### Act I — The receiver

A lone night operator maintains an abandoned listening station during a violent storm. At 02:17, a receiver that has been silent for thirty years begins to glow.

Required line: **“At 02:17, the dead receiver began to glow.”**

### Act II — The message

The signal arrives as three unstable fragments. The viewer must directly interact to bring the fragments into alignment. When they resolve, they reveal:

Required message: **“WE REMEMBER YOUR SKY.”**

The interaction must alter the same visual system driving the scene. It must not be a decorative button followed by a canned result.

### Act III — The choice

The operator must choose between:

- **ANSWER** — transmit a reply into the storm;
- **STAY SILENT** — let the signal fade without responding.

Build a distinct, visually complete ending for each choice. Neither ending should be presented as simply correct or wrong.

## Narrative and visual requirements

- Establish a recurring protagonist or protagonist silhouette, the listening station, the storm, the receiver, and one visual motif that evolves across all three acts.
- Use camera-like composition, staging, light, depth, typography, and transition timing to create an emotional arc.
- Keep prose sparse. Let animation, soundless rhythm, interaction, and visual transformation carry the story.
- Include a clear beginning, rising tension, reveal, decision, and aftermath.
- Make the complete first viewing last roughly 60 to 120 seconds without forcing slow reading.
- Allow replay from the beginning and allow the alternate ending to be explored.
- Provide a subtle progress indication without making the experience feel like a presentation deck.
- Support Space/Enter, pointer, touch, and keyboard navigation where relevant.
- Adapt to desktop and narrow mobile screens.
- Respect `prefers-reduced-motion` while preserving the narrative.
- Keep the console free of avoidable errors.

Choose the rendering approach and art direction yourself. You may use HTML, CSS, SVG, Canvas 2D, WebGL, or a combination. Take a clear visual position and avoid generic cinematic sci-fi dashboards, interchangeable gradients, or stock interface layouts.

## Determinism

The story, environmental variation, fragment alignment, transitions, and endings must be reproducible from a supplied seed and explicit actions. Animation timing must not depend on display refresh rate.

Include a deterministic autoplay mode that traverses the story using the real scene and interaction systems. It must be possible to select which ending autoplay chooses.

## Deterministic interface

Expose `window.__LAST_SIGNAL__` with callable methods:

- `reset(seed)` — return to the beginning with the supplied integer seed;
- `setAutoplay(enabled, ending)` — toggle autoplay and accept `answer` or `silent` as its ending;
- `seek(milliseconds)` — seek the current act to an exact deterministic time where meaningful;
- `alignFragment(index, value)` — drive the real fragment-alignment interaction;
- `choose(ending)` — accept `answer` or `silent` when the choice is available;
- `snapshot()` — return a JSON-safe summary containing seed, act, act time, fragment state, choice availability, selected ending, and completion state;
- `runSelfTest()` — exercise the real story state and return `{ passed, tests }`.

The self-test must at least verify deterministic reset, ordered act progression, fragment gating, both reachable endings, replay, autoplay, and finite numeric state.

## Technical constraints

- Create exactly one complete `index.html` file.
- Put all markup, styles, rendering, animation, interaction, and logic in that file.
- Do not load external libraries, fonts, images, videos, audio, APIs, or other network assets.
- Use only application-generated graphics and system fonts.
- The file must open directly in a modern browser without a server or build step.
- Use a seeded pseudo-random generator for every meaningful variation.
- Cap frame deltas and handle tab visibility changes without skipping narrative state.
- Every visible control must work.

## Quality bar

The result should feel like a motion designer, illustrator, filmmaker, creative coder, and interaction designer collaborated on one precise emotional experience. The viewer should remember an image or transition from it after the page closes.

Build the story directly without explaining the design first. Run one concise validation pass, fix blocking failures, and keep the final response brief.

Work only inside the current working directory.

Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Run the relevant checks yourself. Do not edit files outside the current working directory.
