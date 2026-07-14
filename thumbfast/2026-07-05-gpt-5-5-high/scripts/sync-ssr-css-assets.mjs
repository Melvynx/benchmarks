import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ssrAssetsDir = join(
  process.cwd(),
  "node_modules/.nitro/vite/services/ssr/assets",
);
const publicAssetsDir = join(process.cwd(), ".output/public/assets");

if (!existsSync(ssrAssetsDir) || !existsSync(publicAssetsDir)) {
  process.exit(0);
}

mkdirSync(publicAssetsDir, { recursive: true });

for (const file of readdirSync(ssrAssetsDir)) {
  if (!file.endsWith(".css")) continue;

  const source = join(ssrAssetsDir, file);
  const destination = join(publicAssetsDir, file);

  if (!existsSync(destination)) {
    copyFileSync(source, destination);
  }
}

const serverEntryPath = join(process.cwd(), ".output/server/index.mjs");

if (existsSync(serverEntryPath)) {
  let serverEntry = readFileSync(serverEntryPath, "utf8");

  for (const file of readdirSync(publicAssetsDir)) {
    if (!file.endsWith(".css")) continue;

    const publicPath = `/assets/${file}`;
    if (serverEntry.includes(`"${publicPath}"`)) continue;

    const stats = statSync(join(publicAssetsDir, file));
    const entry = [
      `\t"${publicPath}": {`,
      `\t\t"type": "text/css; charset=utf-8",`,
      `\t\t"etag": "\\"${stats.size.toString(16)}-${file}\\"",`,
      `\t\t"mtime": "${stats.mtime.toISOString()}",`,
      `\t\t"size": ${stats.size},`,
      `\t\t"path": "../public/assets/${file}"`,
      `\t},`,
    ].join("\n");

    serverEntry = serverEntry.replace(
      /(var public_assets_data_default = \{\n)/,
      `$1${entry}\n`,
    );
  }

  writeFileSync(serverEntryPath, serverEntry);
}
