import { Benchmark } from "../../src/types.js";
import { fileExists, fileContains, fileMatchesRegex } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "multi-step-scrape-and-chart",
  name: "Scrape and Chart",
  category: "multi-step",
  difficulty: "hard",
  prompt:
    "Fetch the current top 10 programming languages from the TIOBE index (or any reliable source) and create an SVG bar chart showing their popularity. Save as chart.svg",
  timeout: 120000,
  validate: async (ctx) => {
    const exists = await fileExists(ctx.sandboxDir, "chart.svg");

    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "chart.svg file not found",
      };
    }

    const hasSvgTag = await fileContains(ctx.sandboxDir, "chart.svg", "<svg");

    if (!hasSvgTag) {
      return {
        passed: false,
        score: "1",
        reason: "chart.svg missing <svg> tag",
        details: { fileExists: true },
      };
    }

    const hasChartElements = await fileContains(
      ctx.sandboxDir,
      "chart.svg",
      "<rect"
    ).then(async (found) => {
      if (found) return true;
      return await fileContains(ctx.sandboxDir, "chart.svg", "<line");
    });

    if (!hasChartElements) {
      return {
        passed: false,
        score: "1",
        reason: "chart.svg has SVG tag but no chart elements",
        details: { fileExists: true, hasSvgTag: true },
      };
    }

    const languageNames = [
      "Python",
      "Java",
      "C",
      "C++",
      "JavaScript",
      "Go",
      "Rust",
      "TypeScript",
    ];
    let foundLanguages = 0;

    for (const lang of languageNames) {
      const found = await fileContains(ctx.sandboxDir, "chart.svg", lang);
      if (found) foundLanguages++;
    }

    if (foundLanguages < 3) {
      return {
        passed: false,
        score: "1",
        reason: `chart.svg missing programming language names (found ${foundLanguages})`,
        details: {
          fileExists: true,
          hasSvgTag: true,
          hasChartElements: true,
        },
      };
    }

    return {
      passed: true,
      score: "3",
      reason: "Successfully created SVG bar chart with programming language data",
      details: {
        fileExists: true,
        hasSvgTag: true,
        hasChartElements: true,
        languagesFound: foundLanguages,
      },
    };
  },
};
