import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { port: 9354, strictPort: true, host: "127.0.0.1" },
  preview: { port: 9354, strictPort: true, host: "127.0.0.1" },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: true,
    testTimeout: 15000,
  },
});
