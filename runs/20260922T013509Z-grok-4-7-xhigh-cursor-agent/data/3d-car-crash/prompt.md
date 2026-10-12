<instructions>
Generate a single self-contained HTML file that runs directly in a browser.

Build a cinematic full-3D car crash. A recognizable car accelerates down a short asphalt race track and hits a freestanding brick wall. The wall is made of individual 3D bricks. The car is made of separate physical parts. On impact the car must break apart in a way you can actually see: panels tear off, glass shatters, wheels detach, the front crumples, and debris keeps moving under 3D rigid-body physics. This is a simulation, not a scripted animation.
</instructions>

<core-experience>
The page is one fullscreen 3D scene.

- A short straight race track, about 40 meters, with the car starting on the left.
- A freestanding brick wall standing across the track near the far end.
- The default crash starts by itself as soon as the page loads. Do not require a click, a Test button, or any other interaction before the car reaches the wall and breaks.
- After the debris settles, the scene holds on the wreck. A Replay control may restart the same default crash, but the first view must already show the full impact.
- A small settings panel may change the parameters below. Changing a value and replaying must rerun the physics with those values. The first automatic run must use the mandatory defaults exactly.

The result should feel like a real 3D physics experiment filmed with a good camera, not a game cutscene with canned part trajectories.
</core-experience>

<default-experiment-values>
These defaults are mandatory. They must be the initial values on first load so every implementation runs the same baseline crash.

- Car speed at impact target: 22 m/s
- Car mass, assembled: 1,250 kg
- Car length: 4.2 m
- Car width: 1.8 m
- Car height: 1.45 m
- Wall columns: 12 bricks across the track
- Wall rows: 8 bricks tall
- Wall depth: 2 bricks thick
- Brick mass: 2.5 kg
- Brick size: 0.50 m wide x 0.24 m tall x 0.20 m deep
- Gravity: 9.81 m/s2
- Brick friction: 0.72
- Brick restitution: 0.18
- Ground friction: 0.85
- Track length: 40 m
</default-experiment-values>

<track-and-wall>
The track is a short race straight, not an empty ground plane.

- Asphalt with lane markings, a start area, curbs, and grass or gravel shoulders so scale reads immediately.
- The wall stands on the track, freestanding, not embedded in an invisible collider.
- Bricks use a staggered running bond. Mortar gaps are visible. Both depth layers are real separate bricks, not a texture on a box.
- Bricks are individual rigid bodies with mass, friction, gravity, contact, rotation, and momentum transfer.
- The wall may crack, slide, topple, or partially survive. Heavier bricks and lower speed must visibly change the outcome.
- Add enough environment to read the crash: sky, horizon, a few trackside barriers or lights. Do not hide the car or the wall.
</track-and-wall>

<car-destruction>
The car must be built from separate 3D rigid bodies held together by breakable constraints. A single box with a particle puff is not acceptable.

Required parts, each simulated:

- Chassis, split so the front clip can crumple or detach from the cabin
- Hood
- Trunk lid
- Four doors, or at least both front doors and one rear door
- Front and rear bumpers
- Windshield and side glass, which shatter into multiple shard bodies
- Four wheels with visible rims and tires

Before impact the car must read as a car: body, cabin, glass, wheels, headlights, and a clear front. Parts stay attached while it drives.

On impact with the wall:

- Constraints break when the contact force or impulse passes a finite threshold. Do not detach every part on a timer.
- The hood buckles or flips. Bumpers separate. Doors swing or tear off. Wheels can detach and roll. Glass becomes shards with their own collisions.
- The front of the car shortens, folds, or breaks into segments so the crumple is obvious from the camera.
- The cabin may deform but should remain recognizable.
- Detached parts collide with the car, the bricks, the ground, and each other, then settle under gravity and friction.
- The car must not tunnel through the wall. Momentum has to move into both the bricks and the broken car parts.

Use a real 3D rigid-body engine loaded from a CDN, such as Rapier, cannon-es, or ammo.js. Do not fake the crash with keyframed part positions.
</car-destruction>

<rendering>
Push the lighting and materials as far as a single HTML file allows. Flat unlit colors on the car, bricks, or track are not acceptable.

- Three.js, loaded from a pinned CDN version. three/addons from that same version are allowed.
- Physically based materials: car paint with metalness and clearcoat, glass with transmission or a convincing refractive look, rough bricks with color variation, rough asphalt.
- A real shadow map on the sun light. Use soft PCF shadows, a shadow map of at least 2048, and a frustum tight on the track, car, and wall. The car, every broken part, and the bricks must cast and receive shadows, including after they scatter.
- Contact shadows or screen-space ambient occlusion so parts sit on the ground.
- Image-based or environment reflections on the paint and glass. Generate the environment in code or with Three.js RoomEnvironment. Do not depend on an external HDR file.
- A restrained post stack is welcome when it stays smooth: ACES or filmic tone mapping, a little bloom on headlights and sparks, and mild ambient occlusion.
- Impact feedback that does not replace the physics: dust, a few sparks, brief camera shake, skid marks. Seed any visual randomness so it cannot change the physical result.
</rendering>

<camera>
- Start on a cinematic three-quarter view that shows the whole car, the track, and the wall.
- Follow the car through the approach and hold a readable view of the impact and the breakup.
- After the wreck settles, orbit or a slow hold is fine. Free orbit may be available, but the crash must be understandable with no interaction.
- Keep the car and the collapsing wall inside the frame at the moment of impact.
</camera>

<determinism>
- Use the mandatory default values exactly on first load.
- Fixed physics timestep. No Math.random in the physical setup, constraints, or collision response.
- The same defaults must produce the same physical outcome on reload and on Replay.
- Do not precompute brick or panel positions for the crash.
</determinism>

<delivery>
Write the finished page in one shot.

- Do not open a browser.
- Do not click the page.
- Do not run the simulation to visually test it.
- Do not iterate after a preview.
- Reason through the body layout, the breakable constraints, the shadow setup, and the materials once, then write the complete file.
</delivery>

<output-format>
One HTML file only. No extra JS, CSS, images, models, or texture files. No package manager and no dev server. Three.js and the physics engine may load from a CDN. Everything else is inline.

The file must start with `<!DOCTYPE html>` and end with `</html>`.
</output-format>

<important>
- You MUST write the result directly into a file named "index.html" in the current working directory.
- The page `<title>` must be your model name.
- The only visible title or brand in the page must also be your model name. Add nothing else to either title.
- Do not ask clarifying questions. Make the design and engineering decisions yourself.
</important>

Work only inside the current working directory. Do not edit files outside the current working directory.

Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Implement the complete file in one shot. Do not open a browser, do not click through the page, do not run the simulation, and do not iterate after a visual test. Reason carefully once, then write the finished file. Do not edit files outside the current working directory.
