#!/usr/bin/env node
import { readTranscriptAccounting, summarizeTranscripts } from "../benchmark-compare/src/lib/transcript-accounting.server.ts"
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
import { Worker, isMainThread, parentPort } from 'node:worker_threads'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNS = path.join(ROOT, 'runs')
const MARKER = path.join(ROOT, '.benchmark-live', 'current.json')
const SNAPSHOT = path.join(ROOT, '.benchmark-live', 'status.json')
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

  if (PIN) {
    const selected = dirs.filter((d) => d.name.startsWith(PIN))
    const names = new Set(selected.map((d) => d.name))
    for (const entry of dirs) {
      if (names.has(entry.name)) continue
      const dataDir = path.join(entry.dir, 'data')
      if (!fs.existsSync(dataDir)) continue
      const linked = fs.readdirSync(dataDir).some((task) => {
        const metadata = readJson(path.join(dataDir, task, 'metadata.json'))
        return names.has(sourceRunId(metadata?.continuation_of))
      })
      if (linked) selected.push(entry)
    }
    return { dirs: selected, benchmarkId: null }
  }
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
    const item = record?.item
    if (item?.type === 'agent_message' || item?.type === 'reasoning') {
      if (item.text?.trim()) return { kind: item.type === 'reasoning' ? 'thinking' : 'text', value: item.text.trim().replace(/\s+/g, ' ').slice(-260) }
    }
    if (item?.type === 'command_execution') return { kind: 'tool', name: 'command', value: String(item.command ?? '').replace(/\s+/g, ' ').slice(0, 220) }
    if (record.type === 'tool_call' && record.tool_call) {
      const entry = Object.entries(record.tool_call).find(([name]) => name.endsWith('ToolCall'))
      if (entry) {
        const [name, call] = entry
        const detail = call.args?.command ?? call.args?.path ?? call.args?.pattern ?? ''
        return { kind: 'tool', name: name.replace(/ToolCall$/, ''), value: String(detail).replace(/\s+/g, ' ').slice(0, 220) }
      }
    }
    if (record.type === 'thinking' && record.text?.trim())
      return { kind: 'thinking', value: record.text.trim().replace(/\s+/g, ' ').slice(-260) }
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

function sourceRunId(source) {
  if (!source) return null
  return source.includes('/data/') ? path.basename(source.split('/data/')[0]) : source
}

function activeTranscript(taskDir) {
  const iterations = path.join(taskDir, 'iterations')
  if (fs.existsSync(iterations)) {
    const latest = fs.readdirSync(iterations).filter((name) => /^\d+$/.test(name))
      .sort((a, b) => Number(b) - Number(a))[0]
    const file = latest && path.join(iterations, latest, 'transcript.jsonl')
    if (file) return file
  }
  return path.join(taskDir, 'transcript.jsonl')
}

function currentAttemptAccounting(rows) {
  return summarizeTranscripts(rows.flatMap((row) => {
    const candidate = activeTranscript(path.join(RUNS, row.runId, 'data', row.task))
    const id = row.activeTranscriptId ?? (fs.existsSync(candidate) ? fs.realpathSync(candidate) : candidate)
    return row.accounting.transcripts.filter((item) => item.id === id)
  }))
}

