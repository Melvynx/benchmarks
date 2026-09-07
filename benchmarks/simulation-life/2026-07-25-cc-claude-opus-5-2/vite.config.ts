import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 9220, strictPort: true },
  preview: { port: 9220, strictPort: true },
});
