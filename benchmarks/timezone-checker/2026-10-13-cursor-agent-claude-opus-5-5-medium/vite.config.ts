import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const PORT = 9383;

export default defineConfig({
  plugins: [react()],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
});
