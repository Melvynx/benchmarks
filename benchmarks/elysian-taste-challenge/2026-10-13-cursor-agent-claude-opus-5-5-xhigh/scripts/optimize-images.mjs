import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src-assets");
const out = path.join(root, "public", "img");

const jobs = [
  { file: "still-life.png", name: "still-life", widths: [2400, 1400] },
  { file: "scholarly.png", name: "scholarly", widths: [1456, 900] },
  { file: "valley.png", name: "valley", widths: [1456, 900] },
  { file: "temple.png", name: "temple", widths: [1456, 900] },
];

await mkdir(out, { recursive: true });

for (const job of jobs) {
  for (const width of job.widths) {
    const target = path.join(out, `${job.name}-${width}.webp`);
    await sharp(path.join(src, job.file))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 6, smartSubsample: true })
      .toFile(target);
    const { size } = await stat(target);
    console.log(`${path.relative(root, target)}  ${(size / 1024).toFixed(0)} KB`);
  }
}
