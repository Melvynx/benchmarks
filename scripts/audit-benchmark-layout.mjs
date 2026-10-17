import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const benchmarksRoot = path.join(root, "benchmarks");
const datedResult = /^\d{4}-\d{2}-\d{2}-.+/;

// These names are historical evidence from before dated result names became
// mandatory. Renaming them would break the repository's evidence policy.
const legacyYoutubeResults = new Set([
  "cc-kimi-2-5",
  "claude-opus-4-5-claude-code",
  "curosr-gpt-5-2",
  "glm-4-7",
  "glm-4-7-v2",
  "minimax-m2-1",
  "mistral-vibes",
  "yt-thumbnail",
]);

const taskExceptions = new Map([
  ["saveit-now-landing", new Set(["base-repo"])],
  ["thumbfast", new Set(["base-repo"])],
  ["tesla-roadster", new Set(["base-repo"])],
  [
    "openclaw-benchmark",
    new Set(["benchmarks", "results", "src", "package.json", "tsconfig.json"]),
  ],
  ["youtube-thumbnail", legacyYoutubeResults],
]);

// Machine-local and reproducible entries do not affect the published layout.
const ignoredLocalEntries = new Set(["node_modules", "package-lock.json"]);

const tasks = (await readdir(benchmarksRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name));

const violations = [];
let datedResults = 0;
let documentedExceptions = 0;

for (const task of tasks) {
  const taskPath = path.join(benchmarksRoot, task.name);
  const entries = await readdir(taskPath, { withFileTypes: true });
  const allowed = taskExceptions.get(task.name) ?? new Set();

  for (const entry of entries) {
    if (entry.name.startsWith(".") || ignoredLocalEntries.has(entry.name)) {
      continue;
    }

    if (entry.isDirectory() && datedResult.test(entry.name)) {
      datedResults += 1;
      continue;
    }

    if (allowed.has(entry.name)) {
      documentedExceptions += 1;
      continue;
    }

    violations.push(path.relative(root, path.join(taskPath, entry.name)));
  }
}

if (violations.length > 0) {
  console.error("Benchmark layout audit failed. Unexpected task-root entries:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Benchmark layout is clean: ${tasks.length} tasks, ${datedResults} dated results, ${documentedExceptions} documented exceptions.`,
  );
}
