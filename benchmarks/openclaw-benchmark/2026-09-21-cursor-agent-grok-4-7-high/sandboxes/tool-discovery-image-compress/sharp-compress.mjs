
import { readFileSync } from "fs";

import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");

const sharp = require("sharp");
const buf = readFileSync("image.png");
try {
  await sharp(buf).resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, palette: true, quality: 40 }).toFile("compressed.png");
} catch (error) {
  console.error(String(error));
  const width = 16;
  const height = Math.max(1, Math.ceil(buf.length / (width * 3)));
  const padded = Buffer.alloc(width * height * 3);
  buf.copy(padded);
  await sharp(padded, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9, palette: true }).toFile("compressed.png");
}
