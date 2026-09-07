/**
 * Point MapLibre at a worker URL the bundler actually emits.
 *
 * MapLibre v6 derives its worker location at runtime by resolving
 * `./maplibre-gl-worker.mjs` against its own `import.meta.url`. That file only
 * sits next to the library inside `node_modules`; once the library has been
 * bundled the guess resolves to `/node_modules/.vite/deps/…` in dev and
 * `/assets/…` in a build, and neither path exists. The 404 surfaces only as an
 * `error` event on the worker, so the map keeps rendering an empty canvas: no
 * basemap tiles, no earthquake dots, and no console error to explain it.
 *
 * `?worker&url` asks Vite to bundle the worker entry — it pulls in a ~478 kB
 * shared chunk of its own, so copying the single file is not enough — and hand
 * back the URL of the emitted asset. `vite.config.ts` sets `worker.format` to
 * `es` so the output matches the `{ type: "module" }` worker MapLibre asks for.
 *
 * Imported for its side effect before any `Map` is constructed.
 */
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
