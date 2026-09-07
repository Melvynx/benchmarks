import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:9159", viewport: { width: 1440, height: 1000 } },
  reporter: "list",
});
