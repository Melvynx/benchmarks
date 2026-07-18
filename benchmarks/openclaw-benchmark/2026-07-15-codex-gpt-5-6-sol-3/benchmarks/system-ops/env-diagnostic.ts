import type { Benchmark } from "../../src/types.js";
import { fileExists, fileIsValidJson } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "system-ops-env-diagnostic",
  name: "Environment Diagnostic",
  category: "system-ops",
  difficulty: "easy",
  prompt:
    "Generate a complete system diagnostic report and save it to diagnostic.json. Include: OS name and version, CPU architecture, total RAM, available disk space, Node.js version, pnpm version, Python version (if available), and current user.",
  fixtures: [],
  validate: async (ctx) => {
    const diagnosticExists = await fileExists(ctx.sandboxDir, "diagnostic.json");

    if (!diagnosticExists) {
      return {
        passed: false,
        score: "0",
        reason: "diagnostic.json not found",
      };
    }

    const isValidJson = await fileIsValidJson(ctx.sandboxDir, "diagnostic.json");

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "diagnostic.json is not valid JSON",
      };
    }

    const requiredFields = ["os", "cpu", "ram", "node"];
    let fieldCount = 0;

    for (const field of requiredFields) {
      const fieldPattern = new RegExp(`"${field}"`, "i");
      if (fieldPattern.test(JSON.stringify(ctx.outputFiles))) {
        fieldCount++;
      }
    }

    const hasMultipleFields = fieldCount >= 4;
    const isComprehensive = fieldCount >= 6;

    if (!hasMultipleFields) {
      return {
        passed: false,
        score: "1",
        reason: "diagnostic.json lacks required fields",
      };
    }

    const score = isComprehensive ? "3" : "2";

    return {
      passed: true,
      score,
      reason: isComprehensive
        ? "Generated comprehensive diagnostic report with all fields"
        : "Generated partial diagnostic report with key fields",
    };
  },
};
