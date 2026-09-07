import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const PORT = 9215;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
});
