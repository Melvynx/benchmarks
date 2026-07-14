import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileContains,
  fileMatchesRegex,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "data-processing-regex-extraction",
  name: "Regex Extraction",
  category: "data-processing",
  difficulty: "hard",
  prompt:
    "Extract all phone numbers from contacts.txt and save them in E.164 format (e.g., +33612345678) to phones.txt, one per line.",
  fixtures: [
    {
      filename: "contacts.txt",
      content: `John Doe - Call me at 06 12 34 56 78 (France)
Jane Smith: +44 7911 123456
Office: (212) 555-1234
Mobile: +33 6 98 76 54 32
Bob's number: 07.89.01.23.45
Emergency: +1-800-555-0199
Alice: 06-78-90-12-34`,
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const exists = await fileExists(ctx.sandboxDir, "phones.txt");
    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "phones.txt not found",
      };
    }

    const hasPlus = await fileContains(ctx.sandboxDir, "phones.txt", "+");
    if (!hasPlus) {
      return {
        passed: false,
        score: "1",
        reason: "No E.164 format numbers found (should start with +)",
      };
    }

    const hasAtLeastFive = await fileMatchesRegex(
      ctx.sandboxDir,
      "phones.txt",
      /(\+[0-9]+\n){4,}/
    );

    if (!hasAtLeastFive) {
      return {
        passed: false,
        score: "1",
        reason: "Less than 5 phone numbers extracted",
      };
    }

    const properE164 = await fileMatchesRegex(
      ctx.sandboxDir,
      "phones.txt",
      /^\+\d{10,15}$/m
    );

    const score = properE164 ? "3" : "2";

    return {
      passed: true,
      score,
      reason: "Phone numbers extracted" + (properE164 ? " in E.164 format" : ""),
    };
  },
};

export { benchmark };
