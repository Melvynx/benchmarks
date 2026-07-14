import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileContains,
  fileMatchesRegex,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "data-processing-csv-deduplicate",
  name: "CSV Deduplicate",
  category: "data-processing",
  difficulty: "medium",
  prompt:
    "The file data.csv contains duplicate rows. Remove duplicates based on the email column, keeping only the most recent entry (by the date column). Save the result as cleaned.csv",
  fixtures: [
    {
      filename: "data.csv",
      content: `name,email,date,score
Alice,alice@test.com,2024-01-15,85
Bob,bob@test.com,2024-01-10,90
Alice,alice@test.com,2024-02-20,92
Charlie,charlie@test.com,2024-01-12,78
Bob,bob@test.com,2024-03-05,95
Diana,diana@test.com,2024-01-08,88`,
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const exists = await fileExists(ctx.sandboxDir, "cleaned.csv");
    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "cleaned.csv not found",
      };
    }

    const hasAlice92 = await fileContains(ctx.sandboxDir, "cleaned.csv", "92");
    const hasBob95 = await fileContains(ctx.sandboxDir, "cleaned.csv", "95");
    const hasDiana = await fileContains(ctx.sandboxDir, "cleaned.csv", "Diana");
    const hasCharlie = await fileContains(
      ctx.sandboxDir,
      "cleaned.csv",
      "Charlie"
    );

    if (!hasAlice92 || !hasBob95 || !hasDiana || !hasCharlie) {
      return {
        passed: false,
        score: "1",
        reason: "Missing expected rows or values",
      };
    }

    const rowCountRegex = /^[^\n]*\n([^\n]*\n){4}$/;
    const validRowCount = await fileMatchesRegex(
      ctx.sandboxDir,
      "cleaned.csv",
      rowCountRegex
    );

    if (!validRowCount) {
      return {
        passed: false,
        score: "2",
        reason: "Has correct data but row count might be off",
      };
    }

    const usedScript =
      ctx.commandsRun.some((cmd) => cmd.includes("node")) ||
      ctx.commandsRun.some((cmd) => cmd.includes("awk")) ||
      ctx.commandsRun.some((cmd) => cmd.includes("grep"));

    const score = usedScript ? "3" : "2";

    return {
      passed: true,
      score,
      reason: "Deduplication successful with correct data",
    };
  },
};

export { benchmark };
