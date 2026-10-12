
import { readFileSync, writeFileSync } from "fs";
const rows = JSON.parse(readFileSync("data.json", "utf8"));
function flatten(value, prefix = "", out = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? prefix + "." + key : key, out);
    }
    return out;
  }
  out[prefix] = value;
  return out;
}
const flat = rows.map((row) => flatten(row));
const headers = [...new Set(flat.flatMap((row) => Object.keys(row)))];
const csv = [headers.join(",")];
for (const row of flat) csv.push(headers.map((key) => row[key] ?? "").join(","));
writeFileSync("output.csv", csv.join("\n") + "\n");
