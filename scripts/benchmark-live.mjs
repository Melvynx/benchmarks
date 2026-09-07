#!/usr/bin/env node
// Live dashboard for the benchmark currently running.
//
// The active comparison group is discovered from `.benchmark-live/current.json`,
// written by the harness when a benchmark starts, and re-read on every poll — so a
// dashboard left running picks up the next benchmark on its own. Pass a run-id
// prefix as the first argument to pin it to one group instead.
//
//   node scripts/benchmark-live.mjs [run-id-prefix] [port]

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNS = path.join(ROOT, 'runs')
const MARKER = path.join(ROOT, '.benchmark-live', 'current.json')
const PIN = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : null
const PORT = Number(process.argv.find((arg, i) => i > 1 && /^\d+$/.test(arg)) ?? process.env.BENCHMARK_LIVE_PORT ?? 9500)
const SKIP_DIRS = new Set(['node_modules', '.git', '.pnpm-store'])
// A benchmark launched without a marker is grouped by run directories created
// within this window of the newest one.
const GROUP_WINDOW_MS = 5 * 60 * 1000

const growth = new Map()

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

/** Run directories belonging to the benchmark currently under observation. */
function activeRunDirs() {
  let entries
  try {
    entries = fs.readdirSync(RUNS, { withFileTypes: true })
  } catch {
    return { dirs: [], benchmarkId: null }
  }

  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(RUNS, entry.name)
      let birthtimeMs = 0
      try {
        birthtimeMs = fs.statSync(dir).birthtimeMs
      } catch {}
      return { name: entry.name, dir, birthtimeMs }
    })

  if (PIN) return { dirs: dirs.filter((d) => d.name.startsWith(PIN)), benchmarkId: null }
  if (!dirs.length) return { dirs: [], benchmarkId: null }

  const marker = readJson(MARKER)
  const markerStart = marker?.started_at ? Date.parse(marker.started_at) : NaN
  const newest = Math.max(...dirs.map((d) => d.birthtimeMs))
  // The marker only helps while it still points at the newest activity; an older
  // marker left behind by an interrupted run must not hide a fresher benchmark.
  const since =
    Number.isFinite(markerStart) && newest >= markerStart - 5_000 ? markerStart - 5_000 : newest - GROUP_WINDOW_MS

  return {
    dirs: dirs.filter((d) => d.birthtimeMs >= since).sort((a, b) => a.name.localeCompare(b.name)),
    benchmarkId: Number.isFinite(markerStart) && newest >= markerStart - 5_000 ? (marker?.benchmark_id ?? null) : null,
  }
}

function countFiles(dir, budget = 4000) {
  let total = 0
  const stack = [dir]
  while (stack.length && total < budget) {
    const current = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(path.join(current, entry.name))
      } else total += 1
    }
  }
  return total
}

/** Transcripts reach tens of megabytes; only the tail is ever read. */
function tailBytes(file, bytes) {
  const handle = fs.openSync(file, 'r')
  try {
    const { size } = fs.fstatSync(handle)
    const length = Math.min(bytes, size)
    const buffer = Buffer.alloc(length)
    fs.readSync(handle, buffer, 0, length, size - length)
    return buffer.toString('utf8')
  } finally {
    fs.closeSync(handle)
  }
}

function lastActivity(file, bytes = 96 * 1024) {
  let chunk
  try {
    chunk = tailBytes(file, bytes)
  } catch {
    return null
  }
  const lines = chunk.split('\n').filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    let record
    try {
      record = JSON.parse(lines[i])
    } catch {
      continue
    }
    const content = record?.message?.content
    if (!Array.isArray(content)) continue
    for (let j = content.length - 1; j >= 0; j -= 1) {
      const block = content[j]
      if (block.type === 'text' && block.text?.trim())
        return { kind: 'text', value: block.text.trim().replace(/\s+/g, ' ').slice(-260) }
      if (block.type === 'tool_use') {
        const detail = block.input?.command ?? block.input?.file_path ?? block.input?.pattern ?? ''
        return { kind: 'tool', name: block.name, value: String(detail).replace(/\s+/g, ' ').slice(0, 220) }
      }
      if (block.type === 'thinking' && block.thinking?.trim())
        return { kind: 'thinking', value: block.thinking.trim().replace(/\s+/g, ' ').slice(-260) }
    }
  }
  // A single JSONL record can exceed the window (large tool results); widen once.
  return bytes < 1024 * 1024 ? lastActivity(file, 1024 * 1024) : null
}

