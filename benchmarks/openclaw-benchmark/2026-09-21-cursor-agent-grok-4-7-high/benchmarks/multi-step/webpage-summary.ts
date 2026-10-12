import { Benchmark } from "../../src/types.js";
import { fileExists, fileContains, fileMatchesRegex } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "multi-step-webpage-summary",
  name: "Webpage Summary",
  category: "multi-step",
  difficulty: "medium",
  prompt:
    "Download the content of https://en.wikipedia.org/wiki/TypeScript, extract the main text content (not HTML), and create a 5-bullet-point summary. Save the summary to summary.txt",
  timeout: 60000,
  validate: async (ctx) => {
    const exists = await fileExists(ctx.sandboxDir, "summary.txt");

    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "summary.txt file not found",
      };
    }

    const hasTypeScriptContent = await fileContains(
      ctx.sandboxDir,
      "summary.txt",
      "TypeScript"
    );
    const hasJavaScriptContent = await fileContains(
      ctx.sandboxDir,
      "summary.txt",
      "JavaScript"
    );
    const hasMicrosoftContent = await fileContains(
      ctx.sandboxDir,
      "summary.txt",
      "Microsoft"
    );

    const hasRelevantContent =
      hasTypeScriptContent || hasJavaScriptContent || hasMicrosoftContent;

    if (!hasRelevantContent) {
      return {
        passed: false,
        score: "1",
        reason: "summary.txt missing TypeScript/JavaScript/Microsoft content",
        details: { fileExists: true },
      };
    }

    const hasEnoughText = await fileMatchesRegex(
      ctx.sandboxDir,
      "summary.txt",
      /^.{200,}/s
    );

    if (!hasEnoughText) {
      return {
        passed: false,
        score: "1",
        reason: "summary.txt has relevant content but is too short",
        details: { fileExists: true, hasRelevantContent: true },
      };
    }

    const hasBulletPoints = await fileMatchesRegex(
      ctx.sandboxDir,
      "summary.txt",
      /^[\s]*[-•*]/m
    );

    if (hasBulletPoints) {
      return {
        passed: true,
        score: "3",
        reason: "Successfully fetched and created well-structured bullet-point summary",
        details: {
          fileExists: true,
          hasRelevantContent: true,
          hasEnoughText: true,
          hasBulletPoints: true,
        },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Successfully created summary with relevant content",
      details: {
        fileExists: true,
        hasRelevantContent: true,
        hasEnoughText: true,
      },
    };
  },
};
