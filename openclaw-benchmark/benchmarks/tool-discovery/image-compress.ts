import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  fileSizeInRange,
  commandWasUsed,
  packageWasInstalled,
} from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "tool-discovery-image-compress",
  name: "Compress image to under 50KB",
  category: "tool-discovery",
  difficulty: "medium",
  prompt:
    "Reduce the file size of image.png to under 50KB while keeping it visually recognizable. Save the result as compressed.png",
  fixtures: [
    {
      filename: "image.png",
      content: "PLACEHOLDER - replace with real PNG for actual benchmarking",
    },
  ],
  validate: async (ctx) => {
    const compressedExists = await fileExists(ctx.sandboxDir, "compressed.png");

    if (!compressedExists) {
      return {
        passed: false,
        score: "0",
        reason: "compressed.png does not exist",
      };
    }

    const sizeInRange = await fileSizeInRange(ctx.sandboxDir, "compressed.png", 1, 51200);

    if (!sizeInRange) {
      return {
        passed: false,
        score: "1",
        reason: "compressed.png exists but exceeds 50KB size limit",
      };
    }

    const usedSharp = await packageWasInstalled(ctx.packagesInstalled, "sharp");
    const usedImagemagick = await commandWasUsed(ctx.commandsRun, "convert") ||
      await commandWasUsed(ctx.commandsRun, "magick");

    if (usedSharp || usedImagemagick) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully compressed image using optimal tool (sharp/imagemagick)",
        details: { usedSharp, usedImagemagick },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully compressed image using alternative method",
      details: { sizeKB: 50 },
    };
  },
};
