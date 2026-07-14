import { promises as fs } from "fs";
import { join, resolve } from "path";

function safePath(sandboxDir: string, filename: string): string {
  const resolved = resolve(sandboxDir, filename);
  if (!resolved.startsWith(resolve(sandboxDir))) {
    throw new Error(`Path traversal detected: ${filename}`);
  }
  return resolved;
}

export async function fileExists(
  sandboxDir: string,
  filename: string
): Promise<boolean> {
  try {
    await fs.access(safePath(sandboxDir, filename));
    return true;
  } catch {
    return false;
  }
}

export async function fileContains(
  sandboxDir: string,
  filename: string,
  content: string
): Promise<boolean> {
  try {
    const fileContent = await fs.readFile(safePath(sandboxDir, filename), "utf-8");
    return fileContent.includes(content);
  } catch {
    return false;
  }
}

export async function fileMatchesRegex(
  sandboxDir: string,
  filename: string,
  regex: RegExp
): Promise<boolean> {
  try {
    const fileContent = await fs.readFile(safePath(sandboxDir, filename), "utf-8");
    return regex.test(fileContent);
  } catch {
    return false;
  }
}

export async function fileSizeInRange(
  sandboxDir: string,
  filename: string,
  min: number,
  max: number
): Promise<boolean> {
  try {
    const stats = await fs.stat(safePath(sandboxDir, filename));
    return stats.size >= min && stats.size <= max;
  } catch {
    return false;
  }
}

export async function fileIsValidJson(
  sandboxDir: string,
  filename: string
): Promise<boolean> {
  try {
    const fileContent = await fs.readFile(safePath(sandboxDir, filename), "utf-8");
    JSON.parse(fileContent);
    return true;
  } catch {
    return false;
  }
}

export async function fileIsValidHtml(
  sandboxDir: string,
  filename: string
): Promise<boolean> {
  try {
    const fileContent = await fs.readFile(safePath(sandboxDir, filename), "utf-8");
    return /<[^>]+>/g.test(fileContent);
  } catch {
    return false;
  }
}

export async function fileHasExtension(
  sandboxDir: string,
  filename: string,
  ext: string
): Promise<boolean> {
  try {
    const file = safePath(sandboxDir, filename);
    return file.endsWith(ext);
  } catch {
    return false;
  }
}

export async function directoryHasFiles(
  sandboxDir: string,
  dir: string,
  minCount: number
): Promise<boolean> {
  try {
    const files = await fs.readdir(join(sandboxDir, dir));
    return files.length >= minCount;
  } catch {
    return false;
  }
}

export async function stdoutContains(
  stdout: string,
  content: string
): Promise<boolean> {
  return stdout.includes(content);
}

export async function stdoutMatchesRegex(
  stdout: string,
  regex: RegExp
): Promise<boolean> {
  return regex.test(stdout);
}

export async function commandWasUsed(
  commands: string[],
  toolName: string
): Promise<boolean> {
  return commands.some((cmd) => cmd.includes(toolName));
}

export async function packageWasInstalled(
  packages: string[],
  packageName: string
): Promise<boolean> {
  return packages.includes(packageName);
}
