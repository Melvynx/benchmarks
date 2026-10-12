The crash simulation does not work yet. When the page loads, the car drives into the wall and the simulation clock freezes at about 2.95 s, at the moment of impact; nothing moves afterwards. The browser console reports the Rapier error `recursive use of an object detected which would lead to unsafe aliasing in rust`, which is thrown when the physics world is mutated while it is being stepped or while its contacts or colliders are being iterated.

Fix `index.html` so the impact completes: the car breaks apart, the wall reacts, and the debris settles. Keep the existing design, controls, and mandatory default values.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Implement the fix in one pass. Do not open a browser, do not click through the page, do not run the simulation, and do not iterate after a visual test.
