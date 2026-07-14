# QuakeScope — live seismic observatory

A calm, precise explorer for worldwide earthquake activity, built on live
[USGS Earthquake Hazards Program](https://earthquake.usgs.gov/) real-time GeoJSON feeds
(no API key). It answers, within seconds: what is happening now, where the most
significant events are, whether the current picture is ordinary or notable, and how
activity has changed over the selected period.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9201
```

Other scripts: `pnpm build`, `pnpm preview` (also port 9201), `pnpm typecheck`.

## What's inside

- **Map** — MapLibre GL over a muted CARTO/OSM basemap. Circle size and color encode
  magnitude (redundantly, never color alone); deep events (>300 km) render hollow.
  Graceful non-WebGL fallback keeps the product usable.
- **Seismic timeline (signature interaction)** — every event is a tick on a
  seismograph-style strip with an activity histogram behind it. Dragging a time window
  filters the map and stream; selecting an event anywhere marks its position in time.
  Brush handles are keyboard-operable sliders.
- **Event stream** — windowed list that stays fast at 10k+ events (30-day feed),
  synchronized hover/selection with map and timeline, roving-focus keyboard browsing.
- **Filters** — magnitude, depth band, PAGER alert, tsunami flag, review status,
  event type, place text, and "current map view" as a geographic filter, with active
  count, one-action reset, and honest result counts. Place search flies the map via
  OpenStreetMap Nominatim geocoding.
- **Event detail** — magnitude, local + UTC time, depth, significance, felt reports,
  PAGER alert, tsunami info, review status, coordinates, and a link to the official
  USGS event page, with domain terms explained at the point of need.
- **State** — filters, period, time window, and selection are URL-encoded and
  shareable. Loading, refreshing, stale, offline, API-failure, empty, and
  partial-field states are all designed; background refresh (5 min) never blanks data.

## Trust

Data comes from USGS and may be revised or deleted as events are reviewed. This is an
exploration tool, not an alert service — it never predicts earthquakes or offers safety
guidance; it points to local authorities and the official USGS event pages instead.
