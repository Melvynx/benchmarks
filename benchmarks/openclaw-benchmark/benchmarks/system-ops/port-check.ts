import type { Benchmark } from "../../src/types.js";
import { fileExists, fileIsValidJson } from "../../src/validator.js";

export const benchmark: Benchmark = {
  id: "system-ops-port-check",
  name: "Port Check",
  category: "system-ops",
  difficulty: "easy",
  prompt:
    "Check if ports 3000, 5432, and 8080 are currently in use on this machine. For each port, report whether it's open or closed and what process is using it (if any). Save the report to ports.json as an array of {port, status, process?} objects.",
  fixtures: [],
  validate: async (ctx) => {
    const portsJsonExists = await fileExists(ctx.sandboxDir, "ports.json");

    if (!portsJsonExists) {
      return {
        passed: false,
        score: "0",
        reason: "ports.json not found",
      };
    }

    const isValidJson = await fileIsValidJson(ctx.sandboxDir, "ports.json");

    if (!isValidJson) {
      return {
        passed: false,
        score: "1",
        reason: "ports.json is not valid JSON",
      };
    }

    const usedOptimalTool = ctx.commandsRun.some(
      (cmd) =>
        cmd.includes("lsof ") || cmd.includes("netstat ") || cmd.includes("ss ")
    );

    const score = usedOptimalTool ? "3" : "2";

    return {
      passed: true,
      score,
      reason: usedOptimalTool
        ? "Generated valid ports.json using optimal port checking tools"
        : "Generated valid ports.json",
    };
  },
};
