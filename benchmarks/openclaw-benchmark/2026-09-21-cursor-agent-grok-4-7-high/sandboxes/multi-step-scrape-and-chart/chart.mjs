
import { readFileSync, writeFileSync, existsSync } from "fs";
const names = ["Python", "C++", "C#", "Java", "C", "JavaScript", "Go", "Rust", "TypeScript", "PHP", "Visual Basic", "SQL", "Scratch", "Assembly", "Fortran", "MATLAB", "Kotlin", "Swift", "Ruby", "Dart"];
function extract(html) {
  const found = [];
  const seen = new Set();
  for (const name of names) {
    const pattern = new RegExp(name.replace("+", "\\+").replace("#", "#") + "[\\s\\S]{0,120}?(\\d+\\.\\d+)\\s*%", "i");
    const match = html.match(pattern);
    if (!match) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name, value: Number(match[1]) });
  }
  return found.sort((a, b) => b.value - a.value).slice(0, 10);
}
let languages = [];
for (const file of ["tiobe.html", "wiki-tiobe.html", "pypl.html"]) {
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const parsed = extract(html);
  if (parsed.length >= 3) {
    languages = parsed;
    break;
  }
}
if (languages.length < 3) {
  console.error("could not parse language rankings");
  process.exit(2);
}
const width = 760;
const row = 36;
const height = 50 + languages.length * row;
const max = Math.max(...languages.map((item) => item.value));
const bars = languages.map((item, index) => {
  const y = 40 + index * row;
  const bar = Math.max(2, Math.round((item.value / max) * 460));
  return '<rect x="180" y="' + y + '" width="' + bar + '" height="24" fill="#2563eb"></rect><text x="170" y="' + (y + 17) + '" text-anchor="end" font-size="14">' + item.name + '</text><text x="' + (190 + bar) + '" y="' + (y + 17) + '" font-size="12">' + item.value.toFixed(2) + '%</text>';
}).join("\n");
const svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">\n<rect width="100%" height="100%" fill="#ffffff"></rect>\n<text x="180" y="24" font-size="16">Programming language popularity</text>\n' + bars + '\n</svg>\n';
writeFileSync("chart.svg", svg);
console.log(languages.map((item) => item.name + " " + item.value).join("\n"));
