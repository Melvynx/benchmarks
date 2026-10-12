import type { History } from './history.ts'
import type { Params } from './params.ts'
import type { Totals } from './world.ts'

export interface Peak {
  n: number
  t: number
}

export interface Story {
  headline: string
  lines: string[]
  mood: 'early' | 'balanced' | 'booming' | 'small' | 'faded' | 'empty' | 'settled'
  /** Typical seconds from a blue peak to the red peak that follows it. */
  lagSec: number | null
  /** Net counter-clockwise loops on the blue–red phase plot while both lived. */
  loops: number
  blueWaves: number
  redWaves: number
  peakBlue: Peak
  peakRed: Peak
  peakFruit: Peak
  blueGoneAt: number | null
  redGoneAt: number | null
  leveled: boolean
  /** Ripe fruit the trees can supply per second at most. */
  fruitSupply: number
  duration: number
}

function peakOf(v: number[], t: number[]): Peak {
  let n = -Infinity
  let at = 0
  for (let i = 0; i < v.length; i++) {
    if (v[i] > n) {
      n = v[i]
      at = t[i]
    }
  }
  return { n: Number.isFinite(n) ? n : 0, t: at }
}

function goneAt(v: number[], t: number[]): number | null {
  if (!v.length || v[0] === 0) return null
  for (let i = 0; i < v.length; i++) if (v[i] === 0) return t[i]
  return null
}

function smooth(v: number[], w: number): number[] {
  if (w <= 1) return v.slice()
  const out = new Array<number>(v.length)
  const h = Math.floor(w / 2)
  let sum = 0
  let lo = 0
  let hi = -1
  for (let i = 0; i < v.length; i++) {
    const a = Math.max(0, i - h)
    const b = Math.min(v.length - 1, i + h)
    while (hi < b) sum += v[++hi]
    while (lo < a) sum -= v[lo++]
    out[i] = sum / (hi - lo + 1)
  }
  return out
}

function quantile(v: number[], q: number): number {
  if (!v.length) return 0
  const s = v.slice().sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]
}

/** Peaks counted with hysteresis so jitter does not count as a wave. Returns peak times. */
export function wavePeaks(v: number[], t: number[], minSwing: number): number[] {
  const peaks: number[] = []
  if (v.length < 3) return peaks
  let rising = true
  let hi = v[0]
  let hiT = t[0]
  let lo = v[0]
  for (let i = 1; i < v.length; i++) {
    const x = v[i]
    if (rising) {
      if (x > hi) {
        hi = x
        hiT = t[i]
      } else if (x < hi - minSwing) {
        if (hi - lo >= minSwing) peaks.push(hiT)
        rising = false
        lo = x
      }
    } else if (x < lo) {
      lo = x
    } else if (x > lo + minSwing) {
      rising = true
      hi = x
      hiT = t[i]
    }
  }
  return peaks
}

/**
 * Net turns of the (blue, red) trajectory around its centre. Positive means
 * counter-clockwise loops: blue rises, then red, then blue falls, then red —
 * the out-of-phase signature of the two groups.
 */
export function phaseLoops(b: number[], r: number[], every: number): number {
  const n = b.length
  if (n < 4) return 0
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  const sd = (a: number[], m: number) => Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) || 1
  const mb = mean(b)
  const mr = mean(r)
  const sb = sd(b, mb)
  const sr = sd(r, mr)
  let total = 0
  let prev = Math.atan2((r[0] - mr) / sr, (b[0] - mb) / sb)
  for (let i = every; i < n; i += every) {
    const x = (b[i] - mb) / sb
    const y = (r[i] - mr) / sr
    if (x * x + y * y < 0.04) continue
    const a = Math.atan2(y, x)
    let d = a - prev
    d = Math.atan2(Math.sin(d), Math.cos(d))
    total += d
    prev = a
  }
  return total / (Math.PI * 2)
}

/** Median delay from each red peak back to the blue peak just before it. */
function peakLag(bluePeaks: number[], redPeaks: number[], maxGap: number): number | null {
  const gaps: number[] = []
  for (const rt of redPeaks) {
    let best = -1
    for (const bt of bluePeaks) if (bt < rt && rt - bt <= maxGap) best = bt
    if (best >= 0) gaps.push(rt - best)
  }
  if (gaps.length < 2) return null
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}

