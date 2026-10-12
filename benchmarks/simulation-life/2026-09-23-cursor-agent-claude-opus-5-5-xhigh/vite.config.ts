import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 9348, strictPort: true, host: "127.0.0.1" },
  preview: { port: 9348, strictPort: true, host: "127.0.0.1" },
  build: { chunkSizeWarningLimit: 1100 },
});