function modelStatistics(accounting) {
  const groups = new Map()
  for (const transcript of accounting.transcripts) {
    const model = transcript.model.replace(/-(medium|xhigh|high|low)$/, '')
    const key = model + ' · ' + transcript.effort
    groups.set(key, [...(groups.get(key) || []), transcript])
  }
  return [...groups].map(([model, items]) => ({ model, ...summarizeTranscripts(items) }))
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
      const transcript = activeTranscript(taskDir)
      let stat
      try {
        stat = fs.existsSync(transcript) ? fs.statSync(transcript) : { ...fs.statSync(path.dirname(transcript)), size: 0 }
      } catch {
        continue
      }

      // run.json and metadata.json are written only once a run returns, so the
      // invocation itself is the source of truth for model and effort mid-run.
      const command = readText(path.join(path.dirname(transcript), 'command.sh')) ?? readText(path.join(taskDir, 'command.sh')) ?? ''
      const model = command.match(/--model (\S+)/)?.[1] ?? name.replace(/^\d+Z-/, '')
      const originalMetadata = readJson(path.join(taskDir, 'metadata.json'))
      const activeDir = path.dirname(transcript)
      const isIteration = activeDir !== taskDir
      const iterationMetadata = isIteration ? readJson(path.join(activeDir, 'metadata.json')) : null
      const metadata = isIteration
        ? { ...originalMetadata, ...iterationMetadata, status: iterationMetadata?.status ?? 'running' }
        : originalMetadata
      const effort = metadata?.effort
        ?? command.match(/--effort (\S+)/)?.[1]
        ?? command.match(/model_reasoning_effort=[\\"']*(\w+)/)?.[1]
        ?? model.match(/-(low|medium|high|xhigh|max|ultra)(?:-fast)?$/)?.[1]
        ?? '—'
      // Concurrent runs carry a `-<index>` suffix that is not part of the name.
      const harness = metadata?.harness ?? (command.includes('cursor-agent') ? 'cursor-agent' : name.replace(/-\d+$/, '').split('-').pop())
      models.add(model)
      harnesses.add(harness)

      const verification = readJson(path.join(activeDir, 'verification.json'))
      const appPathFile = readText(path.join(taskDir, 'app-path.txt'))
      const appPath = metadata?.app_path || appPathFile?.trim() || null
      const workingPath = !metadata || metadata.status === 'running'
        ? (readText(path.join(activeDir, 'isolated-workdir.txt')) ?? readText(path.join(taskDir, 'isolated-workdir.txt')))?.trim()
        : null
      const visibleFilesPath = workingPath && fs.existsSync(workingPath) ? workingPath : appPath

      const key = `${name}/${task}`
      const previous = growth.get(key)
      const rate = previous && now > previous.at ? ((stat.size - previous.size) / (now - previous.at)) * 1000 : 0
      growth.set(key, { size: stat.size, at: now })

      const startedAt = metadata?.model_timing?.started_at
        ? Date.parse(metadata.model_timing.started_at)
        : stat.birthtimeMs
      if (startedAt < earliest) earliest = startedAt

      rows.push({
        accounting: readTranscriptAccounting(taskDir),
        activeTranscriptId: fs.existsSync(transcript) ? fs.realpathSync(transcript) : transcript,
        task,
        model,
        effort,
        harness: metadata?.harness ?? harness,
        resumed: isIteration && !iterationMetadata?.fresh_session,
        freshSession: iterationMetadata?.fresh_session ?? false,
        done: Boolean(metadata && metadata.status !== 'running'),
        status: !metadata || metadata.status === 'running' ? 'running' : verification?.status ?? metadata.status,
        continuationOf: sourceRunId(metadata?.continuation_of ?? readText(path.join(taskDir, 'continuation-of.txt'))?.trim()),
        bytes: stat.size,
        files: visibleFilesPath ? countFiles(visibleFilesPath) : 0,
        idleSeconds: Math.max(0, Math.round((now - stat.mtimeMs) / 1000)),
        rate: Math.max(0, Math.round(rate)),
        durationMs: metadata?.model_timing?.duration_ms ?? now - startedAt,
        attempts: [ ...(isIteration ? [{
          runId: name,
          harness,
          timing: originalMetadata?.model_timing ?? null,
          usage: originalMetadata?.session_usage ?? null,
          analysis: originalMetadata?.transcript_analysis ?? null,
          verification: readJson(path.join(taskDir, 'verification.json')),
        }] : []), {
          runId: name,
          harness,
          timing: metadata?.model_timing ?? null,
          usage: metadata?.session_usage ?? null,
          analysis: metadata?.transcript_analysis ?? null,
          verification,
        }],
        activity: metadata && metadata.status !== 'running' ? null : lastActivity(transcript),
        runId: name,
      })
    }
  }

  for (const recovery of [...rows]) {
    if (!recovery.continuationOf) continue
    const originalIndex = rows.findIndex((row) => row !== recovery && row.task === recovery.task
      && (row.runId === recovery.continuationOf || row.continuationOf === recovery.continuationOf))
    if (originalIndex === -1) continue
    const original = rows[originalIndex]
    rows[originalIndex] = {
      ...recovery, model: original.model, resumed: !recovery.freshSession,
      attempts: [...original.attempts, ...recovery.attempts],
      accounting: summarizeTranscripts([...original.accounting.transcripts, ...recovery.accounting.transcripts]),
    }
    rows.splice(rows.indexOf(recovery), 1)
  }

  const accounting = summarizeTranscripts(rows.flatMap((row) => row.accounting.transcripts))
  for (const row of rows) {
    row.attemptDurationMs = row.durationMs
    row.durationMs = row.accounting.durationMs ?? row.durationMs
  }
  const currentAccounting = currentAttemptAccounting(rows)
  const completedAccounting = summarizeTranscripts(rows.filter((row) => row.done).flatMap((row) => row.accounting.transcripts))
  const modelStats = modelStatistics(currentAccounting)
  rows.sort(
    (a, b) => a.task.localeCompare(b.task) || a.model.localeCompare(b.model) || a.effort.localeCompare(b.effort),
  )
  return {
    rows,
    accounting,
    currentAccounting,
    completedAccounting,
    modelStats,
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
    <div class="metric"><b id="m-done">—</b><span>Completed / planned runs</span></div>
    <div class="metric"><b id="m-running">—</b><span>Running</span></div>
    <div class="metric"><b class="mono" id="m-elapsed">—</b><span>Elapsed</span></div>
    <div class="metric"><b class="mono" id="m-volume">—</b><span>Transcript volume</span></div>
    <div class="metric"><b class="mono" id="m-rate">—</b><span>Write throughput</span></div>
    <div class="metric"><b class="mono" id="m-cost">—</b><span>Completed runs · all attempts · USD</span></div>
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
    <button class="filter" data-state="all" aria-pressed="true">Planned runs <em id="c-all">0</em></button>
    <button class="filter" data-state="building" aria-pressed="false">Building <em id="c-building">0</em></button>
    <button class="filter" data-state="ready" aria-pressed="false">Ready <em id="c-ready">0</em></button>
      <button class="filter" data-state="failed" aria-pressed="false" style="display:none">Failed <span id="c-failed">0</span></button>
    <span class="sep"></span>
    <span id="effort-filters" style="display:contents"></span>
  </div>

  <section id="model-stats" style="padding:0 24px 24px;overflow:auto"></section>
  <div class="list">
    <div class="head">
      <span>Task</span>
      <span>Model</span>
      <span class="col-status">Status</span>
      <span class="col-effort">Effort</span>
      <span class="col-size">Transcript</span>
      <span class="col-files">Files</span>
      <span title="Cumulative model invocation time across all attempts. CLI compatibility startup time is excluded.">Total time</span>
      <span class="col-activity">Latest activity</span>
      <span class="col-idle num right" title="Time since the last transcript event. A tool or model may still be working.">Event age</span>
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

function costSummary(attempts) {
  const costs = attempts.map((a) => a.usage?.total_cost_usd)
  const known = costs.filter((v) => typeof v === 'number' && Number.isFinite(v))
  if (!known.length) return 'Not reported'
  return '$' + known.reduce((sum, v) => sum + v, 0).toFixed(4)
    + (known.length < costs.length ? ' (partial)' : '')
}

function completedDetails(row) {
  if (!row.done) return ''
  const attempts = row.attempts || []
  const timing = attempts.map((a) => a.timing).filter(Boolean)
  const start = timing[0]?.started_at
  const end = timing[timing.length - 1]?.completed_at
  const elapsed = start && end ? dur(Date.parse(end) - Date.parse(start)) : 'Unavailable'
  const phases = attempts.map((a) => Object.entries(a.analysis?.categories || {})
    .map(([key, value]) => key + ': ' + value.percentage + '%').join(' · ')).filter(Boolean).join(' / ')
  return '<details data-run="' + esc(row.runId) + '" style="padding:12px 24px;border-bottom:1px solid var(--line);font-size:12px">'
    + '<summary>Cost: ' + esc(ledgerCost(row.accounting)) + ' · All attempts duration: ' + dur(row.accounting.durationMs)
    + ' · Wall time: ' + elapsed + ' · Tokens & transcript analysis</summary>'
    + '<p>' + esc(phases || 'Transcript analysis unavailable') + '</p>'
    + '<p>Phase percentages measure transcript activity, not elapsed time. Cost includes previous attempts where reported.</p>'
    + '<pre style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(JSON.stringify(row.accounting, null, 2)) + '</pre></details>'
}

function ledgerCost(ledger) {
  if (!ledger || ledger.costUsd === null) return 'Unknown'
  const estimated = ledger.transcripts.some((item) => item.costKind === 'estimated' || item.costKind === 'approximate')
  return '$' + ledger.costUsd.toFixed(4) + (estimated ? ' · estimated' : '') + (ledger.complete ? '' : ' · partial')
}
function renderModelStats(data) {
  const money = (v) => v === null ? 'Unknown' : '$' + v.toFixed(4)
  const current = data.currentAccounting ?? data.accounting
  const completed = data.completedAccounting
  document.getElementById('model-stats').innerHTML = '<h2 style="font-size:15px">Current runs · model / effort totals</h2>'
    + '<p style="color:var(--fg-2)">' + current.transcripts.length + ' current attempts. ' + (data.accounting.transcripts.length - current.transcripts.length) + ' previous attempts retained in the history export. Unknown costs are not zero.</p>'
    + '<p>Completed runs, including every attempt: ' + esc(ledgerCost(completed)) + '. Whole benchmark, including running and previous attempts: ' + esc(ledgerCost(data.accounting)) + '.</p>'
    + '<p style="color:var(--fg-2)">Estimated amounts use API list prices, not subscription charges or invoices. Interrupted attempts remain partial or approximate in the export.</p>'
    + '<table style="width:100%;text-align:left;white-space:nowrap;border-collapse:collapse"><thead><tr>'
    + ['Model / effort','Transcripts','Model time','Wall time','Reported USD','Estimated USD','Known subtotal','Unknown / partial','Tokens'].map((x) => '<th style="padding:10px">' + x + '</th>').join('')
    + '</tr></thead><tbody>' + data.modelStats.sort((a,b) => a.model.localeCompare(b.model)).map((s) => '<tr>'
      + [s.model,s.transcripts.length,dur(s.durationMs),dur(s.wallDurationMs),money(s.reportedCostUsd),money(s.estimatedCostUsd),ledgerCost(s),s.unknownCosts + ' / ' + s.partialCosts,s.tokens?.toLocaleString() ?? 'Unknown'].map((x) => '<td style="padding:10px;border-top:1px solid var(--line)">' + esc(x) + '</td>').join('')
      + '</tr>').join('') + '</tbody></table><p><a href="/api/accounting" download="benchmark-accounting.json" style="color:var(--ready)">Download every transcript cost, timing, token count, analysis and SHA-256</a></p>'
}
function render(data) {
  renderModelStats(data)
  const expanded = new Set([...document.querySelectorAll('details[open]')].map((element) => element.dataset.run))
  const { rows, startedAt, now, models, efforts, benchmarkId } = data
  const done = rows.filter((r) => r.done)
  const ready = rows.filter((r) => r.done && ['harness-verified', 'verified'].includes(r.status))
  const failedRows = rows.filter((r) => r.done && !['harness-verified', 'verified', 'continued-in-cursor'].includes(r.status))

  document.getElementById('m-models').textContent = models.length ? models.join(', ') : '—'
  document.getElementById('m-done').textContent = rows.length ? done.length + ' / ' + rows.length : '—'
  document.getElementById('m-running').textContent = rows.length - done.length
  document.getElementById('m-cost').textContent = ledgerCost(data.completedAccounting)
  document.getElementById('m-elapsed').textContent = rows.length ? dur(now - startedAt) : '—'
  document.getElementById('m-volume').textContent = mb(rows.reduce((a, r) => a + r.bytes, 0))
  document.getElementById('m-rate').textContent =
    (rows.reduce((a, r) => a + (r.done ? 0 : r.rate), 0) / 1024).toFixed(1) + ' KB/s'
  document.getElementById('m-id').textContent = benchmarkId ?? (rows[0] ? rows[0].runId : '—')
  document.getElementById('m-ctx').innerHTML = rows.length
    ? '<b>' + new Set(rows.map((r) => r.task)).size + ' tasks × ' + new Set(rows.map((r) => r.model + '/' + r.effort)).size + ' configurations = ' + rows.length + ' planned runs</b>'
    : '—'
  document.getElementById('bar').style.width = (done.length / Math.max(1, rows.length)) * 100 + '%'
  document.getElementById('c-all').textContent = rows.length
  document.getElementById('c-building').textContent = rows.length - done.length
  document.getElementById('c-ready').textContent = ready.length
  document.getElementById('c-failed').textContent = failedRows.length
  document.querySelector('[data-state="failed"]').style.display = failedRows.length ? '' : 'none'
  if (!failedRows.length && stateFilter === 'failed') stateFilter = 'all'
  syncEffortFilters(efforts)

  const visible = rows.filter((r) => {
    if (stateFilter === 'ready' && !ready.includes(r)) return false
    if (stateFilter === 'failed' && !failedRows.includes(r)) return false
    if (stateFilter === 'building' && r.done) return false
    if (effortFilter !== 'all' && r.effort !== effortFilter) return false
    return true
  })

  document.getElementById('rows').innerHTML = visible.length
    ? visible
        .map((r) => {
          const continued = r.status === 'continued-in-cursor'
          const failed = failedRows.includes(r)
          return (
            '<div class="row' + (r.done ? ' done' : '') + '">' +
            '<span class="task"><i class="dot ' + (continued ? 'building' : r.done ? (failed ? 'error' : 'ready') : 'building') + '"></i>' +
            '<span title="' + esc(r.task) + '">' + esc(r.task) + '</span></span>' +
            '<span class="model" title="' + esc(r.model + ' · ' + r.harness) + '">' + esc(r.model) + '</span>' +
            '<span class="status col-status">' + (r.done ? (failed ? esc(r.status) : (r.resumed ? 'Ready · resumed' : 'Ready')) : (r.resumed ? 'Resuming' : 'Building')) + '</span>' +
            '<span class="col-effort"><span class="chip ' + esc(r.effort) + '">' + esc(r.effort) + '</span></span>' +
            '<span class="num col-size">' + mb(r.bytes) + '</span>' +
            '<span class="num col-files">' + r.files + '</span>' +
            '<span class="num">' + dur(r.durationMs) + '</span>' +
            '<span class="col-activity">' + (r.done ? '<span class="activity muted">—</span>' : activityCell(r)) + '</span>' +
            '<span class="num right col-idle" title="Time since the last transcript event; this does not indicate a stalled process.">' + (r.done ? '—' : r.idleSeconds + 's') + '</span>' +
            '</div>' + completedDetails(r)
          )
        })
        .join('')
    : '<p class="empty">' + (rows.length ? 'No runs match this filter.' : 'Waiting for a benchmark to start…') + '</p>'
  for (const element of document.querySelectorAll('details')) element.open = expanded.has(element.dataset.run)
}

let polling = false
async function tick() {
  if (polling) return
  polling = true
  try {
    const res = await fetch('/api/status')
    if (!res.ok) throw new Error('Status temporarily unavailable')
    latest = await res.json()
    render(latest)
  } catch {
    if (!latest) document.getElementById('m-ctx').textContent = 'Loading benchmark data…'
  } finally { polling = false }
}

tick()
setInterval(tick, 2500)
</script>
</body>
</html>`

if (!isMainThread) {
  const refresh = () => {
    try { parentPort.postMessage({ snapshot: collect() }) }
    catch (error) { parentPort.postMessage({ error: error.message }) }
    setTimeout(refresh, 5000)
  }
  refresh()
} else {
let snapshot = readJson(SNAPSHOT)
if (snapshot?.benchmarkId !== readJson(MARKER)?.benchmark_id) snapshot = null
if (snapshot && !snapshot.currentAccounting) {
  snapshot.currentAccounting = currentAttemptAccounting(snapshot.rows)
  snapshot.modelStats = modelStatistics(snapshot.currentAccounting)
}
if (snapshot && !snapshot.completedAccounting)
  snapshot.completedAccounting = summarizeTranscripts(snapshot.rows.filter((row) => row.done).flatMap((row) => row.accounting.transcripts))
const collector = new Worker(new URL(import.meta.url), { argv: process.argv.slice(2) })
collector.on('message', (message) => {
  if (message.error) { console.error('Snapshot collection:', message.error); return }
  snapshot = message.snapshot
  fs.writeFileSync(SNAPSHOT + '.tmp', JSON.stringify(snapshot))
  fs.renameSync(SNAPSHOT + '.tmp', SNAPSHOT)
})
collector.on('error', (error) => console.error('Snapshot worker:', error.message))
http
  .createServer((req, res) => {
    if (req.url === '/api/accounting') {
      res.writeHead(snapshot ? 200 : 503, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(snapshot?.accounting ?? { error: 'Snapshot is loading' }, null, 2))
      return
    }
    if (req.url === '/api/status') {
      res.writeHead(snapshot ? 200 : 503, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(snapshot ?? { error: 'Snapshot is loading' }))
      return
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(PAGE)
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Live benchmark dashboard: http://localhost:${PORT}`))
}
