#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const shouldSkipCodegen =
  process.env.CONVEX_CODEGEN_SKIP === "1" ||
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  Boolean(process.env.CONVEX_DEPLOY_KEY) ||
  !process.env.CONVEX_DEPLOYMENT;

if (shouldSkipCodegen) {
  console.log("[postinstall] skipping Convex codegen");
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "convex", "codegen"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
