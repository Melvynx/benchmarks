
import { readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

function walk(dir, prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(abs, rel));
    else found.push(rel);
  }
  return found;
}

function junk(rel) {
  const base = rel.split("/").pop() || "";
  if (base === ".DS_Store") return true;
  if (rel.split("/").includes("node_modules") || rel.split("/").includes(".cache")) return true;
  return base.endsWith(".tmp") || base.endsWith(".log");
}

const items = walk(".").filter(junk).map((path) => ({ path, size: statSync(path).size }));
writeFileSync("cleanup-report.json", JSON.stringify({ items }, null, 2) + "\n");
