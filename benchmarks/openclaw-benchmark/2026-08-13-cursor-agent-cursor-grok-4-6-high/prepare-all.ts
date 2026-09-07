import { promises as fs } from "fs";
import { dirname, join, resolve } from "path";
import { benchmarks } from "./benchmarks/index.js";

const root = join(process.cwd(), "sandboxes");
await fs.mkdir(root, { recursive: true });

for (const benchmark of benchmarks) {
  const sandboxDir = join(root, benchmark.id);
  await fs.mkdir(sandboxDir, { recursive: true });

  if (benchmark.fixtures) {
    for (const fixture of benchmark.fixtures) {
      const filePath = resolve(sandboxDir, fixture.filename);
      if (!filePath.startsWith(resolve(sandboxDir))) {
        throw new Error(`Path traversal: ${fixture.filename}`);
      }
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, fixture.content, {
        encoding: fixture.encoding || "utf-8",
      });
    }
  }

  console.log(benchmark.id);
}

console.log(`Prepared ${benchmarks.length} sandboxes in ${root}`);
