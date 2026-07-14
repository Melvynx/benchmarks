import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  fileIsValidJson,
  fileContains,
  commandWasUsed,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "api-workarounds-youtube-info",
  name: "Get YouTube Video Information",
  category: "api-workarounds",
  difficulty: "medium",
  prompt:
    "Get the title, duration, and view count of this YouTube video and save to video-info.json: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  fixtures: [],
  validate: async (ctx) => {
    const fileExistsResult = await fileExists(
      ctx.sandboxDir,
      "video-info.json"
    );

    if (!fileExistsResult) {
      return {
        passed: false,
        score: "0",
        reason: "video-info.json file not created",
      };
    }

    const isValidJson = await fileIsValidJson(
      ctx.sandboxDir,
      "video-info.json"
    );

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "video-info.json is not valid JSON",
      };
    }

    const fileContent = await import("fs").then((fs) =>
      fs.promises.readFile(
        `${ctx.sandboxDir}/video-info.json`,
        "utf-8"
      )
    );

    const data = JSON.parse(fileContent);

    const hasTitle = typeof data.title === "string" && data.title.length > 0;
    const hasDuration =
      (typeof data.duration === "number" || typeof data.duration === "string") &&
      data.duration;

    if (!hasTitle || !hasDuration) {
      return {
        passed: false,
        score: "1",
        reason: "video-info.json missing required fields (title, duration)",
      };
    }

    const usedYtDlp = await commandWasUsed(ctx.commandsRun, "yt-dlp");
    const usedYoutubeApi = await commandWasUsed(ctx.commandsRun, "youtube");
    const usedOEmbed = await commandWasUsed(ctx.commandsRun, "oembed");

    if (usedYtDlp || usedYoutubeApi || usedOEmbed) {
      return {
        passed: true,
        score: "3",
        reason: "YouTube info retrieved using yt-dlp or official API",
        details: { fields: Object.keys(data) },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "YouTube info retrieved with alternative approach",
      details: { fields: Object.keys(data) },
    };
  },
  timeout: 30000,
};

export { benchmark };
