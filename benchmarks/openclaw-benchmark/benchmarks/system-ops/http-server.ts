import type { Benchmark, BenchmarkFixture } from "../../src/types.js";
import { fileExists, fileContains } from "../../src/validator.js";

const fixtures: BenchmarkFixture[] = [
  {
    filename: "public/index.html",
    content: "<html><body><h1>Hello World</h1></body></html>",
  },
  { filename: "public/style.css", content: "body { color: red; }" },
];

export const benchmark: Benchmark = {
  id: "system-ops-http-server",
  name: "HTTP Server",
  category: "system-ops",
  difficulty: "medium",
  prompt:
    "Create a script called serve.sh that starts an HTTP server serving the ./public directory on port 9876 with CORS enabled. The script should work when executed with bash serve.sh",
  fixtures,
  validate: async (ctx) => {
    const serveShExists = await fileExists(ctx.sandboxDir, "serve.sh");

    if (!serveShExists) {
      return {
        passed: false,
        score: "0",
        reason: "serve.sh not found",
      };
    }

    const hasPort = await fileContains(ctx.sandboxDir, "serve.sh", "9876");
    const hasPublic = await fileContains(ctx.sandboxDir, "serve.sh", "public");
    const hasCors =
      (await fileContains(ctx.sandboxDir, "serve.sh", "CORS")) ||
      (await fileContains(
        ctx.sandboxDir,
        "serve.sh",
        "Access-Control"
      ));

    if (!hasPort || !hasPublic) {
      return {
        passed: false,
        score: "1",
        reason: "serve.sh exists but missing port 9876 or public directory reference",
      };
    }

    const usedOptimalTool = ctx.commandsRun.some(
      (cmd) =>
        cmd.includes("python -m http.server") || cmd.includes("node") && cmd.includes("http")
    );

    const score = usedOptimalTool && hasCors ? "3" : "2";

    return {
      passed: true,
      score,
      reason:
        score === "3"
          ? "Created working server script with CORS using optimal tools"
          : "Created working server script",
    };
  },
};
