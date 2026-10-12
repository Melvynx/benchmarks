import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const grid: Record<string, number[]> = JSON.parse(flag("grid", "{}"));
const base: Record<string, number> = JSON.parse(flag("base", "{}"));
const passthrough = ["--t", flag("t", "1500"), "--seeds", flag("seeds", "1,2,3,4"), "--preset", flag("preset", "balanced")];
if (args.includes("--full")) passthrough.push("--full");

let configs: Record<string, number>[] = [{ ...base }];
for (const [k, values] of Object.entries(grid)) {
  configs = configs.flatMap((c) => values.map((v) => ({ ...c, [k]: v })));
}

const parallel = Math.max(1, availableParallelism() - 1);
let next = 0;
const results: string[] = [];

function run(): Promise<void> {
  if (next >= configs.length) return Promise.resolve();
  const cfg = configs[next++];
  return new Promise<void>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/sweep.ts", ...passthrough, "--configs", JSON.stringify([cfg])], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", () => {
      const line = out.trim();
      results.push(line);
      console.log(line);
      resolve();
    });
  }).then(run);
}

await Promise.all(Array.from({ length: parallel }, run));
console.log("\n--- ranked ---");
results
  .sort((a, b) => Number(b.split("/")[0]) - Number(a.split("/")[0]))
  .slice(0, 12)
  .forEach((l) => console.log(l));
