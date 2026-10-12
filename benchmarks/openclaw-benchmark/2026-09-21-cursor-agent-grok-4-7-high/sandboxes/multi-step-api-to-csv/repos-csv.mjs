
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("github.json", "utf8"));
if (!Array.isArray(data.items)) {
  console.error(JSON.stringify(data).slice(0, 500));
  process.exit(2);
}
const header = "rank,name,owner,stars,language,description";
const rows = data.items.slice(0, 30).map((item, index) => {
  const description = String(item.description || "").replace(/[\r\n,]/g, " ").slice(0, 100);
  const language = String(item.language || "").replace(/,/g, " ");
  return [index + 1, item.full_name, item.owner.login, item.stargazers_count, language, description].join(",");
});
writeFileSync("repos.csv", [header, ...rows].join("\n") + "\n");
