import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const PORT = 9234;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
