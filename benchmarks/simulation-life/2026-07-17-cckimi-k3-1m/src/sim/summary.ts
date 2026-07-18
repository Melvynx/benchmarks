import type { HistorySample, World } from './world'

export interface Summary {
  headline: string
  facts: string[]
  bluePeaks: number
  redPeaks: number
  meanLagTicks: number | null
  extinct: 'blue' | 'red' | 'both' | null
  fruitAvgFrac: number
}

/** Find local maxima with a minimum prominence, in tick order. */
function findPeaks(values: number[], minProminence: number, minGap: number): number[] {
  const peaks: number[] = []
  for (let i = 2; i < values.length - 2; i++) {
    const v = values[i]
    if (v <= values[i - 1] || v < values[i + 1]) continue
    const leftMin = Math.min(...values.slice(Math.max(0, i - minGap), i + 1))
    const rightMin = Math.min(...values.slice(i, Math.min(values.length, i + minGap + 1)))
    const prominence = v - Math.max(leftMin, rightMin)
    if (prominence >= minProminence) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minGap) peaks.push(i)
    }
  }
  return peaks
}

function cv(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

export function summarize(world: World): Summary {
  const h: HistorySample[] = world.history
  const facts: string[] = []
  const fruitCapacity = Math.max(1, world.trees.length * world.params.fruitLimit)

  const lastBlue = world.blues.length
  const lastRed = world.reds.length
  const extinct: Summary['extinct'] =
    lastBlue === 0 && lastRed === 0 ? 'both' : lastBlue === 0 ? 'blue' : lastRed === 0 ? 'red' : null

  if (h.length < 30) {
    return {
      headline: 'The story is just beginning…',
      facts: ['Let the garden run to see waves emerge.'],
      bluePeaks: 0,
      redPeaks: 0,
      meanLagTicks: null,
      extinct,
      fruitAvgFrac: h.length ? h[h.length - 1].fruit / fruitCapacity : 0,
    }
  }

  const blues = h.map((s) => s.blue)
  const reds = h.map((s) => s.red)
  const fruits = h.map((s) => s.fruit)
  const bluePeakIdx = findPeaks(blues, Math.max(3, Math.max(...blues) * 0.2), 60)
  const redPeakIdx = findPeaks(reds, Math.max(2, Math.max(...reds) * 0.2), 60)

  // mean lag: for each red peak, distance to the closest earlier blue peak
  let meanLagTicks: number | null = null
  const lags: number[] = []
  for (const ri of redPeakIdx) {
    const earlier = bluePeakIdx.filter((bi) => bi < ri)
    if (earlier.length > 0) lags.push((ri - earlier[earlier.length - 1]) * (h[1].t - h[0].t))
  }
  if (lags.length > 0) meanLagTicks = Math.round(lags.reduce((a, b) => a + b, 0) / lags.length)

  const fruitAvgFrac = fruits.reduce((a, b) => a + b, 0) / fruits.length / fruitCapacity
  const blueCv = cv(blues.slice(Math.floor(blues.length / 2)))
  const redCv = cv(reds.slice(Math.floor(reds.length / 2)))

  // headline
  let headline: string
  if (extinct === 'both') {
    headline = 'The garden went quiet — both groups faded away.'
  } else if (extinct === 'red') {
    headline = 'Red blobs faded; the garden settled into a simpler plant-and-blue balance.'
  } else if (extinct === 'blue') {
    headline = 'Blue blobs were hunted out — the reds soon followed.'
  } else if (bluePeakIdx.length >= 2 && redPeakIdx.length >= 2) {
    headline = 'Blue and red groups are rising and falling in rolling waves.'
  } else if (blueCv < 0.18 && redCv < 0.18 && h.length > 200) {
    headline = 'The garden stayed balanced.'
  } else if (bluePeakIdx.length >= 1 && redPeakIdx.length === 0) {
    headline = 'Blue blobs grew first; the reds have not caught up yet.'
  } else {
    headline = 'The garden is still finding its rhythm.'
  }

  // facts
  if (bluePeakIdx.length >= 1 && redPeakIdx.length >= 1 && bluePeakIdx[0] < redPeakIdx[0]) {
    facts.push(
      meanLagTicks !== null
        ? `Blue blobs grew first, then red blobs followed — red peaks lag blue peaks by ~${Math.round(meanLagTicks / 30)}s of sim time.`
        : 'Blue blobs grew first, then red blobs followed.',
    )
  }
  if (bluePeakIdx.length >= 2 && redPeakIdx.length >= 2) {
    facts.push(`Counted ${bluePeakIdx.length} blue waves and ${redPeakIdx.length} red waves so far.`)
  }
  if (fruitAvgFrac < 0.3) {
    facts.push('Low fruit kept the garden small — trees stayed mostly bare.')
  } else if (fruitAvgFrac > 0.75 && extinct === null) {
    facts.push('Fruit stayed plentiful, so blue blobs had room to grow.')
  }
  if (extinct === 'red') {
    facts.push('With blue blobs scarce at times, red blobs ran low on energy and faded.')
  } else if (extinct === 'blue') {
    facts.push('Too many red blobs hunted the blues down; one group fading pulled the other with it.')
  } else if (extinct === 'both') {
    facts.push('One group faded first and the other starved after — the world settled into a simpler state.')
  }
  if (facts.length === 0) {
    facts.push('Group sizes leveled out instead of growing forever — energy limits did their job.')
  }

  return {
    headline,
    facts: facts.slice(0, 3),
    bluePeaks: bluePeakIdx.length,
    redPeaks: redPeakIdx.length,
    meanLagTicks,
    extinct,
    fruitAvgFrac,
  }
}

export function formatSimTime(ticks: number): string {
  const seconds = Math.floor(ticks / 30)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
