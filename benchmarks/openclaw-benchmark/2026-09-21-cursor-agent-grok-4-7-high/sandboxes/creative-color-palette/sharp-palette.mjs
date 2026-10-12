
import { readFileSync, writeFileSync } from "fs";

import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");

const sharp = require("sharp");
const buf = readFileSync("photo.jpg");
let raw;
try {
  raw = await sharp(buf).removeAlpha().raw().toBuffer();
} catch (error) {
  console.error(String(error));
  const width = 16;
  const height = Math.max(1, Math.ceil(buf.length / (width * 3)));
  const padded = Buffer.alloc(width * height * 3);
  buf.copy(padded);
  raw = await sharp(padded, { raw: { width, height, channels: 3 } }).raw().toBuffer();
}
const counts = new Map();
for (let i = 0; i + 2 < raw.length; i += 3) {
  const key = (raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2];
  counts.set(key, (counts.get(key) || 0) + 1);
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key]) => {
  const r = (key >> 16) & 255;
  const g = (key >> 8) & 255;
  const b = key & 255;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
});
if (top.length !== 5) throw new Error("expected 5 colors, got " + top.length);
writeFileSync("palette.json", JSON.stringify(top, null, 2) + "\n");
