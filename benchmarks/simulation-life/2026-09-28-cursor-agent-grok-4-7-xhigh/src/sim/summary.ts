import type { Sample } from './types'

export type Story = {
  lines: string[]
  bluePeak: number
  redPeak: number
  fruitPeak: number
  lagTicks: number | null
}

export function summarize(history: Sample[]): Story {
  if (history.length === 0) {
    return { lines: ['The garden is just getting started.'], bluePeak: 0, redPeak: 0, fruitPeak: 0, lagTicks: null }
  }
  const blues = history.map((sample) => sample.blue)
  const reds = history.map((sample) => sample.red)
  const fruits = history.map((sample) => sample.fruit)
  const bluePeak = Math.max(...blues)
  const redPeak = Math.max(...reds)
  const fruitPeak = Math.max(...fruits)
  const span = history[history.length - 1].tick - history[0].tick
  if (span < 500) {
    return {
      lines: ['The garden is just getting started.'],
      bluePeak,
      redPeak,
      fruitPeak,
      lagTicks: null,
    }
  }

  const smoothBlue = smooth(blues, 8)
  const smoothRed = smooth(reds, 8)
  const bluePeaks = peakIndices(smoothBlue, 18, 2)
  const redPeaks = peakIndices(smoothRed, 18, 2)
  const stride = history.length > 1 ? Math.max(1, history[1].tick - history[0].tick) : 1
  const lag = bestLag(smoothBlue, smoothRed, Math.min(220, Math.floor(history.length / 4)))
  const blueRise = blues.findIndex((value) => value >= bluePeak * 0.72)
  const redRise = reds.findIndex((value) => value >= Math.max(2, redPeak * 0.72))
  const riseLagSamples = redRise - blueRise
  const followedByRise = blueRise >= 0 && redRise > blueRise + Math.max(8, Math.floor(history.length * 0.035))
  const lagTicks = lag.score > 0.35 && lag.lag > 2 ? lag.lag * stride : followedByRise ? riseLagSamples * stride : null

  const blueEnd = mean(blues.slice(-Math.max(6, Math.floor(blues.length * 0.08))))
  const redEnd = mean(reds.slice(-Math.max(6, Math.floor(reds.length * 0.08))))
  const fruitMean = mean(fruits)
  const popMean = mean(blues) + mean(reds)
  const blueGone = bluePeak >= 3 && blueEnd < 0.5
  const redGone = redPeak >= 2 && redEnd < 0.5
  const simpler = (blueGone || redGone) && blueEnd + redEnd < Math.max(bluePeak, redPeak) * 0.5
  const lowFruit = fruitMean < 7.5 && popMean < 14 && fruitPeak < 16
  const oscillate = bluePeaks.length >= 2 && redPeaks.length >= 2 && !simpler && blueEnd >= 1 && redEnd >= 1

  const earlyBlue = mean(blues.slice(0, Math.max(4, Math.floor(blues.length * 0.18))))
  const midBlue = mean(blues.slice(Math.floor(blues.length * 0.32), Math.floor(blues.length * 0.55)))
  const dipped =
    bluePeak >= 8 &&
    earlyBlue >= 3 &&
    midBlue < earlyBlue * 0.72 &&
    redPeak >= 3 &&
    redEnd < redPeak * 0.55

  const grewFast = bluePeak >= 48 && mean(blues) >= 26 && blueEnd >= 8 && fruitMean > 18

  const lines: string[] = []
  if (lowFruit) lines.push('Low fruit kept the garden small.')
  if (grewFast && !lowFruit) lines.push('Plenty of fruit let the blue blobs grow quickly.')
  if (simpler) lines.push('One group faded and the world settled into a simpler state.')
  else if (oscillate) lines.push('The garden stayed balanced.')
  const followed = lagTicks != null && bluePeak >= 4 && redPeak >= 3 && (redPeaks.length >= 1 || followedByRise)
  if (dipped && !oscillate) lines.push('Blue blobs dipped first and red blobs faded later.')
  else if (followed) lines.push('Blue blobs grew first, then red blobs followed.')
  if (lines.length === 0) {
    lines.push(`Blue blobs reached ${Math.round(bluePeak)} and red blobs reached ${Math.round(redPeak)}.`)
  }
  return { lines: lines.slice(0, 3), bluePeak, redPeak, fruitPeak, lagTicks }
}

function mean(values: number[]) {
  if (values.length === 0) return 0
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

function smooth(values: number[], window: number) {
  const out: number[] = []
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0
    let count = 0
    const start = Math.max(0, i - window)
    const end = Math.min(values.length - 1, i + window)
    for (let j = start; j <= end; j += 1) {
      sum += values[j]
      count += 1
    }
    out.push(sum / count)
  }
  return out
}

function peakIndices(values: number[], minDist: number, minProm: number) {
  const peaks: number[] = []
  for (let i = 2; i < values.length - 2; i += 1) {
    if (values[i] < values[i - 1] || values[i] < values[i - 2] || values[i] <= values[i + 1] || values[i] < values[i + 2]) {
      continue
    }
    const left = Math.min(...values.slice(Math.max(0, i - minDist), i))
    const right = Math.min(...values.slice(i + 1, Math.min(values.length, i + minDist)))
    if (values[i] - Math.min(left, right) < minProm) continue
    if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist) peaks.push(i)
  }
  return peaks
}

function bestLag(a: number[], b: number[], maxLag: number) {
  let best = 0
  let score = -Infinity
  const limit = Math.max(0, Math.min(maxLag, a.length - 10))
  for (let lag = 0; lag <= limit; lag += 1) {
    const value = correlation(a, b, lag)
    if (value > score) {
      score = value
      best = lag
    }
  }
  return { lag: best, score }
}

function correlation(a: number[], b: number[], lag: number) {
  const n = a.length - lag
  if (n < 8) return 0
  let ma = 0
  let mb = 0
  for (let i = 0; i < n; i += 1) {
    ma += a[i]
    mb += b[i + lag]
  }
  ma /= n
  mb /= n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i += 1) {
    const xa = a[i] - ma
    const xb = b[i + lag] - mb
    num += xa * xb
    da += xa * xa
    db += xb * xb
  }
  const den = Math.sqrt(da * db)
  return den === 0 ? 0 : num / den
}
