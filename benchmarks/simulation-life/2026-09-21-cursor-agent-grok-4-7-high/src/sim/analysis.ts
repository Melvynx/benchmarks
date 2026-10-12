import type { Sample } from './types'

export function movingAverage(values: number[], window: number): number[] {
  if (window <= 1 || values.length === 0) return values.slice()
  const half = Math.floor(window / 2)
  const out: number[] = new Array(values.length)
  let sum = 0
  const queue: number[] = []
  for (let i = 0; i < values.length; i++) {
    queue.push(values[i])
    sum += values[i]
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
  const gap = Math.max(4, Math.round(values.length / 24))
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < values[i - 1] || values[i] <= values[i + 1]) continue
    const left = Math.max(0, i - gap)
    const right = Math.min(values.length - 1, i + gap)
    let leftMin = values[i]
    let rightMin = values[i]
    for (let j = left; j < i; j++) leftMin = Math.min(leftMin, values[j])
    for (let j = i + 1; j <= right; j++) rightMin = Math.min(rightMin, values[j])
    if (values[i] - Math.max(leftMin, rightMin) < prominence) continue
    const last = peaks[peaks.length - 1]
    if (last && i - last.index < gap) {
      if (values[i] > last.value) peaks[peaks.length - 1] = { index: i, value: values[i] }
    } else {
      peaks.push({ index: i, value: values[i] })
    }
  }
  return peaks
}

export function mean(values: number[]): number {
  if (!values.length) return 0
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const mid = mean(values)
  let sum = 0
  for (const value of values) sum += (value - mid) * (value - mid)
  return Math.sqrt(sum / (values.length - 1))
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
    const x = a[i] - ma
    const y = b[i] - mb
    num += x * y
    da += x * x
    db += y * y
  }
  if (da === 0 || db === 0) return 0
  return num / Math.sqrt(da * db)
}

/** Positive lag means series b trails series a. */
export function bestLag(a: number[], b: number[], maxLag: number): { lag: number; r: number } | null {
  if (a.length < 12) return null
  let best: { lag: number; r: number } | null = null
  for (let lag = 0; lag <= maxLag; lag++) {
    const r = correlation(a.slice(0, a.length - lag), b.slice(lag))
    if (!best || r > best.r) best = { lag, r }
  }
  return best && best.r > 0.25 ? best : null
}

export type RunSummary = {
  headline: string
  notes: string[]
  cycles: number
  lagSeconds: number | null
  tone: 'balanced' | 'wave' | 'small' | 'faded' | 'early'
}

export function summarise(samples: Sample[], fruitCapacity: number, blueAlive: number, redAlive: number): RunSummary {
  if (samples.length < 12) {
    return {
      headline: 'The garden is still warming up.',
      notes: ['Give it a moment. The lines are the real counts.'],
      cycles: 0,
      lagSeconds: null,
      tone: 'early',
    }
  }

  const span = samples[samples.length - 1].t - samples[0].t
  const dt = span / Math.max(1, samples.length - 1)
  const win = Math.max(3, Math.round(samples.length / 40))
  const blue = samples.map((sample) => sample.blue)
  const red = samples.map((sample) => sample.red)
  const fruit = samples.map((sample) => sample.fruit)
  const blueS = movingAverage(blue, win)
  const redS = movingAverage(red, win)
  const blueMean = mean(blue)
  const redMean = mean(red)
  const fruitMean = mean(fruit)
  const fruitFill = fruitCapacity > 0 ? fruitMean / fruitCapacity : 0
  const bluePeaks = findPeaks(blueS, Math.max(2.5, blueMean * 0.28))
  const redPeaks = findPeaks(redS, Math.max(1.8, redMean * 0.3))
  const lag = bestLag(blueS, redS, Math.floor(samples.length / 3))
  const lagSeconds = lag && lag.lag > 0 ? lag.lag * dt : null
  const notes: string[] = []
  let headline: string
  let tone: RunSummary['tone']

  if (blueAlive === 0 && redAlive === 0) {
    headline = 'One group faded and the world settled into a simpler state.'
    tone = 'faded'
    notes.push('Both groups are gone. The trees keep the fruit to themselves.')
  } else if (blueAlive === 0) {
    headline = 'One group faded and the world settled into a simpler state.'
    tone = 'faded'
    notes.push('Blue blobs dipped first. With nobody left to meet, red energy runs out.')
  } else if (redAlive === 0) {
    headline = 'One group faded and the world settled into a simpler state.'
    tone = 'faded'
    notes.push('Red blobs faded. Blue blobs and the trees are what remain.')
  } else if (bluePeaks.length >= 2 && lagSeconds !== null) {
    headline = 'Blue blobs grew first, then red blobs followed.'
    tone = 'wave'
    notes.push(`Red trailed blue by about ${Math.round(lagSeconds)}s, across ${bluePeaks.length} blue waves.`)
  } else if (fruitFill < 0.35 && blueMean + redMean < 28) {
    headline = 'Low fruit kept the garden small.'
    tone = 'small'
    notes.push(`Fruit sat near ${Math.round(fruitFill * 100)}% of what the trees can hold.`)
  } else if (bluePeaks.length >= 2 || redPeaks.length >= 2) {
    headline = 'The garden stayed balanced.'
    tone = 'balanced'
    notes.push(`${bluePeaks.length} blue waves and ${redPeaks.length} red waves so far.`)
  } else {
    headline = 'The garden stayed balanced.'
    tone = 'balanced'
    notes.push('Both groups are still in the dish, finding a level.')
  }

  notes.push(`Peaks so far: ${Math.round(Math.max(...blue))} blue, ${Math.round(Math.max(...red))} red, ${Math.round(Math.max(...fruit))} fruit.`)
  return { headline, notes, cycles: bluePeaks.length, lagSeconds, tone }
}
