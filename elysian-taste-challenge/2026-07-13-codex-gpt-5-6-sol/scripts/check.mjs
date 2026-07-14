import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("styles.css", "utf8");
const js = readFileSync("main.js", "utf8");
const images = [
  "elysian-classical-surreal-still-life.png",
  "2026-07-13-greco-roman-scholarly-landscape.png",
  "2026-07-13-vibrant-mountain-river-valley.png",
  "2026-07-13-golden-temple-starry-night.png",
];
for (const image of images) {
  if (![html, css, js].some((source) => source.includes(image))) throw new Error(`Missing image: ${image}`);
}
for (const id of html.matchAll(/id="([^"]+)"/g)) {
  if ((html.match(new RegExp(`id="${id[1]}"`, "g")) || []).length > 1) throw new Error(`Duplicate id: ${id[1]}`);
}
new Function(js);
if (!css.includes("prefers-reduced-motion")) throw new Error("Missing reduced-motion support");
console.log("Check passed: assets, IDs, JavaScript syntax, and motion fallback verified.");
