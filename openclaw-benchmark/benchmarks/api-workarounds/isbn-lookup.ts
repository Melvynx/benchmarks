import { Benchmark } from "../../src/types.js";
import {
  fileExists,
  fileIsValidJson,
  commandWasUsed,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "api-workarounds-isbn-lookup",
  name: "ISBN Book Lookup",
  category: "api-workarounds",
  difficulty: "easy",
  prompt:
    "Look up the book with ISBN 978-0-13-468599-1 and save its title, author, and publication year to book-info.json",
  fixtures: [],
  validate: async (ctx) => {
    const fileExistsResult = await fileExists(
      ctx.sandboxDir,
      "book-info.json"
    );

    if (!fileExistsResult) {
      return {
        passed: false,
        score: "0",
        reason: "book-info.json file not created",
      };
    }

    const isValidJson = await fileIsValidJson(
      ctx.sandboxDir,
      "book-info.json"
    );

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "book-info.json is not valid JSON",
      };
    }

    const fileContent = await import("fs").then((fs) =>
      fs.promises.readFile(
        `${ctx.sandboxDir}/book-info.json`,
        "utf-8"
      )
    );

    const data = JSON.parse(fileContent);

    const hasTitle = typeof data.title === "string" && data.title.length > 0;
    const hasAuthor = typeof data.author === "string" && data.author.length > 0;

    if (!hasTitle || !hasAuthor) {
      return {
        passed: false,
        score: "1",
        reason: "book-info.json missing required fields (title, author)",
      };
    }

    const usedOpenLibrary = await commandWasUsed(
      ctx.commandsRun,
      "openlibrary"
    );
    const usedGoogleBooks = await commandWasUsed(
      ctx.commandsRun,
      "googleapis.com"
    );
    const usedIsbnApi = await commandWasUsed(ctx.commandsRun, "isbn");

    if (usedOpenLibrary || usedGoogleBooks || usedIsbnApi) {
      return {
        passed: true,
        score: "3",
        reason: "Book info retrieved using official API",
        details: {
          api: usedOpenLibrary ? "OpenLibrary" : usedGoogleBooks ? "Google Books" : "ISBN API",
          fields: Object.keys(data),
        },
      };
    }

    return {
      passed: true,
      score: "2",
      reason: "Book info retrieved successfully",
      details: { fields: Object.keys(data) },
    };
  },
  timeout: 15000,
};

export { benchmark };
