import { Benchmark } from "../../src/types.js";
import { fileExists, packageWasInstalled } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "tool-discovery-qr-generate",
  name: "Generate QR code",
  category: "tool-discovery",
  difficulty: "easy",
  prompt:
    "Generate a QR code image for the URL https://example.com and save it as qrcode.png",
  validate: async (ctx) => {
    const qrcodeExists = await fileExists(ctx.sandboxDir, "qrcode.png");

    if (!qrcodeExists) {
      return {
        passed: false,
        score: "0",
        reason: "qrcode.png does not exist",
      };
    }

    const qrLibraryInstalled = await packageWasInstalled(ctx.packagesInstalled, "qrcode") ||
      await packageWasInstalled(ctx.packagesInstalled, "qrcode.js") ||
      await packageWasInstalled(ctx.packagesInstalled, "@bwip.js/bwipjs");

    if (qrLibraryInstalled) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully generated QR code using qrcode library",
        details: { libraryUsed: true },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully generated QR code using alternative method (API or other tool)",
      details: { libraryUsed: false },
    };
  },
};
