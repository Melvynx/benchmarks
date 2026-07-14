import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  fileContains,
  fileMatchesRegex,
  stdoutContains,
  stdoutMatchesRegex,
  commandWasUsed,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "api-workarounds-fetch-tweet",
  name: "Fetch Tweet Content",
  category: "api-workarounds",
  difficulty: "hard",
  prompt:
    "Get the text content of this tweet and save it to tweet.txt: https://x.com/elonmusk/status/1735721649877700955",
  fixtures: [],
  validate: async (ctx) => {
    const fileExistsResult = await fileExists(ctx.sandboxDir, "tweet.txt");

    if (!fileExistsResult) {
      return {
        passed: false,
        score: "0",
        reason: "tweet.txt file not created",
      };
    }

    const fileContent = await import("fs").then((fs) =>
      fs.promises.readFile(
        `${ctx.sandboxDir}/tweet.txt`,
        "utf-8"
      )
    );

    if (!fileContent || fileContent.trim().length === 0) {
      return {
        passed: false,
        score: "1",
        reason: "tweet.txt exists but is empty",
      };
    }

    if (
      fileContent.toLowerCase().includes("error") ||
      fileContent.toLowerCase().includes("failed") ||
      fileContent.toLowerCase().includes("not found")
    ) {
      return {
        passed: false,
        score: "1",
        reason: "tweet.txt contains error message",
      };
    }

    const usedFxTweet = await commandWasUsed(ctx.commandsRun, "fxtwitter");
    const usedNitter = await commandWasUsed(ctx.commandsRun, "nitter");
    const usedTweetEmbed = await commandWasUsed(
      ctx.commandsRun,
      "twitter.com/i/web/status"
    );

    if (usedFxTweet || usedNitter || usedTweetEmbed) {
      return {
        passed: true,
        score: "3",
        reason: "Tweet content retrieved using API workaround service",
        details: {
          service: usedFxTweet ? "fxtwitter" : usedNitter ? "nitter" : "embed",
        },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Tweet content retrieved with creative workaround",
    };
  },
  timeout: 30000,
};

export { benchmark };
