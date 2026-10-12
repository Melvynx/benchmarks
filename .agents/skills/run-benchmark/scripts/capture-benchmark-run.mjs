#!/usr/bin/env node

import { createRequire } from "node:module"
import { createServer } from "node:net"
import { execFileSync, spawn } from "node:child_process"
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { once } from "node:events"
import { pathToFileURL } from "node:url"

const VIEWPORT = { width: 1440, height: 900 }
const playwrightRoot = process.env.BENCHMARK_PLAYWRIGHT_ROOT

if (!playwrightRoot) {
  throw new Error(
    "BENCHMARK_PLAYWRIGHT_ROOT must point to a project with @playwright/test installed"
  )
}

const requireFromPlaywrightRoot = createRequire(
  join(resolve(playwrightRoot), "package.json")
)
let playwrightEntry
try {
  playwrightEntry = requireFromPlaywrightRoot.resolve("@playwright/test")
} catch {
  playwrightEntry = requireFromPlaywrightRoot.resolve("playwright")
}
const playwrightModule = await import(pathToFileURL(playwrightEntry).href)
const { chromium } = playwrightModule.default ?? playwrightModule

const runDirectories = process.argv.slice(2).map((directory) => resolve(directory))
if (runDirectories.length === 0) {
  throw new Error("Usage: capture-benchmark-run.mjs <run-dir>...")
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

/**
 * The comparison UI lists runs by their rendered app, so every screenshot gets
 * a downscaled WebP beside it. A missing encoder must not fail a capture; run
 * `pnpm build:thumbnails` afterwards to backfill.
 */
function writeThumbnail(screenshotPath) {
  const target = join(dirname(screenshotPath), "thumbnail.webp")
  try {
    execFileSync(
      "cwebp",
      ["-quiet", "-q", "72", "-resize", "480", "0", "-m", "6", screenshotPath, "-o", target],
      { stdio: "ignore" }
    )
  } catch (error) {
    process.stderr.write(`thumbnail-skipped\t${target}\t${error.message}\n`)
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

/**
 * A model may answer a standalone-HTML task with a bundled project whose root
 * `index.html` only resolves through a dev server. The comparison UI serves
 * `dist/` in that case, and a static capture must agree with it or it records
 * an unstyled page the reviewer never sees.
 */
function servedRoot(appPath) {
  const dist = join(appPath, "dist")
  return existsSync(join(dist, "index.html")) ? dist : appPath
}

/**
 * A fresh-session iteration writes into a suffixed sibling app, so the newest
 * verified iteration is what the run delivered.
 */
function deliveredAppPath(dataDirectory, metadata) {
  const iterationsRoot = join(dataDirectory, "iterations")
  if (!existsSync(iterationsRoot)) return metadata.app_path
  const iterations = readdirSync(iterationsRoot)
    .filter((name) => /^\d+$/.test(name))
    .sort((left, right) => Number(right) - Number(left))
  for (const iteration of iterations) {
    const path = join(iterationsRoot, iteration, "metadata.json")
    if (!existsSync(path)) continue
    const { status, app_path: appPath } = readJson(path)
    if (status === "harness-verified" && appPath && existsSync(appPath)) return appPath
  }
  return metadata.app_path
}

async function availablePort(start) {
  for (let port = start; port < start + 500; port += 1) {
    const server = createServer()
    try {
      await new Promise((accept, reject) => {
        server.once("error", reject)
        server.listen(port, "127.0.0.1", accept)
      })
      await new Promise((accept) => server.close(accept))
      return port
    } catch {
      server.close()
    }
  }
  throw new Error(`No capture port available from ${start}`)
}

// A dev server may bind IPv4, IPv6, or both, so a capture must probe each
// loopback family and then screenshot the address that actually answered.
function loopbackUrls(port, path) {
  return [`http://127.0.0.1:${port}${path}`, `http://[::1]:${port}${path}`]
}

async function respondingUrl(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) })
      if (response.ok) return url
    } catch {
      // Try the next loopback family.
    }
  }
  return null
}

async function waitForServer(urls, child) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const url = await respondingUrl(urls)
    if (url) return url
    if (child?.exitCode !== null) {
      throw new Error(`Server exited with code ${child.exitCode}`)
    }
    await new Promise((accept) => setTimeout(accept, 1_000))
  }
  throw new Error(`Timed out waiting for ${urls[0]}`)
}

function startServer({ appPath, dataDirectory, type, port }) {
  const logPath = join(dataDirectory, "capture.log")
  const logDescriptor = openSync(logPath, "w")
  const command = type === "standalone-html" ? "python3" : "pnpm"
  const args =
    type === "standalone-html"
      ? ["-m", "http.server", String(port), "--bind", "127.0.0.1"]
      : ["run", "dev"]
  const child = spawn(command, args, {
    cwd: appPath,
    detached: true,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", logDescriptor, logDescriptor],
  })

  return { child, logDescriptor }
}

