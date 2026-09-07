# Verification

## Passed

The Node runtime executed all nine regression tests in `tests/simulation.test.mjs`, with explicit pass results recorded in `verification/tests.json`.

- Exact seed reproducibility.
- Fruit consumption, eating pauses, delayed regrowth, and fruit caps.
- Finite red contact energy transfer and mandatory rest.
- Energy-conserving reproduction and family identity.
- Both groups surviving 3,600 simulated seconds under the balanced default seed, with changing populations and counts below the safety ceiling.
- Fast early growth in fruit-rich conditions, limited growth in low-fruit conditions.
- Blue decline before red decline in the red-heavy preset.
- Reset restoring the exact initial state.

Recorded independent ten-minute preset runs are in `verification/preset-runs.json`. At 60 seconds, the fruit-rich garden has 80 blues and the low-fruit garden has 12. At 120 seconds the red-heavy garden has no blues and 17 reds; at 180 seconds both groups have faded. These are actual simulation results, not display curves.

The build entrypoint was executed in Node and successfully generated the self-contained `dist/index.html`.

## Blocked, not verified

Portly CLI `status` and `temp` could not reach/launch its app (`kLSNoExecutableErr`). Direct startup of the existing Portly binary exited with SIGABRT. The required port 9160 HTTP probe returned EPERM in the restricted environment. No unmanaged development server was started.

The local Chrome test process also exited with SIGABRT. Computer Use did not approve Portly access and blocked the file URL. Those restrictions were not bypassed. Therefore, browser appearance, responsive rendering, canvas interaction, and HTTP serving on port 9160 are **not verified** in this run.

When the local environment permits it, supervise `pnpm dev` through Portly, open `http://localhost:9160`, and check play/pause, one-second stepping, presets, live sliders, reset, random seed, dragging, blob inspection, both chart tabs, and a narrow viewport.
