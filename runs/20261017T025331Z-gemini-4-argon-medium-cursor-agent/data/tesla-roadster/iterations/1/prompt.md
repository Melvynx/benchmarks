<instructions>
Generate a single self-contained HTML file that runs directly in a browser.

Recreate Tesla's "The Ramp" stunt from the Roadster reveal as a high-fidelity, full-3D, physics-driven scene. The new Roadster drives up a tall curved ramp, goes past vertical and hangs upside down near the lip on fan downforce, drops off, rolls upright on cold-gas thrusters, brakes its fall with downward jets, and lands on its four wheels at the foot of the ramp.

The `references/` folder contains the original clip, `the-ramp.mp4`, and 24 stills taken from it. `references/README.md` gives the timeline of the stunt and describes each still. Study the frames, and the clip if you can, before you write code. They are the visual and motion target.

Match the footage as closely as you can. In order of importance:

1. The ramp is high quality.
2. The ramp is clearly visible and readable.
3. The car really climbs it.
4. The thrusters and the car's reactions to them work correctly and look right.
5. The car lands normally on its wheels.

The motion must follow real physics. If the stunt goes wrong, the car must break apart.
</instructions>

<ramp>
This is the most important object in the scene. Model it from frames `01`, `02`, `14`, `22`, and `23`.

- One tall freestanding ramp, about 20 m high, standing alone on dark tarmac.
- The running surface starts flat at ground level, curves up smoothly through vertical, and keeps curving into a hook, so the lip faces partly back down. The pitch of the surface at the lip is 115°. From the side, its profile must read as a hook, as in `02` and `23`.
- The curvature must be continuous. No kinks or facets the car could catch on.
- The running surface is concrete grey with subtle stains and wear, a white centre line, and thin glowing red LED strips along both edges for the full length.
- A steel truss structure on the back holds it up: vertical towers, diagonal bracing, and cross members you can read from the side and from above.
- The ramp must read clearly from every camera, even though the scene is dark: the edge strips, the surface, and the truss silhouette must stay visible against the night.
</ramp>

<car>
Model the new Roadster from frames `01`, `13`, `14`, and `21`. It must be recognizable as that car, not a generic sports car.

- Low two-seat wedge, white or pearl-silver body, about 4.5 m long, 2.0 m wide, 1.15 m tall.
- Long dark glass canopy from the windshield almost to the tail, narrowing toward the back.
- Dark lower sills and lower body. Flat aero disc wheels.
- Thin full-width red tail light bar, a `RDSTR` rear plate, a dark rear diffuser with a row of round nozzles.
- Thin full-width front light bar and working headlights.
- Visible thruster nozzles: downward lift nozzles near each corner, side attitude nozzles, and rear nozzles. Every jet must come out of one of them.
- Fans in the floor that produce the downforce. Show them on the underside, which is visible while the car is upside down.
</car>

<stunt>
The default run reproduces the footage, in this order and with this rhythm:

1. The car is stopped at the foot of the ramp (`01`), then accelerates onto it.
2. It climbs the curve, passes vertical, and keeps going until it is upside down near the lip (`03` to `06`).
3. It holds there for about 2 seconds, held to the surface only by fan downforce (`06`, `14`, `22`).
4. It releases from the lip belly-up and falls away from the ramp (`07`, `08`, `15`).
5. Its attitude jets roll it back to wheels-down in the air (`09`, `16`, `21`).
6. Downward jets brake the fall, and it hovers briefly just above the ground (`10`, `17`, `18`).
7. It touches down on all four wheels at the foot of the ramp. The suspension compresses and recovers, and a large white smoke cloud bursts outward (`11`, `19`, `20`).
8. It drives out of the smoke and away (`13`), then comes to a stop.

The run must start by itself on load, with no click.
</stunt>

<physics>
Everything the car does must come out of the physics, not out of keyframes or hand-animated paths.

- The car is a rigid-body system with mass, rotational inertia, and wheels with suspension and tire grip. Use a real 3D rigid-body engine from a CDN, such as Rapier, cannon-es, or ammo.js, or write your own, as long as the motion comes from forces and contacts.
- Gravity, tire traction and drive force, suspension and contact forces on the ramp and the ground, and fan downforce pressing the car onto whatever surface it is driving on.
- On the vertical and inverted parts of the ramp, the car stays on only because downforce and speed keep the tires pressed to the surface. Without enough of either it must slide or fall off.
- Each thruster applies its force at its own nozzle position, so off-centre jets create torque. The roll in the air and the braked descent must come from these forces.
- A flight controller reads the car's state and sets drive throttle, fan power, and each nozzle's thrust to carry out the stunt. It does not set positions or rotations directly.
- Fixed physics timestep with a cap on steps per frame. No randomness in the physics: the same settings give the same result on every replay. Seed any visual randomness, such as smoke.
- Slow motion changes the clock, not the result.
</physics>

