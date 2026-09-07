/**
 * Headless probe: runs presets (and optional parameter sweeps) and prints what
 * the ecology actually did. Used to tune the rules so the waves are real.
 *
 *   pnpm probe                      # every preset, 1600s each
 *   pnpm probe --seconds 3000
 *   pnpm probe --sweep fruitGrowth=0.05,0.08,0.12,0.18
 *   pnpm probe --preset balanced --seeds 6
 */
import { Engine } from '../src/sim/engine'
import { movingAverage, findPeaks, mean, bestLag } from '../src/sim/analysis'
import { DEFAULT_PARAMS, PRESETS, type ParamKey, type Params } from '../src/sim/params'
import { CONST, overrideConst } from '../src/sim/world'

type Report = {
  label: string
  blueMean: number
  redMean: number
  fruitMean: number
  fruitFill: number
  bluePeak: number
  redPeak: number
  blueMin: number
  redMin: number
  blueWaves: number
  redWaves: number
  lag: number | null
  blueEnd: number
  redEnd: number
  blueDead: boolean
  redDead: boolean
  capped: boolean
  ms: number
}

const BASE_CONST = { ...CONST }
type Knob = ParamKey | keyof typeof CONST

/** Sweeps address rule constants and player params through one namespace. */
function applyKnob(key: Knob, value: number, params: Params) {
  if (key in params) (params as Record<string, number>)[key] = value
  else if (key in BASE_CONST) overrideConst({ [key]: value })
  else throw new Error(`unknown knob: ${key}`)
}

function analyse(label: string, params: Params, seconds: number): Report {
  const t0 = Date.now()
  const engine = new Engine(params)
  engine.run(seconds)
  const ms = Date.now() - t0
  const s = engine.history.samples
  // Ignore the first 12% as start-up transient.
  const from = Math.floor(s.length * 0.12)
  const body = s.slice(from)
  const blue = body.map((x) => x.blue)
  const red = body.map((x) => x.red)
  const fruit = body.map((x) => x.fruit)
  const win = Math.max(3, Math.round(body.length / 40))
  const blueS = movingAverage(blue, win)
  const redS = movingAverage(red, win)
  const dt = body.length > 1 ? (body[body.length - 1].t - body[0].t) / (body.length - 1) : 1
  const lag = bestLag(blueS, redS, Math.floor(body.length / 3))
  const capacity = engine.world.trees.length * params.fruitLimit
  return {
    label,
    blueMean: mean(blue),
    redMean: mean(red),
    fruitMean: mean(fruit),
    fruitFill: capacity ? mean(fruit) / capacity : 0,
    bluePeak: Math.max(...blue),
    redPeak: Math.max(...red),
    blueMin: Math.min(...blue),
    redMin: Math.min(...red),
    blueWaves: findPeaks(blueS, Math.max(2.5, mean(blue) * 0.28)).length,
    redWaves: findPeaks(redS, Math.max(1.8, mean(red) * 0.3)).length,
    lag: lag && lag.lag > 0 ? lag.lag * dt : null,
    blueEnd: engine.world.counts.blue,
    redEnd: engine.world.counts.red,
    blueDead: engine.world.counts.blue === 0,
    redDead: engine.world.counts.red === 0,
    capped: engine.world.capReached,
    ms,
  }
}

function fmt(r: Report): string {
  const n = (v: number, d = 1) => v.toFixed(d).padStart(6)
  const flag = r.blueDead ? ' BLUE-OUT' : r.redDead ? ' RED-OUT' : r.capped ? ' CAPPED' : ''
  return (
    `${r.label.padEnd(30)} blue ${n(r.blueMean)} (${String(r.blueMin).padStart(3)}-${String(r.bluePeak).padStart(3)})` +
    `  red ${n(r.redMean)} (${String(r.redMin).padStart(3)}-${String(r.redPeak).padStart(3)})` +
    `  fruit ${n(r.fruitMean)} ${(r.fruitFill * 100).toFixed(0).padStart(3)}%` +
    `  waves ${String(r.blueWaves).padStart(2)}/${String(r.redWaves).padStart(2)}` +
    `  lag ${r.lag === null ? '  -- ' : r.lag.toFixed(0).padStart(4)}s` +
    `  end ${String(r.blueEnd).padStart(3)}/${String(r.redEnd).padStart(3)}` +
    `  ${String(r.ms).padStart(5)}ms${flag}`
  )
}

const argv = process.argv.slice(2)
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

const seconds = Number(arg('seconds') ?? 1600)
const seeds = Number(arg('seeds') ?? 1)
const presetFilter = arg('preset')
const sweep = arg('sweep')
const trace = argv.includes('--trace')

/** `--const interferenceCost=1.2,shelterFactor=0.15` — fixed for every run. */
function applyFixedConsts() {
  const raw = arg('const')
  if (!raw) return
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=')
    overrideConst({ [k]: Number(v) })
  }
}
applyFixedConsts()

/**
 * The starting point every run is built from: a preset (or the defaults), with
 * `--set fruitGrowth=0.13,fruitLimit=6` patched over the top. Lets a scan hold a
 * candidate setting fixed while it sweeps two other knobs across it.
 */
