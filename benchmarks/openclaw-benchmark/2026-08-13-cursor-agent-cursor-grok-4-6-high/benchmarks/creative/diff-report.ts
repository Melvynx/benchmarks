import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileIsValidHtml,
  fileContains,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "creative-diff-report",
  name: "Generate Diff Report",
  category: "creative",
  difficulty: "medium",
  prompt:
    "Compare the two JSON files old.json and new.json. Generate a human-readable diff report in diff-report.html showing what was added, removed, and changed. Use color coding (green for added, red for removed, yellow for changed).",
  fixtures: [
    {
      filename: "old.json",
      content: JSON.stringify(
        {
          name: "MyApp",
          version: "1.0.0",
          features: ["auth", "dashboard"],
          config: { theme: "light", lang: "en" },
        },
        null,
        2
      ),
    },
    {
      filename: "new.json",
      content: JSON.stringify(
        {
          name: "MyApp",
          version: "2.0.0",
          features: ["auth", "dashboard", "settings"],
          config: { theme: "dark", lang: "en", debug: false },
        },
        null,
        2
      ),
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const reportExists = await fileExists(ctx.sandboxDir, "diff-report.html");

    if (!reportExists) {
      return {
        passed: false,
        score: "0",
        reason: "diff-report.html file not found",
      };
    }

    const isValidHtml = await fileIsValidHtml(ctx.sandboxDir, "diff-report.html");

    if (!isValidHtml) {
      return {
        passed: false,
        score: "1",
        reason: "diff-report.html does not contain valid HTML tags",
      };
    }

    const hasVersion = await fileContains(ctx.sandboxDir, "diff-report.html", "version");
    const hasSettings = await fileContains(
      ctx.sandboxDir,
      "diff-report.html",
      "settings"
    );

    if (!hasVersion || !hasSettings) {
      return {
        passed: false,
        score: "1",
        reason: "diff-report.html does not mention changed or added fields",
      };
    }

    const hasColorCoding = await fileContains(
      ctx.sandboxDir,
      "diff-report.html",
      "color"
    );
    const hasGreen = await fileContains(ctx.sandboxDir, "diff-report.html", "green");
    const hasRed = await fileContains(ctx.sandboxDir, "diff-report.html", "red");
    const hasYellow = await fileContains(
      ctx.sandboxDir,
      "diff-report.html",
      "yellow"
    );
    const hasStyle = await fileContains(ctx.sandboxDir, "diff-report.html", "style");

    const hasProperColorCoding = hasColorCoding || hasStyle || hasGreen || hasRed || hasYellow;

    if (!hasProperColorCoding) {
      return {
        passed: true,
        score: "2",
        reason: "Generated functional diff report",
      };
    }

    return {
      passed: true,
      score: "3",
      reason: "Generated well-structured visual diff with color coding",
    };
  },
};

export { benchmark };
