import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 9384, strictPort: true, host: true },
  preview: { port: 9384, strictPort: true },
});
