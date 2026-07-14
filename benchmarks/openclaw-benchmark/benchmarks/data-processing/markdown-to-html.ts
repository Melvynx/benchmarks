import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import {
  fileExists,
  fileContains,
  fileIsValidHtml,
  fileMatchesRegex,
} from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "data-processing-markdown-to-html",
  name: "Markdown to HTML",
  category: "data-processing",
  difficulty: "easy",
  prompt:
    "Convert the README.md file to a styled HTML page with syntax highlighting for code blocks. Save as output.html",
  fixtures: [
    {
      filename: "README.md",
      content: `# Project Title

A simple project demonstrating **markdown** to HTML conversion.

## Installation

\`\`\`bash
pnpm add my-package
\`\`\`

## Usage

\`\`\`javascript
const pkg = require('my-package');
pkg.doSomething();
\`\`\`

## Features

- Feature one
- Feature two
- Feature three

> This is a blockquote

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |`,
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const exists = await fileExists(ctx.sandboxDir, "output.html");
    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "output.html not found",
      };
    }

    const isValidHtml = await fileIsValidHtml(ctx.sandboxDir, "output.html");
    if (!isValidHtml) {
      return {
        passed: false,
        score: "1",
        reason: "output.html does not contain valid HTML tags",
      };
    }

    const hasTitle = await fileContains(ctx.sandboxDir, "output.html", "Project Title");
    const hasCodeBlock = await fileContains(ctx.sandboxDir, "output.html", "<code") ||
      (await fileContains(ctx.sandboxDir, "output.html", "<pre"));
    const hasDoctype = await fileContains(ctx.sandboxDir, "output.html", "<html") ||
      (await fileContains(ctx.sandboxDir, "output.html", "<!DOCTYPE"));

    if (!hasTitle || !hasCodeBlock || !hasDoctype) {
      return {
        passed: false,
        score: "1",
        reason: "Missing required content: title, code blocks, or doctype",
      };
    }

    const usedMarkdownLibrary =
      ctx.packagesInstalled.some(
        (pkg) =>
          pkg.includes("marked") ||
          pkg.includes("markdown-it") ||
          pkg.includes("markdown")
      ) ||
      ctx.commandsRun.some(
        (cmd) =>
          cmd.includes("marked") ||
          cmd.includes("markdown-it") ||
          cmd.includes("pandoc")
      );

    const score = usedMarkdownLibrary ? "3" : "2";

    return {
      passed: true,
      score,
      reason: "Markdown successfully converted to HTML",
    };
  },
};

export { benchmark };
