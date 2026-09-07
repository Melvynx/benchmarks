import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 9219, strictPort: true },
  preview: { port: 9219, strictPort: true },
  // MapLibre asks for `new Worker(url, { type: "module" })`, so the worker
  // bundle it is handed has to be an ES module. See src/lib/maplibre-worker.ts.
  worker: { format: "es" },
});
