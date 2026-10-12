import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const promptsDirectory = path.join(root, "prompts");
const runnerPath = path.join(
  root,
  ".agents/skills/run-benchmark/scripts/run-benchmark.sh",
);
const titleInstruction =
  "Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.";
const forbiddenPromptPatterns = [
  { label: "benchmark disclosure", pattern: /\bbenchmark(?:s|ing)?\b/i },
  { label: "evaluation disclosure", pattern: /\bevaluation\b/i },
  { label: "completion sentinel", pattern: /BENCHMARK_COMPLETE/ },
];

const promptDirectories = (
  await readdir(promptsDirectory, { withFileTypes: true })
)
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const failures = [];

for (const directory of promptDirectories) {
  const versionFiles = (await readdir(path.join(promptsDirectory, directory)))
    .map((file) => ({ file, match: /^v(\d+)\.md$/.exec(file) }))
    .filter(({ match }) => match)
    .sort((left, right) => Number(right.match[1]) - Number(left.match[1]));

  if (versionFiles.length === 0) {
    failures.push(`${directory}: no versioned prompt`);
    continue;
  }

  const latestPath = path.join(promptsDirectory, directory, versionFiles[0].file);
  const prompt = await readFile(latestPath, "utf8");

  for (const { label, pattern } of forbiddenPromptPatterns) {
    if (pattern.test(prompt)) {
      failures.push(`${path.relative(root, latestPath)}: ${label}`);
    }
  }
}

const runner = await readFile(runnerPath, "utf8");
const requiredRunnerText = [
  "Work only inside the current working directory.",
  "Do not read, list, search, or edit files outside the current working directory. Treat it as a standalone project root.",
  titleInstruction,
  "Run the relevant checks yourself. Do not edit files outside the current working directory.",
];
const forbiddenRunnerText = [
  "End your final response with exactly BENCHMARK_COMPLETE.",
  "Do not edit other benchmark results or the run evidence",
  "Work only inside: $app_dir",
];

for (const required of requiredRunnerText) {
  if (!runner.includes(required)) {
    failures.push(`run-benchmark.sh: missing required neutral instruction: ${required}`);
  }
}

for (const forbidden of forbiddenRunnerText) {
  if (runner.includes(forbidden)) {
    failures.push(`run-benchmark.sh: contains model-facing disclosure: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Verified ${promptDirectories.length} latest prompts and the neutral runner wrapper.`,
);
