import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 9382, strictPort: true, host: "127.0.0.1" },
  preview: { port: 9382, strictPort: true, host: "127.0.0.1" },
  build: { chunkSizeWarningLimit: 1200 },
  test: { include: ["tests/**/*.test.ts"], environment: "node", testTimeout: 60_000 },
});
