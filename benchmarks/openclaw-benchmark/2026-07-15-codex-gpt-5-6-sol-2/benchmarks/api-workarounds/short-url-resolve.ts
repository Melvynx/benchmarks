import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  fileContains,
  fileMatchesRegex,
  commandWasUsed,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "api-workarounds-short-url-resolve",
  name: "Resolve Shortened URL",
  category: "api-workarounds",
  difficulty: "easy",
  prompt:
    "Find the final destination URL of this shortened link and save it to result.txt: https://bit.ly/3VBzT5p",
  fixtures: [],
  validate: async (ctx) => {
    const fileExistsResult = await fileExists(ctx.sandboxDir, "result.txt");

    if (!fileExistsResult) {
      return {
        passed: false,
        score: "0",
        reason: "result.txt file not created",
      };
    }

    const fileContent = await import("fs").then((fs) =>
      fs.promises.readFile(
        `${ctx.sandboxDir}/result.txt`,
        "utf-8"
      )
    );

    const content = fileContent.trim();

    if (!content || content.length === 0) {
      return {
        passed: false,
        score: "1",
        reason: "result.txt is empty",
      };
    }

    const urlRegex = /^https?:\/\//;
    if (!urlRegex.test(content)) {
      return {
        passed: false,
        score: "1",
        reason: "result.txt does not contain a valid URL",
      };
    }

    const usedCurlRedirect = await commandWasUsed(
      ctx.commandsRun,
      "curl -L"
    );
    const usedCurl = await commandWasUsed(ctx.commandsRun, "curl");
    const usedFetch = await commandWasUsed(ctx.commandsRun, "fetch");

    if (usedCurlRedirect || usedFetch) {
      return {
        passed: true,
        score: "3",
        reason: "URL resolved by following redirects programmatically",
        details: { url: content },
      };
    }

    if (usedCurl) {
      return {
        passed: true,
        score: "2",
        reason: "URL resolved using curl",
        details: { url: content },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "URL resolved successfully",
      details: { url: content },
    };
  },
  timeout: 15000,
};

export { benchmark };
