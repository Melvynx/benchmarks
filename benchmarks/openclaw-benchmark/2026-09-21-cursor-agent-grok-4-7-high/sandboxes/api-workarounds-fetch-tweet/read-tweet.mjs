
import { readFileSync, writeFileSync } from "fs";
const raw = readFileSync("tweet-raw.json", "utf8");
const data = JSON.parse(raw);
const text = data?.tweet?.text || data?.text || "";
if (!text || !String(text).trim()) {
  console.error(raw.slice(0, 500));
  process.exit(2);
}
writeFileSync("tweet.txt", String(text).trim() + "\n");
