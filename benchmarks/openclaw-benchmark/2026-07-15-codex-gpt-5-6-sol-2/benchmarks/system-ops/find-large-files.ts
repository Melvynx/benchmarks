import type { Benchmark, BenchmarkFixture } from "../../src/types.js";
import { fileExists, fileContains } from "../../src/validator.js";

const fixtures: BenchmarkFixture[] = [
  { filename: "small1.txt", content: "hello" },
  { filename: "small2.txt", content: "world" },
  { filename: "medium1.txt", content: "data ".repeat(1000) },
  { filename: "medium2.txt", content: "info ".repeat(800) },
  { filename: "large1.txt", content: "big ".repeat(5000) },
  { filename: "large2.txt", content: "huge ".repeat(4000) },
  { filename: "large3.txt", content: "mega ".repeat(3000) },
  { filename: "nested/deep/file.txt", content: "deep ".repeat(2000) },
];

export const benchmark: Benchmark = {
  id: "system-ops-find-large-files",
  name: "Find Large Files",
  category: "system-ops",
  difficulty: "easy",
  prompt:
    "Find the 5 largest files in the current directory tree and save a report to report.txt with the file path and size for each.",
  fixtures,
  validate: async (ctx) => {
    const reportExists = await fileExists(ctx.sandboxDir, "report.txt");

    if (!reportExists) {
      return {
        passed: false,
        score: "0",
        reason: "report.txt not found",
      };
    }

    const containsLargeFiles = await fileContains(
      ctx.sandboxDir,
      "report.txt",
      "large1"
    );
    const hasContentOrLarge2 =
      containsLargeFiles ||
      (await fileContains(ctx.sandboxDir, "report.txt", "large2"));

    if (!hasContentOrLarge2) {
      return {
        passed: false,
        score: "1",
        reason: "report.txt exists but does not contain the largest files",
      };
    }

    const reportLines = ctx.outputFiles.filter((f) => f.includes("report.txt"));
    if (reportLines.length === 0) {
      return {
        passed: false,
        score: "1",
        reason: "report.txt exists but verification failed",
      };
    }

    const usedOptimalTool = ctx.commandsRun.some(
      (cmd) =>
        cmd.includes("du ") ||
        cmd.includes("find ") ||
        cmd.includes("ls -lSr")
    );

    const passed =
      reportExists && hasContentOrLarge2 && ctx.outputFiles.length > 0;
    const score = usedOptimalTool ? "3" : "2";

    return {
      passed,
      score,
      reason: passed
        ? usedOptimalTool
          ? "Successfully found largest files using optimal tools"
          : "Successfully found largest files"
        : "Failed to generate valid report",
    };
  },
};
