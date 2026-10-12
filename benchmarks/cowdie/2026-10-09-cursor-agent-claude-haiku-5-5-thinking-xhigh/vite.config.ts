import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 9373,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 9373,
    strictPort: true,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
  },
});
