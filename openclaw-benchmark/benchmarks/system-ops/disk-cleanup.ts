import type { Benchmark, BenchmarkFixture } from "../../src/types.js";
import { fileExists, fileIsValidJson, fileContains } from "../../src/validator.js";

const fixtures: BenchmarkFixture[] = [
  { filename: "temp/cache.tmp", content: "cached data" },
  { filename: "temp/old.log", content: "log line 1\nlog line 2\nlog line 3" },
  { filename: ".cache/data.json", content: '{"cached": true}' },
  { filename: ".DS_Store", content: "binary placeholder" },
  { filename: "src/app.js", content: "console.log('keep me')" },
];

export const benchmark: Benchmark = {
  id: "system-ops-disk-cleanup",
  name: "Disk Cleanup Analysis",
  category: "system-ops",
  difficulty: "easy",
  prompt:
    "Analyze the current directory for temporary and cache files (.tmp, .cache, .log, node_modules, .DS_Store). Generate a cleanup report to cleanup-report.json listing all found items with their sizes. Do NOT actually delete anything.",
  fixtures,
  validate: async (ctx) => {
    const reportExists = await fileExists(ctx.sandboxDir, "cleanup-report.json");

    if (!reportExists) {
      return {
        passed: false,
        score: "0",
        reason: "cleanup-report.json not found",
      };
    }

    const isValidJson = await fileIsValidJson(
      ctx.sandboxDir,
      "cleanup-report.json"
    );

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "cleanup-report.json is not valid JSON",
      };
    }

    const shouldNotContainAppJs = !(await fileContains(
      ctx.sandboxDir,
      "cleanup-report.json",
      "app.js"
    ));

    const shouldContainTemp =
      (await fileContains(ctx.sandboxDir, "cleanup-report.json", "cache.tmp")) ||
      (await fileContains(ctx.sandboxDir, "cleanup-report.json", "old.log")) ||
      (await fileContains(ctx.sandboxDir, "cleanup-report.json", ".cache")) ||
      (await fileContains(ctx.sandboxDir, "cleanup-report.json", ".DS_Store"));

    if (!shouldContainTemp) {
      return {
        passed: false,
        score: "1",
        reason: "cleanup-report.json does not list temporary files",
      };
    }

    if (!shouldNotContainAppJs) {
      return {
        passed: false,
        score: "2",
        reason: "cleanup-report.json should not include app.js",
      };
    }

    const isComprehensive = await fileContains(
      ctx.sandboxDir,
      "cleanup-report.json",
      "size"
    );

    const score = isComprehensive ? "3" : "2";

    return {
      passed: true,
      score,
      reason: isComprehensive
        ? "Generated comprehensive cleanup report with sizes"
        : "Generated cleanup report excluding source files",
    };
  },
};