function collect() {
  const now = Date.now()
  const { dirs, benchmarkId } = activeRunDirs()
  const rows = []
  const models = new Set()
  const harnesses = new Set()
  let earliest = Infinity

  for (const { dir, name } of dirs) {
    const dataDir = path.join(dir, 'data')
    let tasks
    try {
      tasks = fs.readdirSync(dataDir)
    } catch {
      continue
    }
    for (const task of tasks) {
      const taskDir = path.join(dataDir, task)
      const transcript = path.join(taskDir, 'transcript.jsonl')
      let stat
      try {
        stat = fs.statSync(transcript)
      } catch {
        continue
      }

      // run.json and metadata.json are written only once a run returns, so the
      // invocation itself is the source of truth for model and effort mid-run.
      const command = readText(path.join(taskDir, 'command.sh')) ?? ''
      const effort = command.match(/--effort (\S+)/)?.[1] ?? '—'
      const model = command.match(/--model (\S+)/)?.[1] ?? name.replace(/^\d+Z-/, '')
      // Concurrent runs carry a `-<index>` suffix that is not part of the name.
      const harness = name.replace(/-\d+$/, '').split('-').pop()
      models.add(model)
      harnesses.add(harness)

      const metadata = readJson(path.join(taskDir, 'metadata.json'))
      const verification = readJson(path.join(taskDir, 'verification.json'))
      const appPathFile = readText(path.join(taskDir, 'app-path.txt'))
      const appPath = appPathFile?.trim() || null

      const key = `${name}/${task}`
      const previous = growth.get(key)
      const rate = previous && now > previous.at ? ((stat.size - previous.size) / (now - previous.at)) * 1000 : 0
      growth.set(key, { size: stat.size, at: now })

      const startedAt = metadata?.model_timing?.started_at
        ? Date.parse(metadata.model_timing.started_at)
        : stat.birthtimeMs
      if (startedAt < earliest) earliest = startedAt

      rows.push({
        task,
        model,
        effort,
        harness,
        done: Boolean(metadata),
        status: verification?.status ?? null,
        bytes: stat.size,
        files: appPath ? countFiles(appPath) : 0,
        idleSeconds: Math.round((now - stat.mtimeMs) / 1000),
        rate: Math.max(0, Math.round(rate)),
        durationMs: metadata?.model_timing?.duration_ms ?? now - startedAt,
        activity: metadata ? null : lastActivity(transcript),
        runId: name,
      })
    }
  }

  rows.sort(
    (a, b) => a.task.localeCompare(b.task) || a.model.localeCompare(b.model) || a.effort.localeCompare(b.effort),
  )
  return {
    rows,
    benchmarkId,
    models: [...models].sort(),
    harnesses: [...harnesses].sort(),
    efforts: [...new Set(rows.map((r) => r.effort))].sort(),
    startedAt: earliest === Infinity ? now : earliest,
    now,
  }
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Benchmark runs</title>
<style>
  :root {
    color-scheme: dark;
    --canvas: #000;
    --surface: #0a0a0a;
    --selected: #1f1f1f;
    --fg: #ededed;
    --fg-2: #a1a1a1;
    --fg-3: #666;
    --line: #262626;
    --line-strong: #333;
    --blue: #0070f3;
    --ready: #45dec4;
    --error: #f33a4a;
    --sans: Geist, "Geist Sans", -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    --mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0; background: var(--canvas); color: var(--fg);
    font-family: var(--sans); font-size: 14px; -webkit-font-smoothing: antialiased;
  }

  aside { position: fixed; inset: 0 auto 0 0; width: 240px; border-right: 1px solid var(--line); display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 10px; height: 64px; padding: 0 16px; border-bottom: 1px solid var(--line); }
  .brand svg { display: block; flex: none; }
  .brand b { display: block; font-size: 14px; font-weight: 500; letter-spacing: -.01em; }
  .brand code { display: block; font-family: var(--mono); font-size: 11.5px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side-body { flex: 1; overflow: auto; padding: 20px 16px; }
  .side-label { font-size: 12px; color: var(--fg-3); margin: 0 0 4px; }
  .metric { padding: 12px 0; border-bottom: 1px solid var(--line); }
  .metric:last-child { border-bottom: 0; }
  .metric b { display: block; font-size: 24px; font-weight: 400; letter-spacing: -.03em; line-height: 1.1; }
  .metric b.mono { font-family: var(--mono); font-size: 20px; letter-spacing: -.02em; }
  .metric span { display: block; margin-top: 4px; font-size: 13px; color: var(--fg-2); }
  .side-foot { border-top: 1px solid var(--line); padding: 14px 16px; }
  .side-foot code { display: block; font-family: var(--mono); font-size: 11px; color: var(--fg-3); line-height: 1.6; word-break: break-all; }

  main { margin-left: 240px; min-width: 0; }
  header {
    position: sticky; top: 0; z-index: 5; background: var(--canvas);
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
    height: 64px; padding: 0 24px; border-bottom: 1px solid var(--line);
  }
  header .ctx { margin: 0; font-size: 14px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  header .ctx b { color: var(--fg); font-weight: 500; }
  header h1 { margin: 0; font-size: 15px; font-weight: 500; letter-spacing: -.01em; text-align: center; }
  header .live { margin: 0; justify-self: end; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--fg-2); }

  .progress { height: 2px; background: var(--line); }
  .progress i { display: block; height: 100%; width: 0; background: var(--ready); transition: width 160ms ease; }

  .filters { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; padding: 20px 24px; }
  .filters .sep { width: 1px; background: var(--line); margin: 0 4px; }
  .filter {
    height: 36px; display: inline-flex; align-items: center; gap: 8px;
    padding: 0 14px; border: 1px solid var(--line); border-radius: 8px;
    background: var(--canvas); color: var(--fg-2); font: inherit; font-size: 13px; cursor: pointer;
    transition: border-color 140ms, background-color 140ms, color 140ms;
  }
  .filter:hover { border-color: var(--line-strong); color: var(--fg); }
  .filter[aria-pressed="true"] { background: var(--selected); color: var(--fg); border-color: var(--line-strong); }
  .filter em { font-style: normal; font-family: var(--mono); font-size: 12px; color: var(--fg-3); }

  .list { border-top: 1px solid var(--line); }
  .head, .row {
    display: grid;
    grid-template-columns: 208px 128px 108px 92px 88px 60px 76px minmax(0, 1fr) 60px;
    align-items: center; gap: 16px; padding: 0 24px;
  }
  .head { height: 40px; font-size: 12px; color: var(--fg-3); border-bottom: 1px solid var(--line); }
  .row { min-height: 60px; border-bottom: 1px solid var(--line); transition: background-color 140ms; }
  .row:hover { background: var(--surface); }
  .row .task { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .row .task span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; letter-spacing: -.01em; }
  .row.done .task span { color: var(--fg-2); font-weight: 400; }

  .dot { flex: none; width: 8px; height: 8px; border-radius: 999px; background: var(--fg-3); }
  .dot.ready { background: var(--ready); }
  .dot.error { background: var(--error); }
  .dot.building { background: var(--fg-2); animation: breathe 1.8s ease-in-out infinite; }
  @keyframes breathe { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
  @media (prefers-reduced-motion: reduce) { .dot.building { animation: none; } }

  .status { display: flex; align-items: center; gap: 8px; color: var(--fg-2); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .model { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--fg-2); }
  .chip { display: inline-block; width: fit-content; border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; font-size: 12px; color: var(--fg-2); white-space: nowrap; }
  .chip.max { border-color: var(--blue); color: var(--blue); }
  .num { font-family: var(--mono); font-size: 13px; color: var(--fg-2); }
  .num.right { text-align: right; }
  .activity { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--mono); font-size: 12.5px; color: var(--fg-2); }
  .activity .tool { color: var(--fg); }
  .activity .kind { color: var(--fg-3); }
  .activity.muted { color: var(--fg-3); }
  .empty { padding: 48px 24px; margin: 0; color: var(--fg-3); font-size: 13px; }

  @media (max-width: 1280px) {
    .head, .row { grid-template-columns: 196px 124px 104px 88px 84px 72px minmax(0, 1fr); }
    .col-files, .col-idle { display: none; }
  }
  @media (max-width: 900px) {
    aside { display: none; }
    main { margin-left: 0; }
    header { padding: 0 16px; }
    header .ctx { display: none; }
    .filters { padding: 16px; }
    .head, .row { grid-template-columns: 1fr 112px 64px; gap: 12px; padding: 0 16px; }
    .col-status, .col-effort, .col-size, .col-activity { display: none; }
  }
</style>
</head>
<body>
<aside>
  <div class="brand">
    <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true"><path d="M10 0 20 18H0Z" fill="#ededed"/></svg>
    <div style="min-width:0">
      <b>Benchmark</b>
      <code id="m-models">—</code>
    </div>
  </div>
  <div class="side-body">
    <p class="side-label">Overview</p>
    <div class="metric"><b id="m-done">—</b><span>Runs completed</span></div>
    <div class="metric"><b id="m-running">—</b><span>Running</span></div>
    <div class="metric"><b class="mono" id="m-elapsed">—</b><span>Elapsed</span></div>
    <div class="metric"><b class="mono" id="m-volume">—</b><span>Transcript volume</span></div>
    <div class="metric"><b class="mono" id="m-rate">—</b><span>Write throughput</span></div>
  </div>
  <div class="side-foot"><code id="m-id">—</code></div>
</aside>

<main>
  <header>
    <p class="ctx" id="m-ctx">—</p>
    <h1>Runs</h1>
    <p class="live"><i class="dot building"></i> Live</p>
  </header>
  <div class="progress"><i id="bar"></i></div>

  <div class="filters">
    <button class="filter" data-state="all" aria-pressed="true">All states <em id="c-all">0</em></button>
    <button class="filter" data-state="building" aria-pressed="false">Building <em id="c-building">0</em></button>
    <button class="filter" data-state="ready" aria-pressed="false">Ready <em id="c-ready">0</em></button>
    <span class="sep"></span>
    <span id="effort-filters" style="display:contents"></span>
  </div>

  <div class="list">
    <div class="head">
      <span>Task</span>
      <span>Model</span>
      <span class="col-status">Status</span>
      <span class="col-effort">Effort</span>
      <span class="col-size">Transcript</span>
      <span class="col-files">Files</span>
      <span>Duration</span>
      <span class="col-activity">Latest activity</span>
      <span class="col-idle num right">Idle</span>
    </div>
    <div id="rows"><p class="empty">Waiting for a benchmark to start…</p></div>
  </div>
</main>

<script>
const mb = (n) => (n / 1048576).toFixed(1) + ' MB'
const dur = (ms) => {
  const m = Math.floor(ms / 60000)
  return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm'
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

let latest = null
let stateFilter = 'all'
let effortFilter = 'all'
let effortKey = ''

document.querySelector('.filters').addEventListener('click', (event) => {
  const button = event.target.closest('.filter')
  if (!button) return
  const group = button.dataset.state ? 'state' : 'effort'
  if (group === 'state') stateFilter = button.dataset.state
  else effortFilter = button.dataset.effort
  for (const other of document.querySelectorAll('.filter')) {
    if ((other.dataset.state ? 'state' : 'effort') === group) other.setAttribute('aria-pressed', String(other === button))
  }
  if (latest) render(latest)
})

function syncEffortFilters(efforts) {
  const key = efforts.join(',')
  if (key === effortKey) return
  effortKey = key
  if (!efforts.includes(effortFilter)) effortFilter = 'all'
  document.getElementById('effort-filters').innerHTML =
    ['all', ...efforts]
      .map(
        (value) =>
          '<button class="filter" data-effort="' + esc(value) + '" aria-pressed="' + (effortFilter === value) + '">' +
          (value === 'all' ? 'All efforts' : esc(value)) + '</button>',
      )
      .join('')
}

function activityCell(row) {
  const a = row.activity
  if (!a) return '<span class="activity muted">Waiting for output…</span>'
  if (a.kind === 'tool')
    return '<span class="activity" title="' + esc(a.name + ' ' + a.value) + '"><span class="tool">' + esc(a.name) + '</span> ' + esc(a.value) + '</span>'
  return '<span class="activity" title="' + esc(a.value) + '"><span class="kind">' + (a.kind === 'thinking' ? 'thinking' : 'output') + '</span> ' + esc(a.value) + '</span>'
}

function render(data) {
  const { rows, startedAt, now, models, efforts, benchmarkId } = data
  const done = rows.filter((r) => r.done)

  document.getElementById('m-models').textContent = models.length ? models.join(', ') : '—'
  document.getElementById('m-done').textContent = rows.length ? done.length + ' / ' + rows.length : '—'
  document.getElementById('m-running').textContent = rows.length - done.length
  document.getElementById('m-elapsed').textContent = rows.length ? dur(now - startedAt) : '—'
  document.getElementById('m-volume').textContent = mb(rows.reduce((a, r) => a + r.bytes, 0))
  document.getElementById('m-rate').textContent =
    (rows.reduce((a, r) => a + (r.done ? 0 : r.rate), 0) / 1024).toFixed(1) + ' KB/s'
  document.getElementById('m-id').textContent = benchmarkId ?? (rows[0] ? rows[0].runId : '—')
  document.getElementById('m-ctx').innerHTML = rows.length
    ? '<b>' + new Set(rows.map((r) => r.task)).size + ' tasks</b> &nbsp;/&nbsp; ' + esc(efforts.join(' & '))
    : '—'
  document.getElementById('bar').style.width = (done.length / Math.max(1, rows.length)) * 100 + '%'
  document.getElementById('c-all').textContent = rows.length
  document.getElementById('c-building').textContent = rows.length - done.length
  document.getElementById('c-ready').textContent = done.length
  syncEffortFilters(efforts)

  const visible = rows.filter((r) => {
    if (stateFilter === 'ready' && !r.done) return false
    if (stateFilter === 'building' && r.done) return false
    if (effortFilter !== 'all' && r.effort !== effortFilter) return false
    return true
  })

  document.getElementById('rows').innerHTML = visible.length
    ? visible
        .map((r) => {
          const failed = r.done && r.status && r.status !== 'harness-verified'
          return (
            '<div class="row' + (r.done ? ' done' : '') + '">' +
            '<span class="task"><i class="dot ' + (r.done ? (failed ? 'error' : 'ready') : 'building') + '"></i>' +
            '<span title="' + esc(r.task) + '">' + esc(r.task) + '</span></span>' +
            '<span class="model" title="' + esc(r.model + ' · ' + r.harness) + '">' + esc(r.model) + '</span>' +
            '<span class="status col-status">' + (r.done ? (failed ? esc(r.status) : 'Ready') : 'Building') + '</span>' +
            '<span class="col-effort"><span class="chip ' + esc(r.effort) + '">' + esc(r.effort) + '</span></span>' +
            '<span class="num col-size">' + mb(r.bytes) + '</span>' +
            '<span class="num col-files">' + r.files + '</span>' +
            '<span class="num">' + dur(r.durationMs) + '</span>' +
            '<span class="col-activity">' + (r.done ? '<span class="activity muted">—</span>' : activityCell(r)) + '</span>' +
            '<span class="num right col-idle">' + (r.done ? '—' : r.idleSeconds + 's') + '</span>' +
            '</div>'
          )
        })
        .join('')
    : '<p class="empty">' + (rows.length ? 'No runs match this filter.' : 'Waiting for a benchmark to start…') + '</p>'
}

async function tick() {
  try {
    const res = await fetch('/api/status')
    latest = await res.json()
    render(latest)
  } catch {}
}

tick()
setInterval(tick, 2500)
</script>
</body>
</html>`

http
  .createServer((req, res) => {
    if (req.url === '/api/status') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(collect()))
      return
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(PAGE)
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Live benchmark dashboard: http://localhost:${PORT}`))
