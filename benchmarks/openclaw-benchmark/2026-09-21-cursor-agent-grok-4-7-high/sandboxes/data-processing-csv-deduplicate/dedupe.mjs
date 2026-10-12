
import { readFileSync, writeFileSync } from "fs";
const lines = readFileSync("data.csv", "utf8").trim().split(/\n/);
const header = lines[0];
const cols = header.split(",");
const emailIdx = cols.indexOf("email");
const dateIdx = cols.indexOf("date");
const best = new Map();
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const parts = line.split(",");
  const email = parts[emailIdx];
  const date = parts[dateIdx];
  const prev = best.get(email);
  if (!prev || date > prev.date) best.set(email, { date, line });
}
writeFileSync("cleaned.csv", [header, ...[...best.values()].map((row) => row.line)].join("\n") + "\n");
