
import { readFileSync, writeFileSync } from "fs";
const raw = readFileSync("sample.mp4");
const width = 16;
const height = 16;
const padded = Buffer.alloc(width * height * 3);
raw.copy(padded);
writeFileSync("sample.rgb", padded);
