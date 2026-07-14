---
name: verify-earthquake-explorer
description: Launch and verify the live Faultline earthquake explorer in a real browser.
---

1. Start with `pnpm dev` and wait for `http://localhost:9129`.
2. Use `dev-browser --headless` at 1440×1000 and 390×844.
3. Wait about 2 seconds for the live USGS feed, then verify the result heading is populated.
4. Select an event from `.event-row`; confirm `.detail-panel` appears, the map moves, the selected row has `aria-pressed=true`, and the URL gains `event=`.
5. Open Filters, set minimum magnitude to 4.5, and confirm result count and `minMag=4.5` URL state update.
6. Exercise `.scrubber` with keyboard End/Home and confirm the selected event changes across the timeline, list, map, and URL.
7. Probe empty search and use Reset filters to recover.
8. Probe refresh failure with `page.route('**/earthquake.usgs.gov/**', route => route.abort())`; confirm cached events remain and a Retry banner appears.
9. Confirm no horizontal overflow at 390px and 720px widths. Capture desktop map/list and mobile detail screenshots.
