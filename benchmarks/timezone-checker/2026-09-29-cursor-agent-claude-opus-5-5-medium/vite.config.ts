import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT = 9367;

export default defineConfig({
  plugins: [react()],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
});
