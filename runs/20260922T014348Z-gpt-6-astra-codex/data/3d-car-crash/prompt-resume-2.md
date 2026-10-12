Stay on the existing index.html in the current working directory. Do not start over and do not create a second page.

The first automatic crash must still use the mandatory defaults and start by itself on load. After that, the page needs real playback, camera, and experiment controls that actually change the simulation.

1. Pause / Play
Add a visible Pause and Play control. Pause freezes physics and the clock. Play continues from that exact state. Replay still rebuilds a fresh run. Space can toggle pause if it does not steal focus from number inputs.

2. Slow motion
Add a clean speed control with at least 0.25×, 0.5×, 1×, and 2×. It must change the simulation clock, not a CSS trick. The selected speed must survive Replay and settings Apply.

3. Camera views
Add an obvious view switcher: Top, Follow (chase the car), Orbit / free look, and Impact / cinematic. Switching is immediate, does not reset physics, and stays selected across Replay. Keep the bar compact and readable.

4. Settings must apply
Every visible numeric setting must change the next run when the user hits Replay or Apply. If a control is on screen, it is wired — no decorative fields.
Required live controls, even if you have to add the missing ones:
- impact speed
- car mass
- car length, width, height
- wall columns, rows, depth
- brick mass, brick width, height, depth
- gravity
- brick friction, brick restitution
- ground friction
- track length
Changing wall counts or brick size must rebuild the wall. Changing car size or mass must rebuild the car. Changing speed, gravity, or friction must change the next run. Defaults stay the first automatic run.

Do not open a browser. Do not click through the page. Do not run the simulation to test it. Edit index.html only. Keep a single self-contained HTML file.
