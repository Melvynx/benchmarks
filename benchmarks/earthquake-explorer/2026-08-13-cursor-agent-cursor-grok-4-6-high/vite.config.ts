import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9302,
    strictPort: true,
    host: "127.0.0.1",
  },
  preview: {
    port: 9302,
    strictPort: true,
    host: "127.0.0.1",
  },
  test: {
    environment: "node",
  },
});
