import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import { fileExists, fileIsValidJson, fileContains } from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "data-processing-log-analysis",
  name: "Log Analysis",
  category: "data-processing",
  difficulty: "medium",
  prompt:
    "Analyze the nginx access log in access.log. Find the top 5 IP addresses by request count and save the results to report.json as an array of {ip, count} objects sorted by count descending.",
  fixtures: [
    {
      filename: "access.log",
      content: `192.168.1.1 - - [10/Jan/2024:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326
10.0.0.5 - - [10/Jan/2024:13:55:37 +0000] "GET /api/users HTTP/1.1" 200 1234
192.168.1.1 - - [10/Jan/2024:13:55:38 +0000] "POST /api/login HTTP/1.1" 200 456
172.16.0.10 - - [10/Jan/2024:13:55:39 +0000] "GET /style.css HTTP/1.1" 200 789
10.0.0.5 - - [10/Jan/2024:13:55:40 +0000] "GET /api/products HTTP/1.1" 200 5678
192.168.1.1 - - [10/Jan/2024:13:55:41 +0000] "GET /images/logo.png HTTP/1.1" 200 15234
10.0.0.5 - - [10/Jan/2024:13:55:42 +0000] "GET /api/orders HTTP/1.1" 200 3456
192.168.1.100 - - [10/Jan/2024:13:55:43 +0000] "GET /about HTTP/1.1" 200 4567
172.16.0.10 - - [10/Jan/2024:13:55:44 +0000] "GET /script.js HTTP/1.1" 200 12345
192.168.1.1 - - [10/Jan/2024:13:55:45 +0000] "GET /contact HTTP/1.1" 200 2345
10.0.0.5 - - [10/Jan/2024:13:55:46 +0000] "GET /api/health HTTP/1.1" 200 123
10.0.0.50 - - [10/Jan/2024:13:55:47 +0000] "GET /index.html HTTP/1.1" 200 2326
172.16.0.10 - - [10/Jan/2024:13:55:48 +0000] "GET /favicon.ico HTTP/1.1" 200 1234
192.168.1.1 - - [10/Jan/2024:13:55:49 +0000] "GET /dashboard HTTP/1.1" 200 8765
10.0.0.5 - - [10/Jan/2024:13:55:50 +0000] "PUT /api/settings HTTP/1.1" 200 234
192.168.1.100 - - [10/Jan/2024:13:55:51 +0000] "GET /profile HTTP/1.1" 200 3456
10.0.0.50 - - [10/Jan/2024:13:55:52 +0000] "GET /style.css HTTP/1.1" 200 789
192.168.1.1 - - [10/Jan/2024:13:55:53 +0000] "GET /api/notifications HTTP/1.1" 200 567
10.0.0.50 - - [10/Jan/2024:13:55:54 +0000] "POST /api/feedback HTTP/1.1" 200 234
172.16.0.10 - - [10/Jan/2024:13:55:55 +0000] "GET /robots.txt HTTP/1.1" 200 45`,
    },
  ],
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const exists = await fileExists(ctx.sandboxDir, "report.json");
    if (!exists) {
      return {
        passed: false,
        score: "0",
        reason: "report.json not found",
      };
    }

    const isValidJson = await fileIsValidJson(ctx.sandboxDir, "report.json");
    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "report.json is not valid JSON",
      };
    }

    const hasHighestCount =
      (await fileContains(ctx.sandboxDir, "report.json", '"192.168.1.1"')) &&
      (await fileContains(ctx.sandboxDir, "report.json", "6"));

    if (!hasHighestCount) {
      return {
        passed: false,
        score: "2",
        reason: "JSON is valid but may not have correct data",
      };
    }

    const usedTools =
      ctx.commandsRun.some((cmd) =>
        cmd.includes("awk") ||
          cmd.includes("grep") ||
          cmd.includes("node") ||
          cmd.includes("python")
      );

    const score = usedTools ? "3" : "2";

    return {
      passed: true,
      score,
      reason: "Log analysis completed with valid JSON output",
    };
  },
};

export { benchmark };
