import { World, C } from '../src/sim/world'
import { presetParams, type Params } from '../src/sim/params'
import { smooth, findPeaks } from '../src/sim/signal'

type Space = Partial<Record<keyof Params, [number, number]>>

interface Args {
  n: number
  seconds: number
  seeds: number[]
  base: string
  space: Space
  consts: Record<string, [number, number]>
  seedRng: number
}

const presetOverrides: Partial<Params> = {}

const args: Args = {
  n: 60,
  seconds: 1500,
  seeds: [1, 2, 3],
  base: 'balanced',
  seedRng: 1,
  space: {
    redStrength: [8, 30],
    redPause: [2, 8],
    redUse: [0.8, 2.2],
    redVision: [5, 10],
    redSpeed: [2.4, 3.2],
    redCopy: [70, 95],
  },
  consts: {},
}

for (const a of process.argv.slice(2)) {
  const [k, v] = a.replace(/^--/, '').split('=')
  if (k === 'n') args.n = Number(v)
  else if (k === 'seconds') args.seconds = Number(v)
  else if (k === 'base') args.base = v
  else if (k === 'seedRng') args.seedRng = Number(v)
  else if (k === 'seeds') args.seeds = v.split(',').map(Number)
  else if (k === 'space') {
    args.space = {}
    for (const part of v.split(';')) {
      const [name, lo, hi] = part.split(':')
      ;(args.space as Record<string, [number, number]>)[name] = [Number(lo), Number(hi)]
    }
  } else if (k === 'consts') {
    for (const part of v.split(';')) {
      const [name, lo, hi] = part.split(':')
      args.consts[name] = [Number(lo), Number(hi)]
    }
  } else if (k.startsWith('P.')) {
    ;(presetOverrides as Record<string, number>)[k.slice(2)] = Number(v)
  }
}

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
const rnd = lcg(args.seedRng)
const constDefaults = { ...C } as Record<string, number>

interface Result {
  score: number
  survived: number
  amp: number
  peaks: number
  detail: string
  cfg: string
}

function evaluate(over: Partial<Params>, consts: Record<string, number>): Result {
  let survived = 0
  let ampSum = 0
  let peakSum = 0
  const details: string[] = []
  for (const [k, v] of Object.entries(consts)) (C as Record<string, number>)[k] = v
  for (const seed of args.seeds) {
    const params: Params = { ...presetParams(args.base), ...presetOverrides, ...over, seed }
    const w = new World(params)
    w.emit = false
    const ticks = Math.round(args.seconds / C.DT)
    for (let i = 0; i < ticks; i++) {
      w.step()
      if (w.blueCount === 0 || w.redCount === 0) break
    }
    const alive = w.blueCount > 0 && w.redCount > 0 && w.t >= args.seconds - 1
    if (alive) survived++
    const h = w.history.slice(Math.floor(w.history.length * 0.25))
    const bl = smooth(h.map((s) => s.blue), 9)
    const rd = smooth(h.map((s) => s.red), 9)
    const mb = bl.reduce((a, b) => a + b, 0) / Math.max(1, bl.length)
    const mr = rd.reduce((a, b) => a + b, 0) / Math.max(1, rd.length)
    const pb = findPeaks(bl, Math.max(6, mb * 0.3)).length
    const pr = findPeaks(rd, Math.max(2, mr * 0.3)).length
    const amp = mb > 0 ? (Math.max(...bl) - Math.min(...bl)) / mb : 0
    ampSum += amp
    peakSum += Math.min(pb, pr)
    details.push(`${alive ? 'ok' : 'X' + w.t.toFixed(0)}:b${mb.toFixed(0)}/r${mr.toFixed(0)}/p${pb},${pr}`)
  }
  for (const [k, v] of Object.entries(constDefaults)) (C as Record<string, number>)[k] = v
  const n = args.seeds.length
  const amp = ampSum / n
  const peaks = peakSum / n
  const score = survived / n * 10 + Math.min(peaks, 6) + Math.min(amp, 1.2)
  return { score, survived, amp, peaks, detail: details.join(' '), cfg: '' }
}

const results: Result[] = []
for (let i = 0; i < args.n; i++) {
  const over: Partial<Params> = {}
  for (const [k, [lo, hi]] of Object.entries(args.space)) {
    ;(over as Record<string, number>)[k] = +(lo + (hi - lo) * rnd()).toFixed(2)
  }
  const consts: Record<string, number> = {}
  for (const [k, [lo, hi]] of Object.entries(args.consts)) consts[k] = +(lo + (hi - lo) * rnd()).toFixed(3)
  const r = evaluate(over, consts)
  r.cfg = JSON.stringify(over) + (Object.keys(consts).length ? ' C=' + JSON.stringify(consts) : '')
  results.push(r)
}
results.sort((a, b) => b.score - a.score)
for (const r of results.slice(0, 12)) {
  console.log(`score=${r.score.toFixed(2)} surv=${r.survived}/${args.seeds.length} amp=${r.amp.toFixed(2)} peaks=${r.peaks.toFixed(1)} | ${r.detail}\n   ${r.cfg}`)
}
