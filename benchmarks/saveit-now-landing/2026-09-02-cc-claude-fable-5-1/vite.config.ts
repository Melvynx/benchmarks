import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const PORT = 9225;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
  },
});
