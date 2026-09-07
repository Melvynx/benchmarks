import { Benchmark } from "../../src/types.js";
import { fileExists, fileContains, packageWasInstalled } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "tool-discovery-pdf-extract",
  name: "Extract text from PDF",
  category: "tool-discovery",
  difficulty: "medium",
  prompt: "Extract all text content from document.pdf and save it to output.txt",
  fixtures: [
    {
      filename: "document.pdf",
      content: "PLACEHOLDER - replace with real PDF for actual benchmarking",
    },
  ],
  validate: async (ctx) => {
    const outputExists = await fileExists(ctx.sandboxDir, "output.txt");

    if (!outputExists) {
      return {
        passed: false,
        score: "0",
        reason: "output.txt does not exist",
      };
    }

    const hasContent = await fileContains(ctx.sandboxDir, "output.txt", "");

    if (!hasContent) {
      return {
        passed: false,
        score: "1",
        reason: "output.txt is empty",
      };
    }

    const usedPdfParse = await packageWasInstalled(ctx.packagesInstalled, "pdf-parse");
    const usedPdfJs = await packageWasInstalled(ctx.packagesInstalled, "pdfjs-dist");

    if (usedPdfParse || usedPdfJs) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully extracted text using pdf-parse or pdfjs",
        details: { usedPdfParse, usedPdfJs },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully extracted text using alternative tool",
    };
  },
};
