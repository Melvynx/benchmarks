import { promises as fs } from "fs";
import { join, basename, dirname, resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import {
  Benchmark,
  BenchmarkResult,
  RunOptions,
  ValidationContext,
} from "./types.js";

export async function prepareSandbox(
  benchmark: Benchmark,
  baseDir?: string
): Promise<string> {
  const tmpBase = baseDir || tmpdir();
  const sandboxName = `benchmark-${randomBytes(8).toString("hex")}`;
  const sandboxDir = join(tmpBase, sandboxName);

  await fs.mkdir(sandboxDir, { recursive: true });

  if (benchmark.fixtures && benchmark.fixtures.length > 0) {
    for (const fixture of benchmark.fixtures) {
      const filePath = resolve(sandboxDir, fixture.filename);
      if (!filePath.startsWith(resolve(sandboxDir))) {
        throw new Error(`Path traversal detected in fixture: ${fixture.filename}`);
      }
      const dirPath = dirname(filePath);

      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, fixture.content, {
        encoding: fixture.encoding || "utf-8",
      });
    }
  }

  return sandboxDir;
}

export async function validateSandbox(
  benchmark: Benchmark,
  sandboxDir: string,
  meta: {
    model: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    commandsRun: string[];
    packagesInstalled: string[];
  }
): Promise<BenchmarkResult> {
  let outputFiles: string[] = [];

  try {
    outputFiles = await listFilesRecursive(sandboxDir);
  } catch {
    outputFiles = [];
  }

  const context: ValidationContext = {
    sandboxDir,
    outputFiles,
    stdout: meta.stdout,
    stderr: meta.stderr,
    exitCode: meta.exitCode,
    duration: meta.duration,
    commandsRun: meta.commandsRun,
    packagesInstalled: meta.packagesInstalled,
  };

  const validation = await benchmark.validate(context);

  return {
    benchmarkId: benchmark.id,
    benchmarkName: benchmark.name,
    category: benchmark.category,
    difficulty: benchmark.difficulty,
    model: meta.model || "unknown",
    passed: validation.passed,
    score: validation.score,
    reason: validation.reason,
    duration: meta.duration,
    commandsRun: meta.commandsRun,
    packagesInstalled: meta.packagesInstalled,
    timestamp: new Date().toISOString(),
    details: validation.details,
  };
}

export async function cleanupSandbox(sandboxDir: string): Promise<void> {
  try {
    await fs.rm(sandboxDir, { recursive: true, force: true });
  } catch {
    // Silently ignore cleanup errors
  }
}

export async function runBenchmarkManual(
  benchmark: Benchmark,
  options: RunOptions
): Promise<{ sandboxDir: string; prompt: string }> {
  const sandboxDir = await prepareSandbox(
    benchmark,
    options.sandboxBase || undefined
  );

  const hints = benchmark.hints
    ? "\n\nHints:\n" + benchmark.hints.map((h) => `- ${h}`).join("\n")
    : "";

  const toolsHint =
    "\n\nAvailable tools: File system access, terminal/bash, pnpm package manager, code editors. Use pnpm exclusively for dependency installation and package scripts; do not use npm.";

  const prompt = `${benchmark.prompt}

Sandbox path: ${sandboxDir}${hints}${toolsHint}`;

  return {
    sandboxDir,
    prompt,
  };
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string, prefix: string = ""): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? join(prefix, entry.name) : entry.name;

      if (entry.isDirectory()) {
        await walk(join(currentPath, entry.name), relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  await walk(dir);
  return files;
}
