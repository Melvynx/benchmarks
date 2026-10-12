Performance pass on the existing index.html in the current directory. Do not start over and do not create a second page.

Make this scene as fast as you can while the crash stays the same: short track, brick wall, car that visibly breaks on impact, shadows, and physically based materials. The default crash must still play by itself on load.

Cut per-frame cost hard:
- fewer physics bodies, constraints, and collision pairs
- fewer shadow casters and a cheaper shadow setup that still reads
- fewer lights, materials, and draw calls
- drop or cheapen postprocessing that does not change the crash
- keep the simulation stable at a high frame rate

Do not remove the breakup, the wall collapse, or the contact shadows. Do not open a browser. Do not click through the page. Edit index.html directly. Stop when the file is faster and still complete.
