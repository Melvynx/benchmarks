import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileContains,
  fileMatchesRegex,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "data-processing-json-flatten",
  name: "JSON Flatten",
  category: "data-processing",
  difficulty: "medium",
  prompt:
    "Flatten the nested JSON in data.json into a flat CSV file. Nested keys should use dot notation (e.g. address.city). Save as output.csv",
  fixtures: [
    {
      filename: "data.json",
      content: `[
  {"id": 1, "name": "Alice", "address": {"city": "Paris", "zip": "75001"}, "scores": {"math": 95, "science": 88}},
  {"id": 2, "name": "Bob", "address": {"city": "London", "zip": "EC1A"}, "scores": {"math": 82, "science": 91}},
  {"id": 3, "name": "Charlie", "address": {"city": "Tokyo", "zip": "100-0001"}, "scores": {"math": 78, "science": 85}}
]`,
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const exists = await fileExists(ctx.sandboxDir, "output.csv");
    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "output.csv not found",
      };
    }

    const hasDotNotation = await fileContains(
      ctx.sandboxDir,
      "output.csv",
      "address.city"
    );
    const hasParisValue = await fileContains(ctx.sandboxDir, "output.csv", "Paris");
    const hasThreeRows = await fileMatchesRegex(
      ctx.sandboxDir,
      "output.csv",
      /^[^\n]*\n([^\n]*\n){3}$/
    );

    if (!hasDotNotation || !hasParisValue) {
      return {
        passed: false,
        score: "1",
        reason: "Missing dot notation headers or expected values",
      };
    }

    if (!hasThreeRows) {
      return {
        passed: false,
        score: "2",
        reason: "Has correct format but row count might be off",
      };
    }

    const usedCustomLogic =
      ctx.commandsRun.some((cmd) =>
        cmd.includes("node") || cmd.includes("python")
      ) ||
      ctx.packagesInstalled.some(
        (pkg) =>
          pkg.includes("marked") ||
          pkg.includes("markdown") ||
          pkg.includes("json2csv")
      );

    const score = usedCustomLogic ? "3" : "2";

    return {
      passed: true,
      score,
      reason: "JSON successfully flattened to CSV with proper notation",
    };
  },
};

export { benchmark };
