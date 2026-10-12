import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Sample } from '../sim/world'

export function useWidth<T extends HTMLElement>(fallback = 480): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setW(Math.max(160, Math.floor(el.clientWidth)))
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, w]
}

export function niceCeil(v: number): number {
  if (v <= 0) return 1
  const e = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / e
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return n * e
}

export function niceTimeStep(span: number, target: number): number {
  const steps = [5, 10, 15, 30, 60, 120, 180, 300, 600, 900, 1800, 3600, 7200]
  const want = span / target
  for (const s of steps) if (s >= want) return s
  return steps[steps.length - 1]
}

export function fmtClock(t: number): string {
  const s = Math.max(0, Math.round(t))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function decimate(h: Sample[], from: number, maxPoints: number): Sample[] {
  let start = 0
  if (from > 0) {
    let lo = 0
    let hi = h.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (h[mid].t < from) lo = mid + 1
      else hi = mid
    }
    start = Math.max(0, lo - 1)
  }
  const n = h.length - start
  if (n <= maxPoints) return h.slice(start)
  const stride = Math.ceil(n / maxPoints)
  const out: Sample[] = []
  for (let i = start; i < h.length; i += stride) out.push(h[i])
  const last = h[h.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export function linePath(pts: [number, number][]): string {
  if (!pts.length) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`
  return d
}

export function areaPath(pts: [number, number][], baseY: number): string {
  if (!pts.length) return ''
  return `${linePath(pts)}L${pts[pts.length - 1][0].toFixed(1)},${baseY}L${pts[0][0].toFixed(1)},${baseY}Z`
}
