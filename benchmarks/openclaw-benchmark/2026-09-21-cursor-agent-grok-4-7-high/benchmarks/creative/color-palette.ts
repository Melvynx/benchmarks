import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileIsValidJson,
  commandWasUsed,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "creative-color-palette",
  name: "Extract Color Palette",
  category: "creative",
  difficulty: "hard",
  prompt:
    "Analyze the image photo.jpg and extract the 5 most dominant colors. Save the results to palette.json as an array of hex color strings (e.g., ['#FF5733', '#C70039', ...]).",
  fixtures: [
    {
      filename: "photo.jpg",
      content: "PLACEHOLDER - replace with real JPG for benchmarking",
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const paletteExists = await fileExists(ctx.sandboxDir, "palette.json");

    if (!paletteExists) {
      return {
        passed: false,
        score: "0",
        reason: "palette.json file not found",
      };
    }

    const isValidJson = await fileIsValidJson(ctx.sandboxDir, "palette.json");

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "palette.json is not valid JSON",
      };
    }

    const { promises: fs } = await import("fs");
    const { join } = await import("path");

    try {
      const content = await fs.readFile(
        join(ctx.sandboxDir, "palette.json"),
        "utf-8"
      );
      const colors = JSON.parse(content);

      if (!Array.isArray(colors)) {
        return {
          passed: false,
          score: "1",
          reason: "palette.json does not contain an array",
        };
      }

      if (colors.length !== 5) {
        return {
          passed: false,
          score: "1",
          reason: `Expected 5 colors, got ${colors.length}`,
        };
      }

      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      const allValidHex = colors.every((c) => typeof c === "string" && hexRegex.test(c));

      if (!allValidHex) {
        return {
          passed: false,
          score: "1",
          reason: "Not all colors are valid hex strings",
        };
      }

      const usedSharp = await commandWasUsed(ctx.commandsRun, "sharp");
      const usedJimp = await commandWasUsed(ctx.commandsRun, "jimp");
      const usedCanvas = await commandWasUsed(ctx.commandsRun, "canvas");

      if (usedSharp || usedJimp || usedCanvas) {
        return {
          passed: true,
          score: "3",
          reason: "Color palette extracted using real image analysis library",
        };
      }

      return {
        passed: true,
        score: "2",
        reason: "Color palette extracted with working approach",
      };
    } catch (e) {
      return {
        passed: false,
        score: "1",
        reason: `Error reading palette.json: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  },
};

export { benchmark };
