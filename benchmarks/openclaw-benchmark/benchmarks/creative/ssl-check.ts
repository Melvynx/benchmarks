import { Benchmark, ValidationContext, ValidationResult } from "../../src/types.js";
import { fileExists, fileIsValidJson } from "../../src/validator.js";

const benchmark: Benchmark = {
  id: "creative-ssl-check",
  name: "Check SSL/TLS Certificate",
  category: "creative",
  difficulty: "medium",
  prompt:
    "Check the SSL/TLS certificate for the domain github.com. Save a report to ssl-report.json with: issuer, subject, valid_from, valid_until, days_remaining, and protocol version.",
  validate: async (ctx: ValidationContext): Promise<ValidationResult> => {
    const reportExists = await fileExists(ctx.sandboxDir, "ssl-report.json");

    if (!reportExists) {
      return {
        passed: false,
        score: "0",
        reason: "ssl-report.json file not found",
      };
    }

    const isValidJson = await fileIsValidJson(ctx.sandboxDir, "ssl-report.json");

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "ssl-report.json is not valid JSON",
      };
    }

    const { promises: fs } = await import("fs");
    const { join } = await import("path");

    try {
      const content = await fs.readFile(
        join(ctx.sandboxDir, "ssl-report.json"),
        "utf-8"
      );
      const report = JSON.parse(content);

      const hasIssuer = "issuer" in report;
      const hasValidUntil = "valid_until" in report || "expiry" in report;
      const hasDaysRemaining = "days_remaining" in report;

      if (!hasIssuer || !hasValidUntil) {
        return {
          passed: false,
          score: "1",
          reason: "Missing required fields (issuer and/or valid_until)",
        };
      }

      if (!hasDaysRemaining || typeof report.days_remaining !== "number") {
        return {
          passed: false,
          score: "1",
          reason: "days_remaining field is missing or not a number",
        };
      }

      const usedOpenssl = ctx.commandsRun.some((cmd) => cmd.includes("openssl"));
      const usedNodeTLS = ctx.commandsRun.some((cmd) => cmd.includes("tls"));
      const usedProperTool = usedOpenssl || usedNodeTLS;

      if (usedProperTool) {
        return {
          passed: true,
          score: "3",
          reason: "SSL certificate checked using openssl s_client or Node TLS module",
        };
      }

      return {
        passed: true,
        score: "2",
        reason: "SSL certificate report generated with required fields",
      };
    } catch (e) {
      return {
        passed: false,
        score: "1",
        reason: `Error reading ssl-report.json: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  },
};

export { benchmark };
