import type { Sample } from './history'

export function movingAverage(values: number[], window: number): number[] {
  if (window <= 1 || values.length === 0) return values.slice()
  const half = Math.floor(window / 2)
  const out: number[] = new Array(values.length)
  let sum = 0
  const queue: number[] = []
  for (let i = 0; i < values.length; i++) {
    queue.push(values[i]!)
    sum += values[i]!
    if (queue.length > window) sum -= queue.shift() as number
    out[Math.max(0, i - half)] = sum / queue.length
  }
  for (let i = Math.max(0, values.length - half); i < values.length; i++) {
    out[i] = sum / queue.length
  }
  return out
}

export type Peak = { index: number; value: number }

export function findPeaks(values: number[], prominence: number): Peak[] {
  const peaks: Peak[] = []
  let i = 1
  while (i < values.length - 1) {
    if (values[i]! >= values[i - 1]! && values[i]! > values[i + 1]!) {
      let l = i
      let leftMin = values[i]!
      while (l > 0 && values[l - 1]! <= values[i]!) {
        l--
        leftMin = Math.min(leftMin, values[l]!)
      }
      let r = i
      let rightMin = values[i]!
      while (r < values.length - 1 && values[r + 1]! <= values[i]!) {
        r++
        rightMin = Math.min(rightMin, values[r]!)
      }
      const drop = values[i]! - Math.max(leftMin, rightMin)
      if (drop >= prominence) peaks.push({ index: i, value: values[i]! })
      i = r + 1
    } else {
      i++
    }
  }
  return peaks
}

export function mean(values: number[]): number {
  if (!values.length) return 0
  let s = 0
  for (const v of values) s += v
  return s / values.length
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  let s = 0
  for (const v of values) s += (v - m) * (v - m)
  return Math.sqrt(s / (values.length - 1))
}

function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 4) return 0
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    const x = a[i]! - ma
    const y = b[i]! - mb
    num += x * y
    da += x * x
    db += y * y
  }
  if (da === 0 || db === 0) return 0
  return num / Math.sqrt(da * db)
}

/** Positive lag means `b` trails `a`. */
export function bestLag(a: number[], b: number[], maxLag: number): { lag: number; r: number } | null {
  if (a.length < 12) return null
  let best: { lag: number; r: number } | null = null
  for (let lag = 0; lag <= maxLag; lag++) {
    const r = correlation(a.slice(0, a.length - lag), b.slice(lag))
    if (!best || r > best.r) best = { lag, r }
  }
  return best && best.r > 0.22 ? best : null
}

export type RunSummary = {
  headline: string
  notes: string[]
  cycles: number
  lagSeconds: number | null
  settled: boolean
  tone: 'balanced' | 'wave' | 'small' | 'faded' | 'early'
}

export function summarise(input: {
  samples: Sample[]
  fruitCapacity: number
  blueAlive: number
  redAlive: number
}): RunSummary {
  const { samples, fruitCapacity, blueAlive, redAlive } = input
  if (samples.length < 14) {
    return {
      headline: 'The garden is still warming up.',
      notes: ['Give it a little time. The first wave needs a few meals to show up.'],
      cycles: 0,
      lagSeconds: null,
      settled: false,
      tone: 'early',
    }
  }

  const span = samples[samples.length - 1]!.t - samples[0]!.t
  const dt = span / Math.max(1, samples.length - 1)
  const win = Math.max(3, Math.round(samples.length / 40))
  const blue = samples.map((s) => s.blue)
  const red = samples.map((s) => s.red)
  const fruit = samples.map((s) => s.fruit)
  const blueS = movingAverage(blue, win)
  const redS = movingAverage(red, win)
  const blueMean = mean(blue)
  const redMean = mean(red)
  const fruitMean = mean(fruit)
  const fruitFill = fruitCapacity > 0 ? fruitMean / fruitCapacity : 0
  const bluePeaks = findPeaks(blueS, Math.max(2.2, blueMean * 0.26))
  const redPeaks = findPeaks(redS, Math.max(1.6, redMean * 0.28))
  const cycles = Math.max(bluePeaks.length, redPeaks.length)
  const lag = bestLag(blueS, redS, Math.floor(samples.length / 3))
  const lagSeconds = lag && lag.lag > 0 ? lag.lag * dt : null
  const third = Math.floor(samples.length / 3)
  const early = blue.slice(third, third * 2)
  const late = blue.slice(third * 2)
  const settled = stdev(late) < Math.max(1.1, stdev(early) * 0.48) && late.length > 6

  const notes: string[] = []
  let headline: string
  let tone: RunSummary['tone']
  const blueGone = blueAlive === 0
  const redGone = redAlive === 0

  if (blueGone && redGone) {
    headline = 'Both groups faded and the dish went quiet.'
    tone = 'faded'
    notes.push('Nothing is left to pick the fruit, so the plants just fill up.')
  } else if (blueGone) {
    headline = 'Blue blobs died out, and red followed them down.'
    tone = 'faded'
    notes.push('With no blue blobs to meet, red energy had nowhere to come from.')
  } else if (redGone) {
    headline = 'Red blobs faded and the world settled into a simpler state.'
    tone = 'faded'
    notes.push(`Blue was left with the plants and levelled off near ${Math.round(mean(blue.slice(-Math.max(4, third))))}.`)
  } else if (bluePeaks.length >= 2 && redPeaks.length >= 1 && lagSeconds !== null) {
    headline = 'Blue blobs grew first, then red blobs followed.'
    tone = 'wave'
    notes.push(`Red trailed blue by about ${Math.round(lagSeconds)}s across ${bluePeaks.length} blue waves.`)
  } else if (fruitFill < 0.32 && blueMean < 16) {
    headline = 'Low fruit kept the garden small.'
    tone = 'small'
    notes.push(`Plants sat at ${Math.round(fruitFill * 100)}% of capacity. Food ran out as fast as it grew.`)
  } else if (cycles >= 2) {
    headline = 'The garden stayed balanced.'
    tone = 'balanced'
    notes.push(`${bluePeaks.length} blue waves and ${redPeaks.length} red waves so far.`)
  } else if (settled) {
    headline = 'The garden levelled out and held steady.'
    tone = 'balanced'
  } else {
    headline = 'The garden is finding its level.'
    tone = 'early'
  }

  if (!blueGone && !redGone) {
    if (fruitFill > 0.72) notes.push('Plants stayed heavy with fruit. Food was never the limit here.')
    else if (fruitFill < 0.24) notes.push('Plants were picked almost bare. Fruit was the binding constraint.')
  }
  if (settled && !blueGone && !redGone) notes.push('Swings damped down over the run instead of growing.')
  if (redMean > blueMean && !redGone) notes.push('Red outnumbered blue on average, which is a hard state to hold.')

  notes.push(`Peaks so far: ${Math.max(...blue)} blue, ${Math.max(...red)} red, ${Math.max(...fruit)} fruit.`)
  return { headline, notes, cycles, lagSeconds, settled, tone }
}
