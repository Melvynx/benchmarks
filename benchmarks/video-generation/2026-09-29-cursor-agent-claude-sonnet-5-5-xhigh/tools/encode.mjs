import { spawnSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const tmp = join(homedir(), ".dev-browser", "tmp");
const FPS = Number(process.env.FPS || 60);
const SRC_FPS = 60;
const stride = SRC_FPS / FPS;
const total = FPS * 45;
const dir = join(root, "tools", ".render", `frames-${FPS}`);
mkdirSync(dir, { recursive: true });

const present = new Set(readdirSync(tmp).filter((n) => /^s55-f\d{5}\.png$/.test(n)));
for (let k = 0; k < total; k++) {
  const name = `s55-f${String(k * stride).padStart(5, "0")}.png`;
  if (!present.has(name)) throw new Error(`missing source frame ${name}`);
  const dst = join(dir, `f${String(k).padStart(5, "0")}.png`);
  if (!existsSync(dst)) linkSync(join(tmp, name), dst);
}

const out = process.env.OUT || join(root, "video.mp4");
const args = [
  "-y", "-hide_banner", "-loglevel", "error",
  "-framerate", String(FPS), "-i", join(dir, "f%05d.png"),
  "-i", join(root, "tools", ".render", "audio.wav"),
  "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+bicubic,format=yuv420p,setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv",
  "-af", "acompressor=threshold=0.16:ratio=2:attack=10:release=180:makeup=2:knee=6,alimiter=limit=0.78:attack=3:release=70:level=disabled,aresample=48000",
  "-c:v", "libx264", "-preset", process.env.PRESET || "slow", "-crf", process.env.CRF || "16",
  "-profile:v", "high", "-level:v", FPS > 30 ? "4.2" : "4.1", "-g", String(FPS * 2), "-bf", "3",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
  "-fps_mode", "cfr", "-t", "45", "-movflags", "+faststart", out,
];
const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
process.exit(r.status ?? 1);
