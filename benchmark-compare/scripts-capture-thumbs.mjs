// Captures a screenshot of every generated app that has no thumbnail yet and
// stores it as public/thumbs/<id>.webp, a UI cache outside the run evidence.
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, unlinkSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(join(process.env.HOME, ".dev-browser/package.json"))
const { chromium } = require("playwright")

const BASE = "http://127.0.0.1:9080"
const OUT = join(import.meta.dirname, "public/thumbs")
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4)
mkdirSync(OUT, { recursive: true })

const { entries } = await (await fetch(`${BASE}/api/catalog`)).json()
const todo = entries.filter(
  (entry) => entry.hasPreview && !entry.thumbnail && !existsSync(join(OUT, `${thumbName(entry.id)}.webp`))
)
console.log(`${todo.length} apps to capture`)

function thumbName(id) {
  return id.replaceAll("/", "__")
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
})
let done = 0
let failed = 0
async function capture(entry) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const png = join(OUT, `${thumbName(entry.id)}.png`)
  try {
    let ok = false
    for (let attempt = 0; attempt < 3 && !ok; attempt += 1) {
      const response = await page.goto(`${BASE}${entry.url}`, { waitUntil: "load", timeout: 45000 }).catch(() => null)
      const text = await page.evaluate(() => document.body?.innerText.slice(0, 200) ?? "").catch(() => "")
      ok = (!response || response.status() < 400) && !/"status":\s*5\d\d/.test(text)
      if (!ok) await page.waitForTimeout(4000)
    }
    if (!ok) throw new Error("app returned a server error")
    await page.waitForTimeout(Number(process.env.SETTLE ?? 3500))
    // Rendered videos open on a black first frame: show one from the middle.
    await page
      .evaluate(async () => {
        const video = document.querySelector("video")
        if (!video) return
        if (!Number.isFinite(video.duration) || !video.duration)
          await new Promise((done) => { video.addEventListener("loadedmetadata", done, { once: true }); setTimeout(done, 5000) })
        video.pause()
        video.currentTime = (video.duration || 6) * 0.4
        await new Promise((done) => { video.addEventListener("seeked", done, { once: true }); setTimeout(done, 5000) })
      })
      .catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: png, timeout: Number(process.env.SHOT_TIMEOUT ?? 20000) })
    execFileSync("cwebp", ["-quiet", "-q", "72", "-resize", "480", "0", "-m", "6", png, "-o", png.replace(/\.png$/, ".webp")])
    unlinkSync(png)
    done += 1
  } catch (error) {
    failed += 1
    console.log(`FAIL ${entry.id}: ${String(error.message).split("\n")[0]}`)
  } finally {
    await context.close().catch(() => {})
  }
  if ((done + failed) % 10 === 0) console.log(`${done + failed}/${todo.length}`)
}

const queue = [...todo]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await capture(queue.shift())
  })
)
await browser.close()
console.log(`done ${done}, failed ${failed}`)