export function fruitSupplyOf(p: Params): number {
  return (p.trees * p.fruitLimit) / (1 / p.fruitGrowth + p.fruitDelay + p.blueEatTime * 0.5)
}

const clock = (s: number) => {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

/** Reads the recorded history and tells the story of the run so far. */
export function tellStory(h: History, p: Params, totals: Totals): Story {
  const t = h.cols.t
  const B = h.cols.blue
  const R = h.cols.red
  const F = h.cols.fruit
  const n = t.length
  const duration = n ? t[n - 1] : 0
  const dtS = n > 1 ? (t[n - 1] - t[0]) / (n - 1) : 0.5
  const peakBlue = peakOf(B, t)
  const peakRed = peakOf(R, t)
  const peakFruit = peakOf(F, t)
  const blueGoneAt = goneAt(B, t)
  const redGoneAt = goneAt(R, t)
  const fruitSupply = fruitSupplyOf(p)

  const win = Math.max(1, Math.round(6 / dtS))
  const sb = smooth(B, win)
  const sr = smooth(R, win)
  const swingB = Math.max(4, 0.3 * (quantile(sb, 0.9) - quantile(sb, 0.1)))
  const swingR = Math.max(2, 0.3 * (quantile(sr, 0.9) - quantile(sr, 0.1)))
  const bluePeaks = wavePeaks(sb, t, swingB)
  const redPeaks = wavePeaks(sr, t, swingR)

  // Out-of-phase check over the stretch where both groups were alive
  const bothEnd = Math.min(blueGoneAt ?? Infinity, redGoneAt ?? Infinity)
  const aliveEnd = t.findIndex((x) => x >= bothEnd)
  const end = aliveEnd < 0 ? n : aliveEnd
  // cycles are slow (minutes), so smooth harder and centre on a moving mean to drop drift
  let loops = 0
  if (end > 8) {
    const wS = Math.max(1, Math.round(20 / dtS))
    const wT = Math.max(2, Math.round(300 / dtS))
    const b20 = smooth(B.slice(0, end), wS)
    const r20 = smooth(R.slice(0, end), wS)
    const bT = smooth(B.slice(0, end), wT)
    const rT = smooth(R.slice(0, end), wT)
    loops = phaseLoops(
      b20.map((x, i) => x - bT[i]),
      r20.map((x, i) => x - rT[i]),
      Math.max(1, Math.round(2 / dtS)),
    )
  }
  const lagSec = peakLag(
    bluePeaks.filter((x) => x < bothEnd),
    redPeaks.filter((x) => x < bothEnd),
    150,
  )

  // Did the numbers settle? Look at the spread over the last few minutes.
  let leveled = false
  let tailRange: [number, number, number, number] | null = null
  if (duration > 300) {
    const k = t.findIndex((x) => x >= duration - 240)
    const tailB = B.slice(k)
    const tailR = R.slice(k)
    tailRange = [Math.min(...tailB), Math.max(...tailB), Math.min(...tailR), Math.max(...tailR)]
    const cv = (a: number[]) => {
      const m = a.reduce((x, y) => x + y, 0) / a.length
      if (m === 0) return 0
      return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m
    }
    leveled = cv(tailB) < 0.15 && cv(tailR) < 0.3
  }

  const lines: string[] = []
  const nowB = n ? B[n - 1] : 0
  const nowR = n ? R[n - 1] : 0
  const startB = n ? B[0] : p.blue0
  const startR = n ? R[0] : p.red0
  let headline = ''
  let mood: Story['mood'] = 'early'

  const lowFruit = fruitSupply < 2 && peakBlue.n < 60
  const redHeavy = startR >= Math.max(10, startB * 0.6)

  if (duration < 45) {
    headline = 'The garden is waking up.'
    lines.push(`${startB} blue and ${startR} red blobs share ${p.trees} fruit trees.`)
    if (nowB > startB) lines.push('Blue blobs are finding fruit and starting to copy.')
  } else if (blueGoneAt !== null && (redGoneAt !== null || nowR === 0)) {
    mood = 'empty'
    headline = 'Both groups faded. Only the fruit trees remain.'
    lines.push(`Blue blobs faded at ${clock(blueGoneAt)}, so the reds lost their only energy source.`)
    if (redGoneAt !== null) lines.push(`The last red blob faded at ${clock(redGoneAt)}.`)
  } else if (blueGoneAt !== null) {
    mood = 'faded'
    headline = 'Blue blobs faded. Red blobs are running low.'
    lines.push(`With no blue blobs after ${clock(blueGoneAt)}, red blobs can only burn stored energy.`)
  } else if (redGoneAt !== null) {
    mood = 'faded'
    headline = 'Red blobs faded, and the world settled into a simpler state.'
    lines.push(`The last red blob faded at ${clock(redGoneAt)}.`)
    if (lowFruit) lines.push(`Low fruit kept the blue group small (never above ${peakBlue.n}), too few for reds to live on.`)
    else lines.push('Without reds, blue blobs grow until fruit is the only limit.')
  } else if (lowFruit) {
    mood = 'small'
    headline = 'Low fruit kept the garden small.'
    lines.push(`The trees supply about ${fruitSupply.toFixed(1)} fruit per second, so blue never passed ${peakBlue.n}.`)
  } else if (bluePeaks.length >= 2 && redPeaks.length >= 2 && fruitSupply > 15) {
    mood = 'booming'
    headline = 'Plentiful fruit drives big boom-and-bust waves.'
    lines.push(`${Math.min(bluePeaks.length, redPeaks.length)} waves so far. Blue swings up to ${peakBlue.n}, then a red boom (up to ${peakRed.n}) pulls it back down.`)
  } else if (bluePeaks.length >= 2 && redPeaks.length >= 2) {
    mood = 'balanced'
    headline = 'The garden stayed balanced.'
    lines.push(`${Math.min(bluePeaks.length, redPeaks.length)} rise-and-fall waves so far, and both groups are still here.`)
  } else if (peakBlue.n > startB * 3 && nowB > startB * 2) {
    mood = 'booming'
    headline = 'Blue blobs are booming on plentiful fruit.'
  } else {
    mood = 'settled'
    headline = 'The garden is finding its rhythm.'
  }

  if (duration >= 45) {
    if (lagSec !== null && loops >= 1) {
      lines.push(`Blue blobs grow first, then red blobs follow about ${Math.round(lagSec)}s later. The phase plot has looped ${Math.floor(loops)}× counter-clockwise.`)
    } else if (lagSec !== null) {
      lines.push(`Blue blobs grow first, then red blobs follow about ${Math.round(lagSec)}s later.`)
    } else if (bluePeaks.length && redPeaks.length && bluePeaks[0] < redPeaks[0]) {
      lines.push(`Blue peaked first (${clock(bluePeaks[0])}), then red followed (${clock(redPeaks[0])}).`)
    }
    if (redHeavy) {
      const redDrop = R.findIndex((x) => x <= startR * 0.5)
      if (redDrop >= 0) {
        const early = peakOf(B.slice(0, redDrop + 1).map((x) => -x), t)
        if (-early.n < startB) {
          lines.push(`Too many reds at the start: blue dipped to ${-early.n} by ${clock(early.t)}, then reds ran short and fell to half by ${clock(t[redDrop])}.`)
        }
      }
    }
    if (peakBlue.n >= startB * 4 && peakBlue.t < peakRed.t) {
      lines.push(`Rich fruit let blue blobs jump from ${startB} to ${peakBlue.n} by ${clock(peakBlue.t)}.`)
    }
    if (blueGoneAt === null && tailRange) {
      if (leveled) {
        lines.push(`Numbers have leveled out around ${nowB} blue${redGoneAt === null ? ` and ${nowR} red` : ''}.`)
      } else if (redGoneAt === null) {
        lines.push(`No runaway growth: over the last 4 min blue stayed within ${tailRange[0]}–${tailRange[1]} and red within ${tailRange[2]}–${tailRange[3]}.`)
      }
    }
    const bornB = totals.births[0]
    if (bornB > 0) lines.push(`${bornB} blue and ${totals.births[1]} red copies made, ${totals.fruitEaten} fruit eaten, ${totals.contacts} boops.`)
  }

  return {
    headline,
    lines,
    mood,
    lagSec,
    loops,
    blueWaves: bluePeaks.length,
    redWaves: redPeaks.length,
    peakBlue,
    peakRed,
    peakFruit,
    blueGoneAt,
    redGoneAt,
    leveled,
    fruitSupply,
    duration,
  }
}

export { clock }
