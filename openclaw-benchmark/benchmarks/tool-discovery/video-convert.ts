import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  commandWasUsed,
} from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "tool-discovery-video-convert",
  name: "Convert video to WebM",
  category: "tool-discovery",
  difficulty: "medium",
  prompt:
    "There is a video file called sample.mp4 in this directory. Convert it to WebM format. Save the output as output.webm",
  fixtures: [
    {
      filename: "sample.mp4",
      content: "PLACEHOLDER - replace with real MP4 for actual benchmarking",
    },
  ],
  validate: async (ctx) => {
    const outputExists = await fileExists(ctx.sandboxDir, "output.webm");

    if (!outputExists) {
      return {
        passed: false,
        score: "0",
        reason: "output.webm does not exist",
      };
    }

    const ffmpegUsed = await commandWasUsed(ctx.commandsRun, "ffmpeg");

    if (ffmpegUsed) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully converted video using ffmpeg",
        details: { ffmpegUsed: true },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully converted video using alternative method",
      details: { ffmpegUsed: false },
    };
  },
  timeout: 120000,
};
