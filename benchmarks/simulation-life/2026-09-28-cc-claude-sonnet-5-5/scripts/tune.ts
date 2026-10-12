import { World, C } from '../src/sim/world'
import { DEFAULT_PARAMS, PRESETS, presetParams, type Params } from '../src/sim/params'

interface Opts {
  preset: string
  seconds: number
  every: number
  seeds: number[]
  overrides: Partial<Params>
  quiet: boolean
}

function parseArgs(): Opts {
  const o: Opts = { preset: 'balanced', seconds: 1200, every: 20, seeds: [], overrides: {}, quiet: false }
  for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--/, '').split('=')
    if (k === 'preset') o.preset = v
    else if (k === 'seconds') o.seconds = Number(v)
    else if (k === 'every') o.every = Number(v)
    else if (k === 'seeds') o.seeds = v.split(',').map(Number)
    else if (k === 'quiet') o.quiet = true
    else if (k.startsWith('C.')) (C as Record<string, number>)[k.slice(2)] = Number(v)
    else if (k in DEFAULT_PARAMS) (o.overrides as Record<string, number>)[k] = Number(v)
  }
  return o
}

function peaks(series: number[], minProm: number): number {
  let count = 0
  let last = series[0]
  let dir = 0
  let ref = series[0]
  for (const v of series) {
    if (dir >= 0 && v > last) dir = 1
    if (dir === 1 && v < last - minProm && last - ref >= minProm * 0.5) {
      count++
      dir = -1
      ref = last
    }
    if (dir === -1 && v > last + minProm) {
      dir = 1
      ref = last
    }
    if (v > last && dir === 1) last = v
    else if (dir !== 1) last = v
    if (dir === 1 && v >= last) last = v
  }
  return count
}

function run(preset: string, seed: number | undefined, o: Opts) {
  const params: Params = { ...presetParams(preset), ...o.overrides }
  if (seed !== undefined) params.seed = seed
  const w = new World(params)
  w.emit = false
  const ticks = Math.round(o.seconds / C.DT)
  const t0 = Date.now()
  if (!o.quiet) console.log(`\n== ${preset} seed=${params.seed}`)
  let nextPrint = 0
  for (let i = 0; i < ticks; i++) {
    w.step()
    if (!o.quiet && w.t >= nextPrint) {
      const s = w.history[w.history.length - 1]
      console.log(
        `t=${w.t.toFixed(0).padStart(5)} fruit=${String(w.fruitCount).padStart(4)} blue=${String(w.blueCount).padStart(4)} red=${String(w.redCount).padStart(3)}  bE=${s.blueEnergy.toFixed(0)} rE=${s.redEnergy.toFixed(0)} bspd=${s.blueSpeed.toFixed(2)} bvis=${s.blueVision.toFixed(1)} rspd=${s.redSpeed.toFixed(2)}`,
      )
      nextPrint += o.every
    }
    if (w.blueCount === 0 && w.redCount === 0) break
  }
  const h = w.history
  const half = h.slice(Math.floor(h.length / 2))
  const bl = half.map((s) => s.blue)
  const rd = half.map((s) => s.red)
  const stat = (a: number[]) => `${Math.min(...a)}-${Math.max(...a)} (mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(0)})`
  const bp = peaks(h.map((s) => s.blue), 8)
  const rp = peaks(h.map((s) => s.red), 3)
  console.log(
    `${preset} seed=${params.seed}: end t=${w.t.toFixed(0)} blue=${w.blueCount} red=${w.redCount} | 2nd-half blue ${stat(bl)} red ${stat(rd)} | blue peaks=${bp} red peaks=${rp} | born b/r=${w.stats.blueBorn}/${w.stats.redBorn} drained=${w.stats.blueDrained} contacts=${w.stats.contacts} fruitEaten=${w.stats.fruitEaten} | ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  )
}

const o = parseArgs()
if (o.preset === 'all') {
  for (const p of PRESETS) run(p.id, undefined, { ...o, quiet: true })
} else if (o.seeds.length) {
  for (const s of o.seeds) run(o.preset, s, { ...o, quiet: o.quiet })
} else {
  run(o.preset, undefined, o)
}
