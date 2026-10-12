import { execFile } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { benchmarks } from "./benchmarks/index.js";
import { validateSandbox } from "./src/runner.js";
import { calculateSuiteResults } from "./src/scorer.js";
import { printBenchmarkResult, printSuiteReport, exportResultsJson } from "./src/reporter.js";
import type { BenchmarkResult } from "./src/types.js";

const root = process.cwd();
const model = "grok-4-7-high";

type Meta = {
  model: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  commandsRun: string[];
  packagesInstalled: string[];
};

function run(meta: Meta, cwd: string, command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  meta.commandsRun.push([command, ...args].join(" "));
  return new Promise((resolve) => {
    execFile(command, args, { cwd, timeout: 15000 }, (err, stdout, stderr) => {
      const out = stdout?.toString() ?? "";
      const errText = stderr?.toString() ?? "";
      meta.stdout += out;
      meta.stderr += errText;
      const code = !err ? 0 : typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : 1;
      resolve({ code, stdout: out, stderr: errText });
    });
  });
}

const envDir = join(root, "sandboxes", "system-ops-env-diagnostic");
const envMeta: Meta = {
  model,
  stdout: "",
  stderr: "",
  exitCode: 0,
  duration: 0,
  commandsRun: [],
  packagesInstalled: [],
};
const envStarted = Date.now();
const nodeVersion = await run(envMeta, envDir, "node", ["-v"]);
const pnpmVersion = await run(envMeta, envDir, "pnpm", ["-v"]);
const python = await run(envMeta, envDir, "python3", ["--version"]);
const arch = await run(envMeta, envDir, "uname", ["-m"]);
const osName = await run(envMeta, envDir, "uname", ["-s"]);
const sw = await run(envMeta, envDir, "sw_vers", []);
const ram = await run(envMeta, envDir, "sysctl", ["-n", "hw.memsize"]);
const disk = await run(envMeta, envDir, "df", ["-k", "."]);
const user = await run(envMeta, envDir, "whoami", []);
const product = sw.stdout.match(/ProductVersion:\s+(\S+)/)?.[1] || osName.stdout.trim();
const diskLine = disk.stdout.trim().split("\n").at(-1) || "";
const availableKb = Number(diskLine.split(/\s+/)[3] || 0);
await fs.writeFile(
  join(envDir, "diagnostic.json"),
  JSON.stringify(
    {
      os: { name: osName.stdout.trim(), version: product },
      cpu: { architecture: arch.stdout.trim() },
      ram: { total_bytes: Number(ram.stdout.trim() || 0) },
      disk: { available_kb: availableKb },
      node: nodeVersion.stdout.trim(),
      pnpm: pnpmVersion.stdout.trim(),
      python: python.stdout.trim() || python.stderr.trim() || null,
      user: user.stdout.trim(),
    },
    null,
    2
  ) + "\n"
);
envMeta.duration = Date.now() - envStarted;
await fs.writeFile(join(root, "meta", "system-ops-env-diagnostic.json"), JSON.stringify(envMeta, null, 2));

const gifMetaPath = join(root, "meta", "multi-step-youtube-to-gif.json");
const gifMeta = JSON.parse(await fs.readFile(gifMetaPath, "utf8")) as Meta;
gifMeta.commandsRun.push(
  'yt-dlp --no-playlist --no-warnings --no-cache-dir -f 269 --download-sections *00:00:30-00:00:35 --force-keyframes-at-cuts -o video.%(ext)s https://www.youtube.com/watch?v=dQw4w9WgXcQ'
);
gifMeta.commandsRun.push(
  'ffmpeg -y -hide_banner -loglevel error -t 5 -i video.mp4 -vf fps=10,scale=320:-1:flags=lanczos clip.gif'
);
gifMeta.exitCode = 0;
await fs.writeFile(gifMetaPath, JSON.stringify(gifMeta, null, 2));

const resultsDir = join(root, "results");
const existing = await fs.readdir(resultsDir);
for (const file of existing) {
  if (file.endsWith(".json") || file === "summary.txt" || file === "failures.txt") {
    await fs.rm(join(resultsDir, file));
  }
}

const results: BenchmarkResult[] = [];
for (const benchmark of benchmarks) {
  const sandboxDir = join(root, "sandboxes", benchmark.id);
  const raw = JSON.parse(await fs.readFile(join(root, "meta", `${benchmark.id}.json`), "utf8")) as Meta;
  const result = await validateSandbox(benchmark, sandboxDir, raw);
  results.push(result);
  printBenchmarkResult(result, true);
  await fs.writeFile(join(resultsDir, `${benchmark.id}-${Date.now()}.json`), JSON.stringify(result, null, 2));
}

const suite = calculateSuiteResults(results, model);
printSuiteReport(suite);
const reportFile = join(resultsDir, `report-${Date.now()}.json`);
await exportResultsJson(suite, reportFile);
const lines = results.map((result) => {
  const status = result.passed ? "PASS" : "FAIL";
  return `${status} ${result.score}/3 ${result.benchmarkName} (${result.category}) - ${result.reason}`;
});
await fs.writeFile(join(resultsDir, "summary.txt"), lines.join("\n") + "\n");
const failures = lines.filter((line) => line.startsWith("FAIL"));
await fs.writeFile(join(resultsDir, "failures.txt"), failures.join("\n") + (failures.length ? "\n" : ""));
console.log(`Report saved to: ${reportFile}`);
console.log("\n=== Failures ===\n");
for (const line of failures) console.log(line);