<thrusters>
- The jets are cold gas (compressed air), not fire: pale cyan-white, conical, short, fading within a few metres, as in `09`, `16`, `17`, and `21`.
- Each jet's length, opacity, and brightness follow the thrust its nozzle is producing at that instant. A jet that shows must be pushing the car; a nozzle that pushes must show a jet.
- The car's response must match the jets you see: a sideways jet on one side rolls it the right way, downward jets slow the fall.
- Jets near the ground kick up dust and smoke.
</thrusters>

<breakage>
If the stunt goes wrong, the car breaks.

- Build the car from separate parts joined by breakable constraints: at least the front section, the cabin, the rear section, both doors, the hood, both bumpers, the canopy glass (which shatters into shards), and the four wheels.
- A joint breaks when the impact force or impulse on it passes a finite threshold. Do not break parts on a timer or on spawn.
- The default run lands cleanly: nothing breaks.
- A bad run must end in a visible crash: if the car falls off the ramp, hits the ground upside down or on its side, or lands too hard, panels tear off, glass shatters, wheels detach, and the debris collides with the ground, the ramp, and each other, then settles.
- Provide one-click failure scenarios that use the same physics: "Low downforce" (it slides or falls off the ramp), "Thruster failure" (no roll or braking on the way down), and "Too slow" (it cannot reach the lip). Each must end differently, as the physics decides.
</breakage>

<viewing>
The user must be able to look at the run from anywhere, at any speed.

- Camera presets that match the footage: behind the car at the foot of the ramp (`01`), wide side profile of the whole ramp (`02` to `13`), close on the lip (`14` to `20`), drone above the lip looking down (`21`), and high aerial (`23`).
- A Director mode, the default on load, that cuts between those shots like the clip.
- A chase camera that follows the car, and a free orbit camera you can drag, zoom, and pan anywhere around the ramp and the car.
- Switching cameras does not reset the run.
- Pause and Play, Space to toggle unless an input is focused.
- Speed: 0.1×, 0.25×, 0.5×, 1×, 2×. The selected speed persists across replays.
- A timeline scrubber that records the simulated run and lets the user scrub back and forth through it, and resume from the live state.
- Replay rebuilds a fresh run from the current settings.
- A small telemetry readout from the simulation: speed, pitch angle, height above ground, fan downforce in kg, and which thrusters are firing.
</viewing>

<settings>
A settings panel. Every control changes the next run.

- Car mass (default 2,000 kg)
- Maximum fan downforce (default 4,700 kg-force)
- Ramp entry speed or drive power (defaults that complete the stunt)
- Total thruster force
- Gravity (default 9.81 m/s²)

With the defaults the stunt succeeds. Lowering downforce, speed, or thrust far enough must make it fail in a physically believable way. Show no decorative or unwired fields.
</settings>

<scene-and-rendering>
- Night at a rocket test site: deep black sky and surroundings, flat dark tarmac, a few floodlight banks on tall poles, thin red LED strips along the ground, haze. Match the darkness of the references, but keep the ramp and the car readable.
- Three.js from a pinned CDN version. three/addons from the same version are allowed.
- Physically based materials: pearl car paint with clearcoat, dark reflective glass, concrete ramp surface, painted steel truss, rough tarmac.
- Real shadows from the main lights on the car, the ramp, and the debris.
- Bloom on the red strips, the headlights, and the tail light bar.
- Volumetric-looking smoke from soft particles or sprites, lit by the floodlights and tinted by the red strips.
- Tone mapping is required. Generate any environment map in code. Do not load external HDR or texture files.
- Keep the frame rate smooth.
</scene-and-rendering>

<output-format>
One HTML file only. No extra JS, CSS, images, models, or texture files. No package manager and no dev server. Three.js and the physics engine may load from a CDN. Everything else is inline.

Do not load anything from `references/` at runtime. The footage is for study only.

The file must start with `<!DOCTYPE html>` and end with `</html>`.
</output-format>

<important>
- You MUST write the result directly into a file named "index.html" in the current working directory.
- The page `<title>` must be your model name.
- The only visible title or brand in the page must also be your model name. Camera names, settings, and telemetry are allowed. Add nothing else as a title.
- Do not ask clarifying questions. Make the design and engineering decisions yourself.
</important>

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory. Treat it as a standalone project root.

Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Run the relevant checks yourself. Do not edit files outside the current working directory.
