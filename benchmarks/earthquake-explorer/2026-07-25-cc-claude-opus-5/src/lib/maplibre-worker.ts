/**
 * MapLibre resolves its worker with a runtime-built `new URL(..., import.meta.url)`,
 * which no bundler can follow: the worker file is never emitted, the request falls
 * through to index.html, and the map hangs before it ever loads a tile.
 *
 * Importing the worker explicitly makes Vite bundle and fingerprint it, so we can
 * hand MapLibre a URL that actually exists in both dev and the production build.
 */
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)
