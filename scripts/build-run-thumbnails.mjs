import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const runsRoot = join(root, "runs")
const force = process.argv.includes("--force")

/** Wide enough to stay sharp on a retina 240px card slot. */
const THUMBNAIL_WIDTH = 480
const QUALITY = 72

function hasCommand(command) {
  try {
    execFileSync("command", ["-v", command], { shell: "/bin/sh", stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

const useWebp = hasCommand("cwebp")
if (!useWebp && !hasCommand("sips")) {
  throw new Error("Install cwebp (brew install webp) to build run thumbnails")
}

function encode(source, target) {
  if (useWebp) {
    execFileSync(
      "cwebp",
      [
        "-quiet",
        "-q",
        String(QUALITY),
        "-resize",
        String(THUMBNAIL_WIDTH),
        "0",
        "-m",
        "6",
        source,
        "-o",
        target,
      ],
      { stdio: "ignore" }
    )
    return
  }
  // sips ships with macOS but reads the width as a bounding box, which is the
  // same result here because every screenshot is landscape.
  execFileSync(
    "sips",
    ["-s", "format", "webp", "-Z", String(THUMBNAIL_WIDTH), source, "--out", target],
    { stdio: "ignore" }
  )
}

function screenshots() {
  if (!existsSync(runsRoot)) return []
  const found = []
  for (const run of readdirSync(runsRoot, { withFileTypes: true })) {
    if (!run.isDirectory()) continue
    const dataDir = join(runsRoot, run.name, "data")
    if (!existsSync(dataDir)) continue
    for (const task of readdirSync(dataDir, { withFileTypes: true })) {
      if (!task.isDirectory()) continue
      const source = join(dataDir, task.name, "screenshot.png")
      if (existsSync(source)) found.push(source)
    }
  }
  return found.sort()
}

let built = 0
let skipped = 0
let bytesIn = 0
let bytesOut = 0

for (const source of screenshots()) {
  const target = join(dirname(source), "thumbnail.webp")
  const sourceStat = statSync(source)
  if (!force && existsSync(target) && statSync(target).mtimeMs >= sourceStat.mtimeMs) {
    skipped += 1
    continue
  }

  try {
    encode(source, target)
  } catch (error) {
    process.stderr.write(`failed\t${relative(root, source)}\t${error.message}\n`)
    continue
  }

  built += 1
  bytesIn += sourceStat.size
  bytesOut += statSync(target).size
}

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`
process.stdout.write(
  `thumbnails: ${built} built, ${skipped} up to date` +
    (built ? ` (${megabytes(bytesIn)} → ${megabytes(bytesOut)})` : "") +
    "\n"
)
