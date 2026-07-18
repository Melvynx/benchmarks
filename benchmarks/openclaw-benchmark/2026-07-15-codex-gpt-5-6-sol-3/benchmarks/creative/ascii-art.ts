import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import { fileExists, fileMatchesRegex } from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "creative-ascii-art",
  name: "Create ASCII Art House",
  category: "creative",
  difficulty: "easy",
  prompt:
    "Create an ASCII art representation of a house and save it to house.txt. The house should be at least 10 lines tall and recognizable as a house (with a roof, walls, door, and windows).",
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const houseExists = await fileExists(ctx.sandboxDir, "house.txt");

    if (!houseExists) {
      return {
        passed: false,
        score: "0",
        reason: "house.txt file not found",
      };
    }

    const { promises: fs } = await import("fs");
    const { join } = await import("path");

    try {
      const content = await fs.readFile(join(ctx.sandboxDir, "house.txt"), "utf-8");
      const lines = content.split("\n");

      if (lines.length < 10) {
        return {
          passed: false,
          score: "1",
          reason: `House is only ${lines.length} lines tall, needs at least 10`,
        };
      }

      const hasRoofChars = /[\/\\^]/.test(content);
      const hasWallChars = /[|_-]/.test(content);
      const structureValid = hasRoofChars && hasWallChars;

      if (!structureValid) {
        return {
          passed: false,
          score: "1",
          reason: "Does not have recognizable house structure elements",
        };
      }

      const hasDoor = /[+o0]|door/.test(content);
      const hasWindows = /[\[\]()#@]/.test(content);
      const hasRoof = /[\/\\^]/.test(content);

      if (hasDoor && hasWindows && hasRoof) {
        return {
          passed: true,
          score: "3",
          reason: "Clearly recognizable house with distinct roof, walls, door, and windows",
        };
      }

      if ((hasDoor || hasWindows) && hasRoof) {
        return {
          passed: true,
          score: "2",
          reason: "Basic but somewhat recognizable house structure",
        };
      }

      return {
        passed: true,
        score: "1",
        reason: "File exists with ASCII art but not clearly recognizable as a house",
      };
    } catch (e) {
      return {
        passed: false,
        score: "0",
        reason: `Error reading house.txt: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  },
};

export { benchmark };
