import type { Sample, World } from './world'
import { correlationLag, findPeaks, percentile, smooth } from './signal'

export type Mood =
  | 'warming'
  | 'early'
  | 'balanced'
  | 'waves'
  | 'small'
  | 'blue-only'
  | 'red-fading'
  | 'empty'
  | 'no-red'

export interface Summary {
  mood: Mood
  headline: string
  lines: string[]
  chips: { label: string; value: string }[]
}

export function fmtTime(t: number): string {
  const s = Math.max(0, Math.round(t))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function argmax(a: number[]): number {
  let bi = 0
  for (let i = 1; i < a.length; i++) if (a[i] > a[bi]) bi = i
  return bi
}

function mean(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}

function lastAlive(h: Sample[]): number {
  for (let i = h.length - 1; i >= 0; i--) if (h[i].blue + h[i].red > 0) return h[i].t
  return 0
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function summarize(world: World): Summary {
  const h: Sample[] = world.history
  const p = world.params
  const t = world.t
  const st = world.stats

  if (h.length < 10 || t < 45) {
    return {
      mood: 'warming',
      headline: 'The garden is just waking up.',
      lines: ['Press play and give it a few minutes of garden time. The story is written from what actually happens.'],
      chips: [
        { label: 'Garden time', value: fmtTime(t) },
        { label: 'Fruit eaten', value: String(st.fruitEaten) },
        { label: 'Contacts', value: String(st.contacts) },
      ],
    }
  }

  const dt = (h[h.length - 1].t - h[0].t) / (h.length - 1)
  const blue = h.map((s) => s.blue)
  const red = h.map((s) => s.red)
  const fruit = h.map((s) => s.fruit)
  const sw = Math.max(3, Math.round(15 / dt) | 1)
  const bs = smooth(blue, sw)
  const rs = smooth(red, sw)

  const maxBlue = Math.max(...blue)
  const maxRed = Math.max(...red)
  const from = Math.max(0, Math.floor(h.length * 0.5))
  const lateB = bs.slice(from)
  const lateR = rs.slice(from)
  const meanBlue = mean(lateB)
  const meanRed = mean(lateR)
  const meanFruit = mean(fruit.slice(from))
  const fruitCap = Math.max(1, p.trees * p.fruitLimit)
  const fruitFill = meanFruit / fruitCap

  const bPeaks = findPeaks(bs, Math.max(4, maxBlue * 0.22))
  const rPeaks = findPeaks(rs, Math.max(2, maxRed * 0.22))
  const bi = bPeaks.length ? bPeaks[0].index : argmax(bs)
  const ri = rPeaks.length ? rPeaks[0].index : argmax(rs)

  const maxLag = Math.max(2, Math.round(Math.min(300, t / 2) / dt))
  const lag = correlationLag(bs, rs, maxLag)
  const lagSec = Math.round(lag.lag * dt)
  const laggy = lag.lag > 0 && lag.corr > 0.2

  const blueAlive = world.blueCount > 0
  const redAlive = world.redCount > 0
  const hadRed = p.startRed > 0 || st.redBorn > 0
  const lines: string[] = []

  const chips: Summary['chips'] = [
    { label: 'Garden time', value: fmtTime(t) },
    { label: 'Blue peaks', value: String(bPeaks.length) },
    { label: 'Red peaks', value: String(rPeaks.length) },
    { label: 'Fruit eaten', value: String(st.fruitEaten) },
    { label: 'Contacts', value: String(st.contacts) },
    { label: 'Born b / r', value: `${st.blueBorn} / ${st.redBorn}` },
  ]

  let mood: Mood
  let headline: string

  const swing = (percentile(lateB, 0.9) - percentile(lateB, 0.1)) / Math.max(1, meanBlue)

  if (!blueAlive && !redAlive) {
    mood = 'empty'
    headline = 'Both groups faded. Only the trees remain.'
    lines.push(`Blue reached ${maxBlue} and red reached ${maxRed} before the last blob ran out of energy at ${fmtTime(lastAlive(h))}.`)
    lines.push('Red faded right after blue: with no blue to draw energy from, it had nothing left to live on.')
  } else if (!blueAlive) {
    mood = 'red-fading'
    headline = 'Blue faded, so red is running out of energy.'
    lines.push(`Blue peaked at ${maxBlue} around ${fmtTime(h[argmax(blue)].t)} and disappeared. ${plural(world.redCount, 'red blob')} left with nothing to draw energy from.`)
    lines.push('Fruit is piling up on the trees because nobody is eating it.')
  } else if (!hadRed) {
    mood = 'no-red'
    headline = 'No red blobs here, so blue only answers to fruit.'
    lines.push(`Blue settles near ${Math.round(meanBlue)} with about ${Math.round(meanFruit)} fruit left on the trees.`)
  } else if (!redAlive) {
    mood = 'blue-only'
    headline = 'One group faded and the world settled into a simpler state.'
    lines.push(`Red peaked at ${maxRed} around ${fmtTime(h[argmax(red)].t)}, then faded once blue became too scarce to feed it.`)
    lines.push(`Blue now grows against the fruit supply alone, near ${Math.round(meanBlue)} blobs with ${Math.round(meanFruit)} fruit on the trees.`)
  } else if (t >= 150 && (meanBlue + meanRed) / Math.max(1, p.trees) < 1.6 && fruitFill < 0.5) {
    mood = 'small'
    headline = 'Low fruit kept the garden small.'
    lines.push(
      `Blue stays near ${Math.round(meanBlue)} and red near ${Math.round(meanRed)}. Trees hold about ${Math.round(meanFruit)} of ${fruitCap} possible fruit, so there is little spare energy to grow with.`,
    )
  } else if (bPeaks.length >= 2 && rPeaks.length >= 2) {
    mood = 'waves'
    headline = 'Waves are rolling: blue surges, then red follows.'
    lines.push(
      `Blue has crested ${bPeaks.length} times and red ${rPeaks.length} times${laggy ? `, with red trailing blue by roughly ${lagSec} s` : ''}.`,
    )
  } else if (t >= 300 && swing < 0.6) {
    mood = 'balanced'
    headline = 'The garden stayed balanced.'
    lines.push(`Blue hovers near ${Math.round(meanBlue)} and red near ${Math.round(meanRed)}. Energy from fruit and contacts roughly matches what is spent.`)
  } else {
    mood = 'early'
    headline = t < 200 ? 'The first wave is still playing out.' : 'Big swings, and no steady pattern yet.'
    lines.push(`Blue has ranged from ${Math.round(Math.min(...bs))} to ${Math.round(Math.max(...bs))} while red drifts between ${Math.round(Math.min(...rs))} and ${Math.round(Math.max(...rs))}.`)
  }

  if (blueAlive && redAlive && bPeaks.length + rPeaks.length > 0) {
    if (bi < ri) {
      lines.push(
        `Blue grew first, cresting at ${Math.round(bs[bi])} around ${fmtTime(h[bi].t)}. Red followed and crested at ${Math.round(rs[ri])} around ${fmtTime(h[ri].t)}.`,
      )
    } else {
      lines.push(`Red crested at ${Math.round(rs[ri])} around ${fmtTime(h[ri].t)} and blue crested at ${Math.round(bs[bi])} around ${fmtTime(h[bi].t)}, so they started out close together.`)
    }
    const after = Math.min(h.length - 1, bi + Math.round(60 / dt))
    let low = after
    for (let i = bi; i < h.length; i++) if (bs[i] < bs[low]) low = i
    if (low > bi && bs[bi] - bs[low] > 0.35 * bs[bi]) {
      lines.push(
        `After that crest blue fell to ${Math.round(bs[low])} around ${fmtTime(h[low].t)} while red held ${Math.round(rs[low])}. Fruit stood at ${fruit[bi]} at the crest and ${fruit[low]} at the low point.`,
      )
    }
  }

  if (st.contacts > 0) {
    lines.push(`Red made ${st.contacts} contacts and moved ${Math.round(st.energyDrained)} energy from blue to red. Blue ate ${st.fruitEaten} fruit.`)
  }

  const now = h[h.length - 1]
  const first = h.find((s) => s.blue > 0)
  if (first && blueAlive && p.mutation > 0 && t > 250) {
    const ds = (now.blueSpeed - first.blueSpeed) / Math.max(0.1, first.blueSpeed)
    const dv = (now.blueVision - first.blueVision) / Math.max(0.1, first.blueVision)
    if (Math.abs(ds) > 0.08 || Math.abs(dv) > 0.08) {
      lines.push(`Blue traits are drifting: average speed ${first.blueSpeed.toFixed(2)} to ${now.blueSpeed.toFixed(2)}, vision ${first.blueVision.toFixed(1)} to ${now.blueVision.toFixed(1)}.`)
    }
  }

  return { mood, headline, lines: lines.slice(0, 5), chips }
}
