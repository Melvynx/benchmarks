import { Benchmark } from "../../src/types.js";
import { fileExists, fileContains, fileMatchesRegex } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "multi-step-api-to-csv",
  name: "API to CSV",
  category: "multi-step",
  difficulty: "medium",
  prompt:
    "Fetch the top 30 most-starred GitHub repositories and save the data as repos.csv with columns: rank, name, owner, stars, language, description (truncated to 100 chars)",
  timeout: 60000,
  validate: async (ctx) => {
    const exists = await fileExists(ctx.sandboxDir, "repos.csv");

    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "repos.csv file not found",
      };
    }

    const hasStarsHeader = await fileContains(ctx.sandboxDir, "repos.csv", "stars");
    const hasHeaderRow = await fileMatchesRegex(
      ctx.sandboxDir,
      "repos.csv",
      /^rank,name,owner,stars/i
    );

    if (!hasHeaderRow) {
      return {
        passed: false,
        score: "1",
        reason: "repos.csv missing proper header row",
        details: { fileExists: true, hasStarsHeader },
      };
    }

    const hasDataRows = await fileMatchesRegex(
      ctx.sandboxDir,
      "repos.csv",
      /^[^,]+,[^,]+,[^,]+,\d+/m
    );

    if (!hasDataRows) {
      return {
        passed: false,
        score: "1",
        reason: "repos.csv missing data rows",
        details: { fileExists: true, hasHeaderRow: true },
      };
    }

    const knownRepos = ["torvalds/linux", "facebook/react", "golang/go"];
    let hasKnownRepos = false;

    for (const repo of knownRepos) {
      const found = await fileContains(ctx.sandboxDir, "repos.csv", repo);
      if (found) {
        hasKnownRepos = true;
        break;
      }
    }

    return {
      passed: true,
      score: hasKnownRepos ? "3" : "2",
      reason: hasKnownRepos
        ? "Successfully fetched and formatted GitHub repos CSV with known top repositories"
        : "Successfully created repos CSV with proper structure",
      details: {
        fileExists: true,
        hasHeaderRow: true,
        hasDataRows: true,
        hasKnownRepos,
      },
    };
  },
};
