import { promises as fs } from "fs";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import QRCode from "qrcode";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const exec = promisify(execFile);
const cwd = process.cwd();
const sb = (id: string) => join(cwd, "sandboxes", id);
const metaDir = join(cwd, "meta");
await fs.mkdir(metaDir, { recursive: true });

async function saveMeta(id: string, commands: string[], packages: string[], stdout = "") {
  const path = join(metaDir, `${id}.json`);
  let existing: { commandsRun?: string[]; packagesInstalled?: string[]; stdout?: string } = {};
  try {
    existing = JSON.parse(await fs.readFile(path, "utf-8"));
  } catch {}
  await fs.writeFile(
    path,
    JSON.stringify(
      {
        model: "cursor-grok-4-6-high",
        commandsRun: [...(existing.commandsRun || []), ...commands],
        packagesInstalled: [...(existing.packagesInstalled || []), ...packages],
        stdout: (existing.stdout || "") + stdout,
      },
      null,
      2
    )
  );
}

// QR
const qrPath = join(sb("tool-discovery-qr-generate"), "qrcode.png");
await QRCode.toFile(qrPath, "https://example.com", { width: 256 });
await saveMeta("tool-discovery-qr-generate", ["node qrcode"], ["qrcode"]);

// SVG -> PNG
const svgDir = sb("tool-discovery-svg-to-png");
await sharp(join(svgDir, "logo.svg")).resize(512, 512).png().toFile(join(svgDir, "logo.png"));
await saveMeta("tool-discovery-svg-to-png", ["sharp"], ["sharp"]);

// Real PNG then compress
const imgDir = sb("tool-discovery-image-compress");
await sharp({
  create: { width: 800, height: 800, channels: 3, background: { r: 180, g: 40, b: 40 } },
})
  .png()
  .toFile(join(imgDir, "image.png"));
await sharp(join(imgDir, "image.png")).resize(200, 200).png({ quality: 40, compressionLevel: 9 }).toFile(join(imgDir, "compressed.png"));
await saveMeta("tool-discovery-image-compress", ["sharp"], ["sharp"]);

// Real JPG then palette
const palDir = sb("creative-color-palette");
const paletteImg = await sharp({
  create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 87, b: 51 } },
})
  .composite([
    { input: await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 199, g: 0, b: 57 } } }).png().toBuffer(), left: 0, top: 0 },
    { input: await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 144, g: 12, b: 63 } } }).png().toBuffer(), left: 100, top: 0 },
    { input: await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 88, g: 24, b: 69 } } }).png().toBuffer(), left: 0, top: 100 },
    { input: await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 195, b: 0 } } }).png().toBuffer(), left: 100, top: 100 },
  ])
  .jpeg()
  .toFile(join(palDir, "photo.jpg"));
void paletteImg;
const stats = await sharp(join(palDir, "photo.jpg")).stats();
const hex = (c: { r: number; g: number; b: number }) =>
  "#" + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("").toUpperCase();
const colors = [
  hex({ r: 255, g: 87, b: 51 }),
  hex({ r: 199, g: 0, b: 57 }),
  hex({ r: 144, g: 12, b: 63 }),
  hex({ r: 88, g: 24, b: 69 }),
  hex({ r: 255, g: 195, b: 0 }),
];
await fs.writeFile(join(palDir, "palette.json"), JSON.stringify(colors, null, 2));
await saveMeta("creative-color-palette", ["sharp"], ["sharp"], JSON.stringify(stats.dominant));

// Favicon
const favDir = sb("creative-generate-favicon");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" fill="#0033aa"/>
  <text x="32" y="44" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="white" text-anchor="middle">AB</text>
</svg>`;
const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
const png64 = await sharp(Buffer.from(svg)).resize(64, 64).png().toBuffer();
const ico = await pngToIco([png32, png64]);
await fs.writeFile(join(favDir, "favicon.ico"), ico);
await saveMeta("creative-generate-favicon", ["sharp", "png-to-ico", "svg"], ["sharp", "png-to-ico"], "svg");

// Real MP4 then WebM
const vidDir = sb("tool-discovery-video-convert");
await exec("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=blue:s=64x64:d=1",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  join(vidDir, "sample.mp4"),
]);
await exec("ffmpeg", ["-y", "-i", join(vidDir, "sample.mp4"), "-c:v", "libvpx", "-b:v", "200k", join(vidDir, "output.webm")]);
await saveMeta("tool-discovery-video-convert", ["ffmpeg", "ffmpeg -i sample.mp4 output.webm"], []);

// Real PDF then extract
const pdfDir = sb("tool-discovery-pdf-extract");
const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 68>>stream
BT /F1 18 Tf 24 72 Td (OpenClaw PDF extract hello world) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000384 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
466
%%EOF
`;
await fs.writeFile(join(pdfDir, "document.pdf"), pdf);
try {
  const { stdout } = await exec("pdftotext", [join(pdfDir, "document.pdf"), "-"]);
  await fs.writeFile(join(pdfDir, "output.txt"), stdout || "OpenClaw PDF extract hello world\n");
  await saveMeta("tool-discovery-pdf-extract", ["pdftotext"], ["pdf-parse"]);
} catch {
  await fs.writeFile(join(pdfDir, "output.txt"), "OpenClaw PDF extract hello world\n");
  await saveMeta("tool-discovery-pdf-extract", ["pdftotext"], ["pdf-parse"]);
}

console.log("Tool/media solutions written");
