#!/usr/bin/env node
// Build a comparison page from apps that already exist. Never invokes a model.
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const SUCCESS = new Set(["harness-verified", "verified"])
const EFFORTS = "none|minimal|low|medium|high|xhigh|extra-high|max|ultra"

function usage(code = 0) {
  console.log(`Usage: create-comparison.mjs --models <spec,...> [--tasks <task,...|all>] [options]
       create-comparison.mjs --apps <task/result,...> [options]

Model spec: <model>[@<harness>][:<effort>]   e.g. claude-opus-5-5:xhigh,gemini-4-argon@cursor-agent:high

Options:
  --title <text>       Page title (default: models joined with "vs")
  --slug <slug>        Manifest slug (default: derived from title)
  --require-all        Keep only tasks every model has a result for
  --allow-failed       Fall back to failed/terminated apps when no verified one exists
  --url <origin>       Workbench origin (default: http://127.0.0.1:9080)
  --dry-run            Print the selection without writing the manifest`)
  process.exit(code)
}

function parseArgs(argv) {
  const options = { url: "http://127.0.0.1:9080" }
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index]
    const flag = key.replace(/^--/, "")
    if (key === "-h" || key === "--help") usage()
    else if (["require-all", "allow-failed", "dry-run"].includes(flag)) options[flag] = true
    else if (["models", "tasks", "apps", "title", "slug", "url"].includes(flag)) options[flag] = argv[++index]
    else {
      console.error(`Unknown argument: ${key}`)
      usage(2)
    }
  }
  if (!options.models && !options.apps) usage(2)
  return options
}

/** Folds the naming drift between harnesses: `claude-opus-5.5-300k-extra-high` → `claude-opus-5-5`. */
export function normalizeModel(value) {
  let model = value.toLowerCase().replace(/\[1m\]/g, "").replaceAll(".", "-").replaceAll("/", "-")
  model = model.replace(/-(?:1m|200k|256k|300k)(?=-|$)/g, "").replace(/-thinking(?=-|$)/g, "")
  return model.replace(new RegExp(`-(?:${EFFORTS})$`), "")
}

function normalizeEffort(value) {
  return value === "extra-high" ? "xhigh" : value
}

function modelFromResult(entry) {
  return normalizeModel(
    entry.result
      .replace(/^\d{4}-\d{2}-\d{2}-/, "")
      .replace(new RegExp(`^${entry.harness}-`), "")
      .replace(/-\d+$/, "")
  )
}

function parseSpec(spec) {
  const match = /^([^@:]+)(?:@([^:]+))?(?::(.+))?$/.exec(spec.trim())
  if (!match) throw new Error(`Invalid model spec: ${spec}`)
  const [, model, harness, effort] = match
  const suffix = new RegExp(`-(${EFFORTS})$`).exec(model.toLowerCase())?.[1]
  const chosen = effort ?? suffix
  return { spec: spec.trim(), model: normalizeModel(model), harness, effort: chosen && normalizeEffort(chosen) }
}

function matches(entry, spec) {
  if (spec.harness && entry.harness !== spec.harness) return false
  if (spec.effort && normalizeEffort(entry.effort) !== spec.effort) return false
  return normalizeModel(entry.model) === spec.model || modelFromResult(entry) === spec.model
}

function entryTime(entry) {
  const time = Date.parse(entry.startedAt ?? `${entry.date}T00:00:00Z`)
  return Number.isFinite(time) ? time : 0
}

function rank(entry) {
  if (SUCCESS.has(entry.status)) return 2
  return entry.status === "terminated" ? 1 : 0
}

async function fetchCatalog(origin) {
  const load = async () => {
    const response = await fetch(`${origin}/api/catalog`)
    if (!response.ok) throw new Error(`${origin}/api/catalog answered ${response.status}`)
    return (await response.json()).entries
  }
  try {
    return await load()
  } catch {
    // The workbench is Portly-managed; start it instead of spawning a second server.
    execFileSync("portly", ["start", "benchmark-compare/web"], { stdio: "ignore" })
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((done) => setTimeout(done, 1_000))
      try {
        return await load()
      } catch {}
    }
    throw new Error(`Workbench unreachable at ${origin}; run: portly start benchmark-compare/web`)
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
}

function timestampId(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function select(entries, options) {
  const specs = options.models.split(",").filter(Boolean).map(parseSpec)
  const wanted = options.tasks && options.tasks !== "all" ? new Set(options.tasks.split(",")) : null
  const cells = new Map()
  for (const spec of specs) {
    for (const entry of entries) {
      if (!matches(entry, spec) || (wanted && !wanted.has(entry.task))) continue
      if (!entry.hasPreview && !entry.hasTranscript) continue
      if (rank(entry) < 2 && !options["allow-failed"]) continue
      const key = `${spec.spec}|${entry.task}`
      const current = cells.get(key)
      if (!current || rank(entry) > rank(current) || (rank(entry) === rank(current) && entryTime(entry) > entryTime(current)))
        cells.set(key, entry)
    }
  }
  let tasks = wanted ? [...wanted] : [...new Set([...cells.values()].map((entry) => entry.task))]
  if (options["require-all"]) tasks = tasks.filter((task) => specs.every((spec) => cells.has(`${spec.spec}|${task}`)))
  return { specs, tasks: tasks.sort(), cells }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const entries = await fetchCatalog(options.url)
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  let apps = []
  let defaultTitle = "Comparison"

  if (options.apps) {
    apps = options.apps.split(",").filter(Boolean)
    const unknown = apps.filter((app) => !byId.has(app))
    if (unknown.length) throw new Error(`Not in the catalog: ${unknown.join(", ")}`)
    defaultTitle = [...new Set(apps.map((app) => byId.get(app).model))].join(" vs ")
  } else {
    const { specs, tasks, cells } = select(entries, options)
    const missing = []
    for (const task of tasks) {
      for (const spec of specs) {
        const entry = cells.get(`${spec.spec}|${task}`)
        if (entry) {
          apps.push(entry.id)
          console.log(`  ${task.padEnd(34)} ${spec.spec.padEnd(28)} ${entry.id}  [${entry.harness} · ${entry.effort} · ${entry.status}]`)
        } else {
          missing.push(`${task} × ${spec.spec}`)
          console.log(`  ${task.padEnd(34)} ${spec.spec.padEnd(28)} MISSING`)
        }
      }
    }
    if (missing.length) console.log(`\n${missing.length} missing cell(s); rerun only if asked:\n  ${missing.join("\n  ")}`)
    defaultTitle = specs.map((spec) => spec.spec).join(" vs ")
  }

  if (!apps.length) throw new Error("No existing app matches; nothing to compare.")
  const createdAt = new Date()
  const title = options.title ?? defaultTitle
  const id = `cmp-${timestampId(createdAt)}-${options.slug ?? slugify(title)}`
  const manifest = { id, title, created_at: createdAt.toISOString(), apps }

  if (options["dry-run"]) {
    console.log(`\n${JSON.stringify(manifest, null, 2)}`)
    return
  }
  const directory = join(repoRoot, "comparisons")
  if (!existsSync(directory)) mkdirSync(directory)
  const file = join(directory, `${id}.json`)
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`\nWrote ${file}\nOpen ${options.url}/?run=${encodeURIComponent(id)}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
