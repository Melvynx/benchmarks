import { promises as fs } from "fs";
import { join } from "path";
import { benchmarks } from "./benchmarks/index.js";
import { validateSandbox } from "./src/runner.js";
import { calculateSuiteResults } from "./src/scorer.js";
import { printBenchmarkResult, printSuiteReport, exportResultsJson } from "./src/reporter.js";

const cwd = process.cwd();
const sandboxes = join(cwd, "sandboxes");
const resultsDir = join(cwd, "results");
const metaDir = join(cwd, "meta");
const model = "cursor-grok-4-6-high";

await fs.mkdir(resultsDir, { recursive: true });

const results = [];

for (const benchmark of benchmarks) {
  const sandboxDir = join(sandboxes, benchmark.id);
  let meta = {
    model,
    stdout: "",
    stderr: "",
    exitCode: 0,
    duration: 0,
    commandsRun: [] as string[],
    packagesInstalled: [] as string[],
  };

  try {
    const raw = await fs.readFile(join(metaDir, `${benchmark.id}.json`), "utf-8");
    meta = { ...meta, ...JSON.parse(raw) };
  } catch {
    // no meta recorded
  }

  const started = Date.now();
  const result = await validateSandbox(benchmark, sandboxDir, {
    ...meta,
    duration: meta.duration || Date.now() - started,
  });
  results.push(result);
  printBenchmarkResult(result, true);

  const resultFile = join(resultsDir, `${benchmark.id}-${Date.now()}.json`);
  await fs.writeFile(resultFile, JSON.stringify(result, null, 2), "utf-8");
}

const suite = calculateSuiteResults(results, model);
printSuiteReport(suite);
const reportFile = join(resultsDir, `report-${Date.now()}.json`);
await exportResultsJson(suite, reportFile);
console.log(`Report saved to: ${reportFile}`);
