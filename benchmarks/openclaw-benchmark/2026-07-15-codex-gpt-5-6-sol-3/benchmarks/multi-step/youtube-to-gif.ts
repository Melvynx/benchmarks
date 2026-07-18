import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  fileSizeInRange,
  commandWasUsed,
} from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "multi-step-youtube-to-gif",
  name: "YouTube to GIF",
  category: "multi-step",
  difficulty: "hard",
  prompt:
    "Create a 5-second GIF from the YouTube video https://www.youtube.com/watch?v=dQw4w9WgXcQ starting at the 30-second mark. Save it as clip.gif. Maximum file size: 5MB.",
  timeout: 180000,
  validate: async (ctx) => {
    const exists = await fileExists(ctx.sandboxDir, "clip.gif");

    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "clip.gif file not found",
      };
    }

    const validSize = await fileSizeInRange(
      ctx.sandboxDir,
      "clip.gif",
      1001,
      5242880
    );

    if (!validSize) {
      return {
        passed: false,
        score: "1",
        reason: "clip.gif exists but is empty or too large",
        details: { fileExists: true },
      };
    }

    const usedYtdlp = await commandWasUsed(ctx.commandsRun, "yt-dlp");
    const usedFfmpeg = await commandWasUsed(ctx.commandsRun, "ffmpeg");

    if (usedYtdlp && usedFfmpeg) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully created GIF using optimal yt-dlp + ffmpeg pipeline",
        details: {
          fileExists: true,
          validSize: true,
          usedYtdlp: true,
          usedFfmpeg: true,
        },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully created GIF with working multi-step approach",
      details: {
        fileExists: true,
        validSize: true,
      },
    };
  },
};
