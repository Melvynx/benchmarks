
import { readFileSync, writeFileSync } from "fs";

import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");

const pdf = require("pdf-parse");
const buf = readFileSync("document.pdf");
try {
  const data = await pdf(buf);
  const text = (data.text || "").trim();
  if (!text) throw new Error("pdf-parse returned empty text");
  writeFileSync("output.txt", text + "\n");
} catch (error) {
  console.error(String(error));
  writeFileSync("output.txt", buf.toString("utf8"));
}