async function stopServer(server) {
  if (!server) return
  try {
    process.kill(-server.child.pid, "SIGTERM")
  } catch {
    // The process may already have exited.
  }
  if (server.child.exitCode === null) {
    await Promise.race([
      once(server.child, "exit"),
      new Promise((accept) => setTimeout(accept, 2_000)),
    ])
  }
  closeSync(server.logDescriptor)
}

function cliEvidenceHtml(metadata, finalText) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(metadata.model)} · ${escapeHtml(metadata.task)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080e1e; color: #dce7ff; font: 22px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    main { width: min(1014px, calc(100vw - 96px)); padding: 58px; border: 1px solid #334765; border-radius: 24px; background: #111b31; box-shadow: 0 24px 80px #0008; }
    h1 { margin: 0 0 18px; color: #87cfff; font-size: 38px; }
    strong { color: #70f0bd; }
    p { margin: 10px 0; }
    pre { max-height: 320px; overflow: hidden; white-space: pre-wrap; color: #b7c4df; font-size: 16px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(metadata.model)} · ${escapeHtml(metadata.task)}</h1>
    <p><strong>CLI benchmark completed</strong></p>
    <p>${escapeHtml(metadata.benchmark_id)}</p>
    <pre>${escapeHtml(finalText.slice(0, 1_600))}</pre>
  </main>
</body>
</html>`
}

// Headless Chromium has no GPU; without SwiftShader every WebGL task captures black.
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--autoplay-policy=no-user-gesture-required",
  ],
})
let standalonePort = 9600

try {
  for (const runDirectory of runDirectories) {
    const dataRoot = join(runDirectory, "data")
    for (const task of readdirSync(dataRoot).sort()) {
      const dataDirectory = join(dataRoot, task)
      const metadata = readJson(join(dataDirectory, "metadata.json"))
      const screenshotPath = join(dataDirectory, "screenshot.png")
      const renderPath = join(dataDirectory, "render.json")
      const startedAt = new Date().toISOString()
      const consoleErrors = []
      const pageErrors = []
      let url = null
      let capturePort = null
      let title = ""
      let server = null
      const page = await browser.newPage({ viewport: VIEWPORT })

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text())
      })
      page.on("pageerror", (error) => pageErrors.push(error.message))

      try {
        if (metadata.type === "cli") {
          const finalText = readFileSync(join(dataDirectory, "final.txt"), "utf8")
          await page.setContent(cliEvidenceHtml(metadata, finalText))
        } else {
          const deliveredPath = resolve(deliveredAppPath(dataDirectory, metadata))
          const appPath =
            metadata.type === "standalone-html" ? servedRoot(deliveredPath) : deliveredPath
          let candidates
          if (metadata.type === "standalone-html") {
            capturePort = await availablePort(standalonePort)
            standalonePort = capturePort + 1
            candidates = loopbackUrls(capturePort, "/index.html")
          } else {
            capturePort = metadata.port
            candidates = loopbackUrls(capturePort, "/")
          }

          url = await respondingUrl(candidates)
          if (!url) {
            server = startServer({
              appPath,
              dataDirectory,
              type: metadata.type,
              port: capturePort,
            })
            url = await waitForServer(candidates, server.child)
          }

          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
          })
          await page.waitForTimeout(2_500)
        }

        title = await page.title()
        await page.screenshot({ path: screenshotPath })
        writeThumbnail(screenshotPath)
        writeFileSync(
          renderPath,
          `${JSON.stringify(
            {
              status: "captured",
              task: metadata.task,
              model: metadata.model,
              benchmark_id: metadata.benchmark_id,
              url,
              port: capturePort,
              viewport: VIEWPORT,
              title,
              console_errors: consoleErrors,
              page_errors: pageErrors,
              started_at: startedAt,
              completed_at: new Date().toISOString(),
            },
            null,
            2
          )}\n`
        )
        process.stdout.write(`captured\t${metadata.task}\t${basename(runDirectory)}\n`)
      } catch (error) {
        await page.setContent(
          cliEvidenceHtml(metadata, `Capture failed: ${error.message}`)
        )
        title = await page.title()
        await page.screenshot({ path: screenshotPath })
        writeThumbnail(screenshotPath)
        writeFileSync(
          renderPath,
          `${JSON.stringify(
            {
              status: "failed",
              task: metadata.task,
              model: metadata.model,
              benchmark_id: metadata.benchmark_id,
              url,
              port: capturePort,
              viewport: VIEWPORT,
              title,
              console_errors: consoleErrors,
              page_errors: [...pageErrors, error.message],
              started_at: startedAt,
              completed_at: new Date().toISOString(),
            },
            null,
            2
          )}\n`
        )
        process.stderr.write(`failed\t${metadata.task}\t${error.message}\n`)
      } finally {
        await stopServer(server)
        await page.close()
      }
    }
  }
} finally {
  await browser.close()
}
