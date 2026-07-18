#!/usr/bin/env node

import { createRequire } from "node:module"
import { createServer } from "node:net"
import { spawn } from "node:child_process"
import {
  closeSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { basename, join, resolve } from "node:path"
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
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

async function responds(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_000) })
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await responds(url)) return
    if (child?.exitCode !== null) {
      throw new Error(`Server exited with code ${child.exitCode}`)
    }
    await new Promise((accept) => setTimeout(accept, 1_000))
  }
  throw new Error(`Timed out waiting for ${url}`)
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

const browser = await chromium.launch({ headless: true })
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
          const appPath = resolve(metadata.app_path)
          if (metadata.type === "standalone-html") {
            capturePort = await availablePort(standalonePort)
            standalonePort = capturePort + 1
            url = `http://127.0.0.1:${capturePort}/index.html`
          } else {
            capturePort = metadata.port
            url = `http://127.0.0.1:${capturePort}/`
          }

          if (!(await responds(url))) {
            server = startServer({
              appPath,
              dataDirectory,
              type: metadata.type,
              port: capturePort,
            })
            await waitForServer(url, server.child)
          }

          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
          })
          await page.waitForTimeout(2_500)
        }

        title = await page.title()
        await page.screenshot({ path: screenshotPath })
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
