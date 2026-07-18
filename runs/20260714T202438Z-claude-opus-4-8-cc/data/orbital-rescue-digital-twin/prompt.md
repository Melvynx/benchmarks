# Orbital Rescue Digital Twin

## Mission

Build an extraordinary interactive browser experience called **PROJECT JANUS**: a real-time autonomous orbital-rescue digital twin in which a chaser spacecraft must rendezvous with, stabilize, and dock to a disabled tumbling vehicle above Earth.

The finished experience should combine the visual impact of a cinematic space mission, the clarity of a professional flight-control console, and a genuinely coherent simulation. It must not be a decorative animation with numbers pasted on top. The spacecraft motion, sensor state, guidance decisions, failures, safety logic, telemetry, and visible scene must all be driven by the same evolving state.

## Scientific and systems foundation

Implement a credible educational approximation rather than claiming flight certification.

- Propagate relative translation in a target-centered Hill/LVLH frame using the Clohessy-Wiltshire equations or an explicitly identified equivalent linearized circular-orbit model.
- Propagate three-axis attitude and angular velocity with quaternions or another singularity-resistant representation.
- Model pulsed reaction-control thrusters, finite propellant, translation/rotation coupling, actuator saturation, and a visibly inspectable thruster layout.
- Maintain separate truth and estimated states. Fuse deterministic simulated lidar/range, optical bearing, and inertial measurements into a stable navigation estimate. Visualize uncertainty and make sensor dropouts affect it.
- Implement a closed-loop guidance and control state machine with meaningful phases: acquire, far approach, hold point, proximity approach, final corridor, soft capture, hard dock, and abort/safe retreat.
- Enforce a keep-out sphere, an approach corridor, closing-rate limits, alignment limits, and contact conditions. Docking may only succeed when range, closing speed, lateral offset, and angular alignment are all within visible limits.
- Include soft-capture contact response before hard docking. An unsafe impact must bounce or fail instead of magically snapping into place.
- Use a seeded pseudo-random generator for all simulated noise so a reset with the same seed reproduces the same run.

## Three demanding scenarios

Provide one-click scenario selection and reset for:

1. **Nominal rescue** — the target tumbles slowly; autonomous guidance should rendezvous, match attitude, and dock.
2. **Sensor blackout** — optical navigation and lidar drop out during proximity operations; uncertainty must grow, the controller must hold or retreat, and recovery must be visible when measurements return.
3. **Stuck thruster** — one commanded RCS thruster produces no force; fault detection must identify it and the controller must reconfigure or abort without violating the keep-out safety logic.

Also provide controls to inject and clear target tumble, lidar dropout, optical dropout, and a failed thruster at any time.

## Visual world

Create a premium Three.js scene from procedural geometry only.

- Show a richly modeled chaser, a disabled target vehicle, docking ports, RCS jets, solar arrays, antennas, sensors, structural detail, navigation lights, and a believable Earth limb with atmosphere, stars, sunlight, eclipse shading, and slow orbital motion.
- Show selectable visual overlays for the LVLH axes, relative trajectory history, predicted path, keep-out sphere, approach cone/corridor, sensor rays, covariance ellipsoid, velocity vector, thruster plumes, and docking alignment guides.
- Camera modes must include cinematic chase, target-relative, docking-port, cockpit/forward sensor, and free orbit. Camera transitions must be smooth and Reset View must be reliable.
- Use excellent lighting, physically suggestive materials, depth, restrained glow, legible scale cues, and efficient particles. Preserve smooth interaction on ordinary hardware.
- The 3D positions and orientations must come from the simulation state. Do not use a separate canned animation for the mission.

## Flight-control experience

Build a dense but elegant responsive mission-control interface that never buries the main 3D scene.

- Provide Play/Pause, 0.25x/1x/4x time scale, single-step, reset, Auto/Manual control, Abort, scenario selection, camera selection, and overlay toggles.
- Manual mode must provide keyboard and touch-accessible translation and rotation controls with clear control hints.
- Show mission phase, mission elapsed time, range, closing rate, relative position and velocity, attitude error, angular rate, propellant, active sensors, estimator uncertainty, commanded versus achieved thrust, and safety margins.
- Include live scrolling plots for range, closing rate, propellant, attitude error, and navigation uncertainty. Plots must use actual history rather than decorative waves.
- Include an explainable-autonomy log. Each important guidance transition, hold, replan, fault detection, reconfiguration, abort, contact, or dock must state what happened and why in concise language.
- Include a replayable guided tour that focuses the relevant camera or overlay while explaining relative orbital motion, estimation, the approach corridor, attitude matching, fault recovery, and soft capture.
- Make nominal, caution, warning, and abort states instantly distinguishable without relying on color alone. Support keyboard navigation, visible focus, reduced motion, and narrow mobile layouts.

## Deterministic engineering interface

Expose a small documented diagnostic object at `window.__JANUS__` with these callable methods:

- `reset(seed)` — restore a scenario to its initial state using the supplied integer seed;
- `setScenario(name)` — accept `nominal`, `sensor-blackout`, or `stuck-thruster`;
- `step(seconds)` — advance the simulation deterministically without depending on wall-clock frame rate;
- `snapshot()` — return JSON-safe truth, estimate, guidance, actuator, safety, sensor, and mission fields;
- `runSelfTest()` — reset isolated internal test cases and return `{ passed, tests }`, where each test has a name, boolean pass value, and short detail.

The self-test must actually exercise and report at least these invariants:

1. all propagated state values remain finite;
2. pause prevents simulation-time and state advancement;
3. identical seed and control inputs reproduce the same snapshot;
4. propellant never increases during a run;
5. a failed thruster produces no achieved impulse;
6. sensor blackout increases or preserves estimator uncertainty rather than reducing it from imaginary measurements;
7. abort commands create a safe retreat trend;
8. docking is rejected outside the displayed contact limits;
9. nominal soft capture can transition to hard dock when all limits are satisfied.

Show the latest self-test result in a compact in-app diagnostics drawer. Do not hard-code passing results: each result must be derived from the same functions used by the running experience.

## Technical constraints

- Create exactly one complete `index.html` file.
- Put all HTML, CSS, simulation logic, UI logic, plots, shaders, procedural textures, and geometry construction in that file.
- Load Three.js and official Three.js helpers from a CDN. Do not load external images, textures, videos, fonts, model files, data files, APIs, or non-Three.js application libraries.
- The page must open directly in a modern browser without a server or build step.
- Handle resize, high-DPI displays, WebGL failure, context loss where practical, and tab visibility changes gracefully.
- Cap frame delta to avoid physics explosions after a suspended tab. Simulation results must not depend on display refresh rate.
- Avoid fake controls and placeholder panels. Every visible control and plot must work.
- Keep the console free of avoidable errors.

## Quality bar

This should feel like a flagship interactive exhibit built jointly by an orbital-dynamics engineer, a spacecraft GNC engineer, a senior visualization engineer, and an exceptional product designer. Favor a coherent, deeply working system over a collection of disconnected effects, but push the craft, drama, and information design as far as possible.

Build the experience directly. After implementation, run one concise validation pass covering page load, deterministic self-test, scenario switching, pause/step, abort, and the essential camera and overlay controls. Fix blocking failures found by that pass, then stop. Keep the final response brief.

Work only inside the current working directory.

Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Run the relevant checks yourself. Do not edit files outside the current working directory.
