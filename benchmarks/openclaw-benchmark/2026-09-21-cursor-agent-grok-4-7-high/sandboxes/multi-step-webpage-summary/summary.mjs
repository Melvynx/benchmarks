
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("wiki.json", "utf8"));
const page = Object.values(data.query.pages)[0];
const extract = String(page.extract || "").replace(/\s+/g, " ").trim();
if (!extract) {
  console.error("empty wikipedia extract");
  process.exit(2);
}
const sentences = extract.split(/(?<=\.)\s+/).filter((sentence) => sentence.length > 40);
const bullets = sentences.slice(0, 5).map((sentence) => "- " + sentence);
while (bullets.length < 5) bullets.push("- " + extract.slice(0, 220));
let text = bullets.join("\n") + "\n";
if (text.length < 220) text += "- " + extract.slice(0, 400) + "\n";
writeFileSync("summary.txt", text);
