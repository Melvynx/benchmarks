Bug first, then a performance pass. Edit the existing index.html in the current directory. Do not start over.

The car breaks apart immediately when the page loads, before it reaches the wall. Joints or parts separate at spawn. The assembled car must stay intact through the whole approach. Parts may separate only from the impact with the wall. Fix that before anything else.

Then make the scene as fast as you can while the crash stays the same: short track, brick wall, car that visibly breaks on impact, shadows, and physically based materials. The default crash must still play by itself on load.

Cut per-frame cost hard:
- fewer physics bodies, constraints, and collision pairs
- fewer shadow casters and a cheaper shadow setup that still reads
- fewer lights, materials, and draw calls
- drop or cheapen postprocessing that does not change the crash
- keep the simulation stable at a high frame rate

Do not remove the breakup, the wall collapse, or the contact shadows. Do not open a browser. Do not click through the page. Stop when the spawn bug is fixed and the file is faster.
