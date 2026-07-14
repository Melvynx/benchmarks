#!/usr/bin/env bun
// @ts-nocheck

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path: string;
    content: string;
  };
  tool_response: {
    filePath: string;
    success: boolean;
  };
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    additionalContext: string;
  };
}

async function runCommand(
  command: string[],
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  try {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const success = (await proc.exited) === 0;

    return { stdout, stderr, success };
  } catch (error) {
    return { stdout: "", stderr: String(error), success: false };
  }
}

async function main() {
  const input = await Bun.stdin.text();
  let hookData: HookInput;
  try {
    hookData = JSON.parse(input);
  } catch (error) {
    process.exit(0);
  }

  const filePath = hookData.tool_input?.file_path;
  if (!filePath) {
    process.exit(0);
  }

  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
    process.exit(0);
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    process.exit(1);
  }

  await runCommand(["bun", "x", "prettier", "--write", filePath]);

  await runCommand([
    "bun",
    "x",
    "eslint",
    "--fix",
    "--no-warn-ignored",
    filePath,
  ]);

  const [eslintCheckResult, tscResult] = await Promise.all([
    runCommand(["bun", "x", "eslint", "--no-warn-ignored", filePath]),
    runCommand(["bun", "x", "tsc", "--noEmit", "--pretty", "false"]),
  ]);

  const eslintErrors = (
    eslintCheckResult.stdout + eslintCheckResult.stderr
  ).trim();

  const relativePath = filePath.replace(hookData.cwd + "/", "");
  const tsErrorOutput = tscResult.stdout + tscResult.stderr;
  const tsErrors = tsErrorOutput
    .split("\n")
    .filter((line) => line.includes(relativePath) || line.includes(filePath))
    .join("\n");

  let errorMessage = "";

  if (tsErrors || eslintErrors) {
    errorMessage = `There are some errors and/or warnings detected in ${filePath
      .split("/")
      .pop()}:\\nPlease address these now if you are actively working on this file, or make a note to fix them soon.\\n`;

    if (tsErrors) {
      errorMessage += `\\n TypeScript errors:\\n${tsErrors}\\n`;
    }

    if (eslintErrors) {
      errorMessage += `\\n ESLint errors:\\n${eslintErrors}\\n`;
    }
  }

  if (errorMessage) {
    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: errorMessage,
      },
    };

    console.log(JSON.stringify(output, null, 2));
  } else {
    console.error(`No errors detected in ${filePath.split("/").pop()}`);
  }
}

main().catch((error) => {
  process.exit(1);
});
