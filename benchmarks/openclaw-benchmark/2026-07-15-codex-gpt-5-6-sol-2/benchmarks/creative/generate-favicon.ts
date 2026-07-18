import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileSizeInRange,
  commandWasUsed,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "creative-generate-favicon",
  name: "Generate Favicon",
  category: "creative",
  difficulty: "hard",
  prompt:
    "Generate a favicon.ico file with the letters 'AB' on a blue background. The icon should be at least 32x32 pixels.",
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const faviconExists = await fileExists(ctx.sandboxDir, "favicon.ico");

    if (!faviconExists) {
      return {
        passed: false,
        score: "0",
        reason: "favicon.ico file not found",
      };
    }

    const sizeValid = await fileSizeInRange(ctx.sandboxDir, "favicon.ico", 100, Infinity);

    if (!sizeValid) {
      return {
        passed: false,
        score: "1",
        reason: "favicon.ico exists but is too small (< 100 bytes)",
      };
    }

    const usedCanvas = await commandWasUsed(ctx.commandsRun, "canvas");
    const usedSharp = await commandWasUsed(ctx.commandsRun, "sharp");
    const usedImageMagick = await commandWasUsed(ctx.commandsRun, "convert");
    const usedSVG = ctx.stdout.includes("svg") || ctx.stdout.includes("SVG");

    if (usedCanvas || usedSharp || usedImageMagick) {
      return {
        passed: true,
        score: "3",
        reason: "favicon.ico created using canvas/sharp/imagemagick",
      };
    }

    if (usedSVG || ctx.commandsRun.some((cmd) => cmd.includes("svg"))) {
      return {
        passed: true,
        score: "2",
        reason: "favicon.ico created using SVG conversion approach",
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "favicon.ico created with creative approach",
    };
  },
};

export { benchmark };
