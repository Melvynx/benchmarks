/**
 * Headless probe: runs presets and prints what the ecology actually did.
 *
 *   pnpm probe
 *   pnpm probe --seconds 3000
 *   pnpm probe --preset balanced --seeds 6
 */
import { Engine } from '../src/sim/engine'
import { movingAverage, findPeaks, mean, bestLag } from '../src/sim/analysis'
import { DEFAULT_PARAMS, PRESETS, type Params } from '../src/sim/params'

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

function analyse(label: string, params: Params, seconds: number): Report {
  const t0 = Date.now()
  const engine = new Engine(params)
  engine.run(seconds)
  const ms = Date.now() - t0
  const s = engine.history.samples
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

console.log(`\n  probe · ${seconds}s per run · ${seeds} seed(s)\n`)

for (const preset of PRESETS) {
  if (presetFilter && preset.id !== presetFilter) continue
  const base = presetFilter === preset.id ? { ...DEFAULT_PARAMS, ...preset.params } : preset.params
  for (let s = 0; s < seeds; s++) {
    const params: Params = { ...base, seed: base.seed + s * 7919 }
    console.log(fmt(analyse(`${preset.name}${seeds > 1 ? ` #${s}` : ''}`, params, seconds)))
  }
}
console.log('')
