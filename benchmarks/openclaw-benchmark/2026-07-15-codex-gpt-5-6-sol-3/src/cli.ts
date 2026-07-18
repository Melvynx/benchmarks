#!/usr/bin/env node
import { promises as fs } from "fs";
import { join } from "path";
import chalk from "chalk";
import { benchmarks } from "../benchmarks/index.js";
import { prepareSandbox, validateSandbox } from "./runner.js";
import { calculateSuiteResults } from "./scorer.js";
import { printBenchmarkResult, printSuiteReport, exportResultsJson } from "./reporter.js";

const args = process.argv.slice(2);
const command = args[0];

async function listBenchmarks(): Promise<void> {
  const categoryFilter = args.find((a) => a.startsWith("--category="))?.split("=")[1];

  const filtered = categoryFilter
    ? benchmarks.filter((b) => b.category === categoryFilter)
    : benchmarks;

  console.log(chalk.bold("\n=== Available Benchmarks ===\n"));
  console.log(`ID${" ".repeat(20)} Name${" ".repeat(25)} Category${" ".repeat(10)} Difficulty`);
  console.log("-".repeat(70));

  filtered.forEach((b) => {
    console.log(
      `${b.id.padEnd(22)} ${b.name.padEnd(28)} ${b.category.padEnd(18)} ${b.difficulty}`
    );
  });

  console.log(`\nTotal: ${filtered.length} benchmark(s)\n`);
}

async function prepareBenchmark(): Promise<void> {
  const benchmarkId = args[1];
  if (!benchmarkId) {
    console.error(chalk.red("Error: benchmark ID required"));
    process.exit(1);
  }

  const benchmark = benchmarks.find((b) => b.id === benchmarkId);
  if (!benchmark) {
    console.error(chalk.red(`Error: benchmark "${benchmarkId}" not found`));
    process.exit(1);
  }

  const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];
  const model = modelArg || "unknown-model";

  try {
    const sandboxDir = await prepareSandbox(benchmark);
    console.log(chalk.green(`Sandbox created: ${sandboxDir}`));
    console.log(chalk.blue(`Model: ${model}`));
    console.log(chalk.bold("\n--- Prompt ---\n"));
    console.log(benchmark.prompt);
    console.log(chalk.bold("\n--- Sandbox Path ---\n"));
    console.log(sandboxDir);
  } catch (error) {
    console.error(chalk.red(`Error preparing sandbox: ${error}`));
    process.exit(1);
  }
}

async function validateBenchmark(): Promise<void> {
  const benchmarkId = args[1];
  const sandboxDir = args[2];

  if (!benchmarkId || !sandboxDir) {
    console.error(chalk.red("Error: benchmark ID and sandbox directory required"));
    process.exit(1);
  }

  const benchmark = benchmarks.find((b) => b.id === benchmarkId);
  if (!benchmark) {
    console.error(chalk.red(`Error: benchmark "${benchmarkId}" not found`));
    process.exit(1);
  }

  try {
    const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];
    const meta = {
      model: modelArg || "unknown-model",
      stdout: "",
      stderr: "",
      exitCode: 0,
      duration: 0,
      commandsRun: [] as string[],
      packagesInstalled: [] as string[],
    };

    const result = await validateSandbox(benchmark, sandboxDir, meta);
    printBenchmarkResult(result, true);

    const resultsDir = join(process.cwd(), "results");
    await fs.mkdir(resultsDir, { recursive: true });
    const resultFile = join(resultsDir, `${benchmarkId}-${Date.now()}.json`);
    await fs.writeFile(resultFile, JSON.stringify(result, null, 2), "utf-8");
    console.log(chalk.gray(`Result saved to: ${resultFile}`));
  } catch (error) {
    console.error(chalk.red(`Error validating benchmark: ${error}`));
    process.exit(1);
  }
}

async function generateReport(): Promise<void> {
  const resultsDir = args[1];
  if (!resultsDir) {
    console.error(chalk.red("Error: results directory required"));
    process.exit(1);
  }

  try {
    const files = await fs.readdir(resultsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json") && !f.startsWith("report-"));

    if (jsonFiles.length === 0) {
      console.error(chalk.red("No result files found"));
      process.exit(1);
    }

    const results = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(join(resultsDir, file), "utf-8");
      results.push(JSON.parse(content));
    }

    const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];
    const suite = calculateSuiteResults(results, modelArg || "unknown-model");
    printSuiteReport(suite);

    const reportFile = join(resultsDir, `report-${Date.now()}.json`);
    await exportResultsJson(suite, reportFile);
    console.log(chalk.gray(`Report saved to: ${reportFile}`));
  } catch (error) {
    console.error(chalk.red(`Error generating report: ${error}`));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  if (!command) {
    console.log(chalk.bold("Usage:"));
    console.log("  tsx src/cli.ts list [--category=X]");
    console.log("  tsx src/cli.ts prepare <id> [--model=X]");
    console.log("  tsx src/cli.ts validate <id> <sandboxDir>");
    console.log("  tsx src/cli.ts report <resultsDir>");
    process.exit(0);
  }

  switch (command) {
    case "list":
      await listBenchmarks();
      break;
    case "prepare":
      await prepareBenchmark();
      break;
    case "validate":
      await validateBenchmark();
      break;
    case "report":
      await generateReport();
      break;
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red(`Fatal error: ${error}`));
  process.exit(1);
});
