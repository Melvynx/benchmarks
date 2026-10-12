#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTranscriptAccounting, summarizeTranscripts } from '../benchmark-compare/src/lib/transcript-accounting.server.ts'
import { continuationSource } from '../benchmark-compare/src/lib/continuations.server.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const prefix = process.argv[2] ?? '20260928T235'
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const output = join(root, '.benchmark-live', 'accounting', stamp)
mkdirSync(output, { recursive: true })
const directories = readdirSync(join(root, 'runs')).flatMap((run) => {
  const data = join(root, 'runs', run, 'data')
  return existsSync(data) ? readdirSync(data).map((task) => join(data, task)).filter((dir) => existsSync(join(dir, 'metadata.json'))) : []
})
const selected = new Set(directories.filter((dir) => relative(join(root, 'runs'), dir).startsWith(prefix)))
let changed = true
while (changed) {
  changed = false
  for (const dir of directories) {
    if (!selected.has(dir) && selected.has(continuationSource(dir))) { selected.add(dir); changed = true }
  }
}
const repriced = (ledger) => ledger.transcripts
  .filter((item) => item.harnessCostUsd !== null && item.harnessCostUsd !== undefined)
  .map((item) => ({ transcript: item.transcript, harness_cost_usd: item.harnessCostUsd, repriced_cost_usd: item.costUsd }))
const ledgers = []
for (const directory of selected) {
  const ledger = readTranscriptAccounting(directory)
  ledgers.push(ledger)
  writeFileSync(join(directory, 'accounting.json'), JSON.stringify(ledger, null, 2) + '\n')
  const file = join(directory, 'metadata.json')
  const before = readFileSync(file, 'utf8')
  const metadata = JSON.parse(before)
  const backup = join(output, relative(root, file))
  mkdirSync(dirname(backup), { recursive: true })
  copyFileSync(file, backup)
  metadata.transcript_accounting = {
    schema_version: 1, generated_at: new Date().toISOString(), ledger: 'accounting.json',
    transcripts: ledger.transcripts.length, known_cost_usd: ledger.costUsd,
    reported_cost_usd: ledger.reportedCostUsd, estimated_cost_usd: ledger.estimatedCostUsd,
    unknown_costs: ledger.unknownCosts, partial_costs: ledger.partialCosts,
    cost_complete: ledger.complete, model_duration_ms: ledger.durationMs, wall_duration_ms: ledger.wallDurationMs,
    stalled_duration_ms: ledger.stalledDurationMs, approximate_unknown_cost_usd: ledger.approximateCostUsd,
    repriced_harness_costs: repriced(ledger),
    note: 'Includes all linked attempts and iterations; identical transcript copies counted once. Stalled attempts (no usage recorded) are excluded from model duration and reported separately. Harness costs without a list rate (costBasis unknown) are re-priced from tokens. Unknown is not zero. Original usage and transcripts preserved.',
  }
  metadata.benchmark_totals = {
    attempt_run_ids: [...new Set(ledger.transcripts.map((item) => item.runId))],
    model_duration_ms: ledger.durationMs, wall_duration_ms: ledger.wallDurationMs,
    stalled_duration_ms: ledger.stalledDurationMs, approximate_unknown_cost_usd: ledger.approximateCostUsd,
    reported_cost_usd: ledger.reportedCostUsd, estimated_cost_usd: ledger.estimatedCostUsd,
    known_cost_usd: ledger.costUsd, cost_complete: ledger.complete,
    unknown_costs: ledger.unknownCosts, partial_costs: ledger.partialCosts,
    total_tokens: ledger.tokens, status: metadata.effective_status ?? metadata.status,
    cost_note: 'Reported cost plus official API estimates; unknown costs excluded, never treated as zero. See accounting.json for every transcript and original model.',
  }
  if (readFileSync(file, 'utf8') !== before) continue
  const temporary = `${file}.accounting-tmp`
  writeFileSync(temporary, JSON.stringify(metadata, null, 2) + '\n')
  renameSync(temporary, file)
}
const report = { generatedAt: new Date().toISOString(), prefix, ...summarizeTranscripts(ledgers.flatMap((ledger) => ledger.transcripts)) }
writeFileSync(join(output, 'ledger.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ output: join(output, 'ledger.json'), attempts: selected.size, transcripts: report.transcripts.length, costUsd: report.costUsd, unknownCosts: report.unknownCosts, partialCosts: report.partialCosts }))
