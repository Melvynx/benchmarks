import { spawn } from "node:child_process";
import { mkdir, open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const tmp = join(homedir(), ".dev-browser", "tmp");
const FPS = Number(process.env.FPS || 60);
const TOTAL = FPS * 45;
const WORKERS = Number(process.env.WORKERS || 8);
const BATCH = Number(process.env.BATCH || 36);
const MAX_ATTEMPTS = 4;

const template = await readFile(join(root, "tools", "render-chunk.js"), "utf8");
const outDir = join(root, "tools", ".render");
await mkdir(outDir, { recursive: true });

const IEND = Buffer.from("0000000049454e44ae426082", "hex");
async function validFrames() {
  const ok = new Set();
  for (const name of await readdir(tmp)) {
    const m = /^s55-f(\d{5})\.png$/.exec(name);
    if (!m) continue;
    const path = join(tmp, name);
    const { size } = await stat(path);
    if (size < 2000) continue;
    const fh = await open(path, "r");
    const tail = Buffer.alloc(12);
    await fh.read(tail, 0, 12, size - 12);
    await fh.close();
    if (tail.equals(IEND)) ok.add(Number(m[1]));
  }
  return ok;
}

const have = await validFrames();
// pass 0 renders even frames (a complete half-rate video), pass 1 fills the odd frames
const queue = [];
for (const pass of [0, 1]) {
  for (let i = pass; i < TOTAL; ) {
    if (have.has(i)) { i += 2; continue; }
    let j = i, n = 0;
    while (j < TOTAL && !have.has(j) && n < BATCH) { j += 2; n++; }
    queue.push({ start: i, end: j, attempts: 0, pass });
    i = j;
  }
}
const pass0Total = queue.filter((q) => q.pass === 0).length;
let pass0Done = 0;
console.log(`have ${have.size}/${TOTAL}, ${queue.length} batches (${pass0Total} even-frame) with ${WORKERS} workers`);

let done = 0;
const failed = [];
async function runBatch(w, job) {
  const file = join(outDir, `w${w}.js`);
  await writeFile(
    file,
    template
      .replace("__START__", job.start)
      .replace("__END__", job.end)
      .replace("__FPS__", FPS)
      .replace("__PAGE__", `s55-w${w}`),
  );
  return new Promise((resolve) => {
    const p = spawn("dev-browser", ["--browser", `s55w${w}`, "--headless", "--timeout", "600", "run", file], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve(code === 0 && out.includes('"errs":[]') ? null : out.trim().slice(-300)));
  });
}

async function worker(w) {
  while (queue.length) {
    const job = queue.shift();
    job.attempts++;
    const err = await runBatch(w, job);
    if (err === null) {
      done++;
      if (job.pass === 0 && ++pass0Done === pass0Total) console.log("EVEN_FRAMES_DONE (30 fps video is complete)");
      if (done % 5 === 0) console.log(`batches done ${done}, last [${job.start},${job.end}) by w${w}`);
    } else if (job.attempts < MAX_ATTEMPTS) {
      console.log(`retry [${job.start},${job.end}) attempt ${job.attempts}: ${err}`);
      queue.push(job);
    } else {
      failed.push(job);
    }
  }
}
await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));

const after = await validFrames();
const missing = [];
for (let i = 0; i < TOTAL; i++) if (!after.has(i)) missing.push(i);
if (failed.length || missing.length) {
  console.error(`INCOMPLETE: ${missing.length} missing frames, failed batches ${JSON.stringify(failed)}`);
  process.exit(1);
}
console.log(`RENDER_DONE frames=${TOTAL} fps=${FPS}`);
