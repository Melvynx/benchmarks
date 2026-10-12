
import { writeFileSync } from "fs";

import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");

const sharp = require("sharp");
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#0000ff"/><text x="32" y="42" font-size="28" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">AB</text></svg>';
const png = await sharp(Buffer.from(svg)).png().toBuffer();
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(64, 0);
entry.writeUInt8(64, 1);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);
const ico = Buffer.concat([header, entry, png]);
if (ico.length < 100) throw new Error("favicon too small: " + ico.length);
writeFileSync("favicon.ico", ico);