function baseParams(): Params {
  const base = { ...(presetFilter ? (PRESETS.find((p) => p.id === presetFilter)?.params ?? DEFAULT_PARAMS) : DEFAULT_PARAMS) }
  const raw = arg('set')
  if (raw) {
    for (const pair of raw.split(',')) {
      const [k, v] = pair.split('=')
      applyKnob(k as Knob, Number(v), base)
    }
  }
  return base
}

/** Prints a running trace of one run, for working out *why* a group failed. */
function traceRun(params: Params, total: number) {
  const engine = new Engine(params)
  const slice = 20
  let lastContacts = 0
  let lastEaten = 0
  console.log('    t   blue  red fruit  contact/20s  eaten/20s  redE  blueE   blue spd/vis/thr   red spd/vis/thr')
  for (let i = 0; i < Math.round(total / slice); i++) {
    engine.run(slice)
    const w = engine.world
    const reds = w.blobs.filter((b) => b.kind === 'red')
    const blues = w.blobs.filter((b) => b.kind === 'blue')
    const traits = (arr: typeof reds) => {
      if (!arr.length) return '   --  --  -- '
      const m = (f: (b: (typeof arr)[0]) => number) => (arr.reduce((s, b) => s + f(b), 0) / arr.length).toFixed(2)
      return `${m((b) => b.traits.speed)}/${m((b) => b.traits.vision)}/${m((b) => b.traits.thrift)}`
    }
    const contacts = w.totals.contacts - lastContacts
    lastContacts = w.totals.contacts
    const eaten = w.totals.fruitEaten - lastEaten
    lastEaten = w.totals.fruitEaten
    const avg = (arr: typeof reds) => (arr.length ? arr.reduce((s, b) => s + b.energy, 0) / arr.length : 0)
    console.log(
      `${w.t.toFixed(0).padStart(5)} ${String(w.counts.blue).padStart(5)} ${String(w.counts.red).padStart(4)}` +
        ` ${String(w.counts.fruit).padStart(5)} ${String(contacts).padStart(12)} ${String(eaten).padStart(10)}` +
        ` ${avg(reds).toFixed(0).padStart(5)} ${avg(blues).toFixed(0).padStart(6)}   ${traits(blues)}  ${traits(reds)}`,
    )
  }
  console.log('  totals', JSON.stringify(engine.world.totals))
}

/**
 * Grid-scan two parameters and score each cell by how many seeds end with both
 * groups still alive. Finds a setting that is robust rather than lucky.
 *   pnpm probe --scan redUpkeep=1.8,2.2,2.6 --scan2 worldSize=230,270,310 --seeds 5
 */
function runScan(a: string, b: string, seedCount: number, total: number) {
  const [keyA, listA] = a.split('=')
  const [keyB, listB] = b.split('=')
  const valsA = listA.split(',').map(Number)
  const valsB = listB.split(',').map(Number)
  const base = baseParams()
  console.log(`  rows: ${keyA}   cols: ${keyB}   cell: coexist/${seedCount} (mean blue/red)\n`)
  console.log(''.padEnd(12) + valsB.map((v) => String(v).padStart(18)).join(''))
  for (const va of valsA) {
    const cells: string[] = []
    for (const vb of valsB) {
      let ok = 0
      let blueSum = 0
      let redSum = 0
      for (let s = 0; s < seedCount; s++) {
        const params: Params = { ...base, seed: base.seed + s * 7919 }
        overrideConst(BASE_CONST)
        applyFixedConsts()
        applyKnob(keyA as Knob, va, params)
        applyKnob(keyB as Knob, vb, params)
        const r = analyse('', params, total)
        if (!r.blueDead && !r.redDead) ok++
        blueSum += r.blueMean
        redSum += r.redMean
      }
      cells.push(`${ok}/${seedCount} ${(blueSum / seedCount).toFixed(0)}b ${(redSum / seedCount).toFixed(0)}r`.padStart(18))
    }
    console.log(String(va).padEnd(12) + cells.join(''))
  }
}

console.log(`\n  probe · ${seconds}s per run · ${seeds} seed(s)\n`)

const scan = arg('scan')
const scan2 = arg('scan2')
if (scan && scan2) {
  runScan(scan, scan2, seeds, seconds)
  process.exit(0)
}

if (trace) {
  traceRun(baseParams(), seconds)
  process.exit(0)
}

if (sweep) {
  const [key, listRaw] = sweep.split('=')
  const values = listRaw.split(',').map(Number)
  const base = baseParams()
  for (const v of values) {
    for (let s = 0; s < seeds; s++) {
      const params: Params = { ...base, seed: base.seed + s * 7919 }
      overrideConst(BASE_CONST)
      applyFixedConsts()
      applyKnob(key as Knob, v, params)
      console.log(fmt(analyse(`${key}=${v}${seeds > 1 ? ` #${s}` : ''}`, params, seconds)))
    }
  }
} else {
  for (const preset of PRESETS) {
    if (presetFilter && preset.id !== presetFilter) continue
    // With --preset, --set patches that preset so candidates can be tried
    // without editing params.ts first.
    const base = presetFilter === preset.id ? baseParams() : preset.params
    for (let s = 0; s < seeds; s++) {
      const params: Params = { ...base, seed: base.seed + s * 7919 }
      console.log(fmt(analyse(`${preset.name}${seeds > 1 ? ` #${s}` : ''}`, params, seconds)))
    }
  }
}
console.log('')
