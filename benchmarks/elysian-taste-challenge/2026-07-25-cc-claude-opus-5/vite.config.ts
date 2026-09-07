import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    target: "es2020",
    assetsInlineLimit: 2048,
  },
});
