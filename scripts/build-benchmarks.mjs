import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const benchmarksRoot = join(root, "benchmarks");
const listOnly = process.argv.includes("--list");
const checkOnly = process.argv.includes("--check");
const concurrency = parseConcurrency(
  process.env.BENCHMARK_BUILD_CONCURRENCY || "4",
);

function parseConcurrency(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid BENCHMARK_BUILD_CONCURRENCY: ${value}`);
  }
  return parsed;
}

function repositoryPath(path) {
  return relative(root, path).split("\\").join("/");
}

const DEV_SOURCE = /(?:src|href)=["']([^"']*\/?src\/[^"']+)["']/gi;

function referencedDevSources(html) {
  return [...html.matchAll(DEV_SOURCE)].map((match) =>
    match[1].replace(/^\//, "").split("?")[0],
  );
}

function needsCompiledOutput(directory) {
  const html = readFileSync(join(directory, "index.html"), "utf8");
  return referencedDevSources(html).length > 0;
}

function hasUnbuildableDevSources(directory) {
  const htmlPath = join(directory, "index.html");
  if (!existsSync(htmlPath)) return false;
  const html = readFileSync(htmlPath, "utf8");
  return referencedDevSources(html).some(
    (relative) => !existsSync(join(directory, relative)),
  );
}

function resultIdsByStatus(statuses) {
  const matches = new Set();
  const runsDirectory = join(root, "runs");
  if (!existsSync(runsDirectory)) return matches;

  for (const run of readdirSync(runsDirectory, { withFileTypes: true })) {
    if (!run.isDirectory()) continue;
    const dataDirectory = join(runsDirectory, run.name, "data");
    if (!existsSync(dataDirectory)) continue;

    for (const task of readdirSync(dataDirectory, { withFileTypes: true })) {
      if (!task.isDirectory()) continue;
      const metadataPath = join(dataDirectory, task.name, "metadata.json");
      if (!existsSync(metadataPath)) continue;

      try {
        const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
        if (
          !statuses.has(metadata.status) ||
          typeof metadata.app_path !== "string"
        ) {
          continue;
        }
        matches.add(`${task.name}/${basename(metadata.app_path)}`);
      } catch {
        // Partial historical metadata cannot identify a result reliably.
      }
    }
  }

  return matches;
}

function failedResultIds() {
  return resultIdsByStatus(new Set(["failed"]));
}

function completedResultIds() {
  return resultIdsByStatus(new Set(["harness-verified", "verified"]));
}

function discoverTargets() {
  const targets = [];
  const failed = failedResultIds();
  const completed = completedResultIds();

  for (const task of readdirSync(benchmarksRoot, { withFileTypes: true })) {
    if (!task.isDirectory() || task.name.startsWith(".")) continue;
    const taskDirectory = join(benchmarksRoot, task.name);

    for (const result of readdirSync(taskDirectory, { withFileTypes: true })) {
      if (!result.isDirectory() || result.name.startsWith(".")) continue;
      const directory = join(taskDirectory, result.name);
      const packagePath = join(directory, "package.json");
      const htmlPath = join(directory, "index.html");
      if (!existsSync(packagePath) || !existsSync(htmlPath)) continue;

      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
      if (!packageJson.scripts?.build) continue;

      const id = `${task.name}/${result.name}`;
      if (failed.has(id) || hasUnbuildableDevSources(directory)) continue;
      if (
        needsCompiledOutput(directory) &&
        !existsSync(join(directory, "dist", "index.html")) &&
        !completed.has(id)
      ) {
        continue;
      }

      targets.push({
        directory,
        id,
        needsCompiledOutput: needsCompiledOutput(directory),
        isVite:
          typeof packageJson.dependencies?.vite === "string" ||
          typeof packageJson.devDependencies?.vite === "string",
        hasDependencies:
          Object.keys(packageJson.dependencies || {}).length > 0 ||
          Object.keys(packageJson.devDependencies || {}).length > 0,
      });
    }
  }

  return targets.sort((left, right) => left.id.localeCompare(right.id));
}

function assertServeable(targets) {
  const missing = targets
    .filter(
      (target) =>
        target.needsCompiledOutput &&
        !existsSync(join(target.directory, "dist", "index.html")),
    )
    .map((target) => target.id);

  if (missing.length > 0) {
    throw new Error(
      `Missing compiled preview output:\n${missing.map((id) => `- ${id}`).join("\n")}`,
    );
  }
}

function runPnpm(args, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("pnpm", args, {
      cwd,
      env: { ...process.env, CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `pnpm ${args.join(" ")} failed in ${repositoryPath(cwd)}\n${output}`,
        ),
      );
    });
  });
}

async function installDependencies(target) {
  const packagePath = join(target.directory, "package.json");
  const originalPackage = readFileSync(packagePath, "utf8");
  const packageJson = JSON.parse(originalPackage);
  let substitutedTypeScript = false;

  for (const dependencyGroup of ["dependencies", "devDependencies"]) {
    if (packageJson[dependencyGroup]?.typescript !== "7.0.2") continue;
    packageJson[dependencyGroup].typescript = "6.0.3";
    substitutedTypeScript = true;
  }

  if (substitutedTypeScript) {
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  try {
    await runPnpm(
      [
        "install",
        "--ignore-workspace",
        "--lockfile=false",
        "--prefer-offline",
      ],
      target.directory,
    );
  } finally {
    if (substitutedTypeScript) writeFileSync(packagePath, originalPackage);
  }
}

async function buildTarget(target) {
  const modulesManifest = join(target.directory, "node_modules", ".modules.yaml");
  if (target.hasDependencies && !existsSync(modulesManifest)) {
    await installDependencies(target);
  }

  try {
    await runPnpm(["run", "build"], target.directory);
    console.log(`Built ${target.id}`);
  } catch (buildError) {
    if (!target.needsCompiledOutput || !target.isVite) throw buildError;
    try {
      await runPnpm(
        [
          "exec",
          "vite",
          "build",
          "--config",
          join(root, "scripts", "vite-preview.config.mjs"),
        ],
        target.directory,
      );
      console.log(`Built ${target.id} with the Vite preview fallback`);
    } catch (fallbackError) {
      throw new AggregateError(
        [buildError, fallbackError],
        `Unable to build ${target.id}`,
      );
    }
  }
}

async function runWorkers(targets) {
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < targets.length) {
      const target = targets[nextIndex];
      nextIndex += 1;
      await buildTarget(target);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, worker),
  );
}

const targets = discoverTargets();

if (listOnly) {
  for (const target of targets) console.log(target.id);
  console.log(`${targets.length} buildable benchmark previews.`);
} else if (checkOnly) {
  assertServeable(targets);
  console.log(`${targets.length} benchmark previews are serveable.`);
} else {
  console.log(
    `Building ${targets.length} benchmark previews with concurrency ${concurrency}.`,
  );
  await runWorkers(targets);
  assertServeable(targets);
  console.log(`Built ${targets.length} benchmark previews.`);
}
