
import { readFileSync, writeFileSync } from "fs";
const counts = new Map();
for (const line of readFileSync("access.log", "utf8").split(/\n/)) {
  if (!line.trim()) continue;
  const ip = line.split(" ")[0];
  counts.set(ip, (counts.get(ip) || 0) + 1);
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([ip, count]) => ({ ip, count }));
writeFileSync("report.json", JSON.stringify(top, null, 2) + "\n");
