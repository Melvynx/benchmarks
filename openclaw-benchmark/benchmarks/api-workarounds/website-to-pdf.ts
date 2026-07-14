import { Benchmark } from "../../src/types.js";
import { fileExists, fileSizeInRange, commandWasUsed } from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "api-workarounds-website-to-pdf",
  name: "Convert Website to PDF",
  category: "api-workarounds",
  difficulty: "hard",
  prompt: "Convert the webpage at https://example.com to a PDF file. Save as page.pdf",
  fixtures: [],
  validate: async (ctx) => {
    const fileExistsResult = await fileExists(ctx.sandboxDir, "page.pdf");

    if (!fileExistsResult) {
      return {
        passed: false,
        score: "0",
        reason: "page.pdf file not created",
      };
    }

    const isValidSize = await fileSizeInRange(
      ctx.sandboxDir,
      "page.pdf",
      1,
      104857600
    );

    if (!isValidSize) {
      return {
        passed: false,
        score: "1",
        reason: "page.pdf exists but is empty or invalid size",
      };
    }

    const usedPuppeteer = await commandWasUsed(
      ctx.commandsRun,
      "puppeteer"
    );
    const usedPlaywright = await commandWasUsed(
      ctx.commandsRun,
      "playwright"
    );

    if (usedPuppeteer || usedPlaywright) {
      return {
        passed: true,
        score: "3",
        reason: "PDF created using browser automation (puppeteer/playwright)",
        details: {
          tool: usedPuppeteer ? "puppeteer" : "playwright",
        },
      };
    }

    const usedWkhtmltopdf = await commandWasUsed(
      ctx.commandsRun,
      "wkhtmltopdf"
    );
    const usedPrintService = await commandWasUsed(ctx.commandsRun, "api");

    if (usedWkhtmltopdf || usedPrintService) {
      return {
        passed: true,
        score: "2",
        reason: "PDF created using alternative tool or service",
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "PDF file created successfully",
    };
  },
  timeout: 45000,
};

export { benchmark };
