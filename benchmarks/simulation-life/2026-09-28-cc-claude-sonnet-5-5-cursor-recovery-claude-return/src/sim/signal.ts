export function smooth(a: number[], w: number): number[] {
  if (w <= 1 || a.length === 0) return a.slice()
  const out = new Array<number>(a.length)
  const half = Math.floor(w / 2)
  let sum = 0
  let lo = 0
  let hi = -1
  for (let i = 0; i < a.length; i++) {
    const wantLo = Math.max(0, i - half)
    const wantHi = Math.min(a.length - 1, i + half)
    while (hi < wantHi) sum += a[++hi]
    while (lo < wantLo) sum -= a[lo++]
    out[i] = sum / (hi - lo + 1)
  }
  return out
}

export interface Peak {
  index: number
  value: number
  prominence: number
}

export function findPeaks(a: number[], minProminence: number): Peak[] {
  const peaks: Peak[] = []
  const n = a.length
  for (let i = 1; i < n - 1; i++) {
    if (!(a[i] > a[i - 1] && a[i] >= a[i + 1])) continue
    let j = i
    while (j < n - 1 && a[j + 1] === a[i]) j++
    if (j < n - 1 && a[j + 1] > a[i]) continue
    let leftMin = a[i]
    let k = i - 1
    while (k >= 0 && a[k] <= a[i]) {
      if (a[k] < leftMin) leftMin = a[k]
      k--
    }
    let rightMin = a[i]
    k = j + 1
    while (k < n && a[k] <= a[i]) {
      if (a[k] < rightMin) rightMin = a[k]
      k++
    }
    const prom = a[i] - Math.max(leftMin, rightMin)
    if (prom >= minProminence) peaks.push({ index: i, value: a[i], prominence: prom })
  }
  return peaks
}

export function correlationLag(a: number[], b: number[], maxLag: number): { lag: number; corr: number } {
  const n = Math.min(a.length, b.length)
  if (n < 8) return { lag: 0, corr: 0 }
  const ma = a.reduce((x, y) => x + y, 0) / n
  const mb = b.reduce((x, y) => x + y, 0) / n
  let best = { lag: 0, corr: -Infinity }
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let num = 0
    let da = 0
    let db = 0
    for (let i = 0; i < n; i++) {
      const j = i + lag
      if (j < 0 || j >= n) continue
      const x = a[i] - ma
      const y = b[j] - mb
      num += x * y
      da += x * x
      db += y * y
    }
    const c = da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0
    if (c > best.corr) best = { lag, corr: c }
  }
  return best
}

export function autocorr(a: number[], lag: number): number {
  const n = a.length
  if (lag >= n - 4) return 0
  const m = a.reduce((x, y) => x + y, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - m
    den += x * x
    if (i + lag < n) num += x * (a[i + lag] - m)
  }
  return den > 0 ? num / den : 0
}

export function percentile(a: number[], p: number): number {
  if (!a.length) return 0
  const s = a.slice().sort((x, y) => x - y)
  const i = Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))
  return s[i]
}

/** Strength and period of the dominant cycle, from the first autocorrelation peak after the first zero crossing. */
export function dominantCycle(a: number[], minLag: number, maxLag: number): { period: number; strength: number } {
  let crossed = false
  let best = { period: 0, strength: 0 }
  for (let lag = minLag; lag <= maxLag; lag++) {
    const c = autocorr(a, lag)
    if (!crossed) {
      if (c < 0) crossed = true
      continue
    }
    if (c > best.strength) best = { period: lag, strength: c }
  }
  return best
}
