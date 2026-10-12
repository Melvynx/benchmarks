import { World, C } from '../src/sim/world'
import { presetParams, type Params } from '../src/sim/params'
import { smooth, findPeaks, correlationLag, dominantCycle, percentile } from '../src/sim/signal'

type Space = Partial<Record<keyof Params, [number, number]>>

interface Args {
  n: number
  seconds: number
  seeds: number[]
  base: string
  space: Space
  consts: Record<string, [number, number]>
  seedRng: number
  skip: number
}

const presetOverrides: Partial<Params> = {}

const args: Args = {
  n: 60,
  seconds: 1500,
  seeds: [1, 2, 3],
  base: 'balanced',
  seedRng: 1,
  skip: 600,
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
  else if (k === 'skip') args.skip = Number(v)
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
const INTEGER_KEYS = new Set(['fruitLimit', 'trees', 'startBlue', 'startRed', 'worldSize', 'redStrength', 'redCopy', 'blueCopy'])
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
  let scoreSum = 0
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
    const dt = w.sampleEvery
    const h = w.history.filter((s) => s.t >= args.skip)
    const sw = Math.max(3, Math.round(15 / dt) | 1)
    const bl = smooth(h.map((s) => s.blue), sw)
    const rd = smooth(h.map((s) => s.red), sw)
    const mb = bl.reduce((a, b) => a + b, 0) / Math.max(1, bl.length)
    const mr = rd.reduce((a, b) => a + b, 0) / Math.max(1, rd.length)
    let seedScore = alive ? 10 : 0
    let detail = `${alive ? 'ok' : 'X' + w.t.toFixed(0)}:b${mb.toFixed(0)}/r${mr.toFixed(0)}`
    if (alive && bl.length > 40) {
      const ampB = (percentile(bl, 0.9) - percentile(bl, 0.1)) / Math.max(1, mb)
      const ampR = (percentile(rd, 0.9) - percentile(rd, 0.1)) / Math.max(1, mr)
      const cyc = dominantCycle(bl, Math.round(30 / dt), Math.round(700 / dt))
      const cycR = dominantCycle(rd, Math.round(30 / dt), Math.round(700 / dt))
      const period = cyc.period || Math.round(200 / dt)
      const lag = correlationLag(bl, rd, Math.max(2, Math.round(period / 2)))
      const xc = lag.lag > 0 ? Math.max(0, lag.corr) : 0
      const pb = findPeaks(bl, Math.max(4, mb * 0.3)).length
      seedScore += Math.min(cyc.strength, 0.7) * 8 + Math.min(cycR.strength, 0.6) * 3 + xc * 4 + Math.min(ampB, 1) * 3 + Math.min(ampR, 0.8) * 2
      if (mr > mb * 1.25) seedScore -= 1.5
      ampSum += ampB
      peakSum += pb
      detail += `/amp${ampB.toFixed(2)},${ampR.toFixed(2)}/T${(cyc.period * dt).toFixed(0)}@${cyc.strength.toFixed(2)}/lag${(lag.lag * dt).toFixed(0)}@${lag.corr.toFixed(2)}/p${pb}`
    }
    scoreSum += seedScore
    details.push(detail)
  }
  for (const [k, v] of Object.entries(constDefaults)) (C as Record<string, number>)[k] = v
  const n = args.seeds.length
  return { score: scoreSum / n, survived, amp: ampSum / n, peaks: peakSum / n, detail: details.join(' '), cfg: '' }
}

const results: Result[] = []
for (let i = 0; i < args.n; i++) {
  const over: Partial<Params> = {}
  for (const [k, [lo, hi]] of Object.entries(args.space)) {
    const v = lo + (hi - lo) * rnd()
    ;(over as Record<string, number>)[k] = INTEGER_KEYS.has(k) ? Math.round(v) : +v.toFixed(2)
  }
  const consts: Record<string, number> = {}
  for (const [k, [lo, hi]] of Object.entries(args.consts)) consts[k] = +(lo + (hi - lo) * rnd()).toFixed(3)
  const r = evaluate(over, consts)
  r.cfg = JSON.stringify(over) + (Object.keys(consts).length ? ' C=' + JSON.stringify(consts) : '')
  results.push(r)
}
results.sort((a, b) => b.score - a.score)
for (const r of results.slice(0, 8)) {
  console.log(`score=${r.score.toFixed(2)} surv=${r.survived}/${args.seeds.length} amp=${r.amp.toFixed(2)} peaks=${r.peaks.toFixed(1)} | ${r.detail}\n   ${r.cfg}`)
}
