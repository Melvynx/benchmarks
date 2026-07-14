import { Benchmark } from "../../src/types.js";
import { fileExists, packageWasInstalled, commandWasUsed } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "tool-discovery-svg-to-png",
  name: "Convert SVG to PNG",
  category: "tool-discovery",
  difficulty: "medium",
  prompt:
    "Convert the SVG file logo.svg to a 512x512 PNG image. Save as logo.png",
  fixtures: [
    {
      filename: "logo.svg",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
    },
  ],
  validate: async (ctx) => {
    const logoPngExists = await fileExists(ctx.sandboxDir, "logo.png");

    if (!logoPngExists) {
      return {
        passed: false,
        score: "0",
        reason: "logo.png does not exist",
      };
    }

    const usedSharp = await packageWasInstalled(ctx.packagesInstalled, "sharp");
    const usedPuppeteer = await packageWasInstalled(ctx.packagesInstalled, "puppeteer");
    const usedCanvas = await packageWasInstalled(ctx.packagesInstalled, "canvas");
    const usedImagemagick = await commandWasUsed(ctx.commandsRun, "convert") ||
      await commandWasUsed(ctx.commandsRun, "magick");
    const usedInkscape = await commandWasUsed(ctx.commandsRun, "inkscape");

    if (usedSharp || usedPuppeteer || usedCanvas || usedImagemagick || usedInkscape) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully converted SVG to PNG using optimal tool",
        details: { usedSharp, usedPuppeteer, usedCanvas, usedImagemagick, usedInkscape },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully converted SVG to PNG using alternative method",
    };
  },
};
