import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: {
    jsx: "automatic",
  },
  server: {
    host: "127.0.0.1",
    port: 9153,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 9153,
    strictPort: true,
  },
});
