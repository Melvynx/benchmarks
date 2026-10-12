import { useEffect, useRef, useState } from 'react'

export const INK = {
  text: '#2b2733',
  muted: '#7a7285',
  grid: '#ece5d7',
  axis: '#cfc5b3',
  surface: '#fffdf8',
  blue: '#2a78d6',
  red: '#e34948',
  fruit: '#008300',
}

export const FONT = '600 11px "Nunito Variable", system-ui, sans-serif'
export const FONT_BOLD = '800 11px "Nunito Variable", system-ui, sans-serif'

/** 1-2-2.5-5 ticks from 0 up to at least `max`. */
export function niceTicks(max: number, target = 4): number[] {
  const m = Math.max(1, max)
  const raw = m / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? 10 * mag
  const out: number[] = []
  for (let v = 0; v <= m + step * 0.999; v += step) out.push(Math.round(v * 1000) / 1000)
  return out
}

export function timeTicks(t0: number, t1: number, px: number): number[] {
  const span = Math.max(1, t1 - t0)
  const want = Math.max(2, Math.floor(px / 90))
  const steps = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]
  const step = steps.find((s) => span / s <= want) ?? 3600
  const out: number[] = []
  for (let v = Math.ceil(t0 / step) * step; v <= t1; v += step) out.push(v)
  return out
}

export const clock = (s: number) => {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

/** Canvas sized to its CSS box at device pixel ratio; redraws when deps change. */
export function useCanvas(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el || size.w < 2 || size.h < 2) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = Math.round(size.w * dpr)
    const H = Math.round(size.h * dpr)
    if (el.width !== W || el.height !== H) {
      el.width = W
      el.height = H
    }
    const g = el.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, size.w, size.h)
    draw(g, size.w, size.h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, ...deps])
  return ref
}

/** Spreads right-edge labels so they never overlap. */
export function spreadLabels<T extends { y: number }>(items: T[], gap: number, lo: number, hi: number): T[] {
  const s = items.slice().sort((a, b) => a.y - b.y)
  for (let i = 1; i < s.length; i++) if (s[i].y - s[i - 1].y < gap) s[i].y = s[i - 1].y + gap
  const over = s.length ? s[s.length - 1].y - hi : 0
  if (over > 0) for (const it of s) it.y -= over
  for (let i = 0; i < s.length; i++) s[i].y = Math.max(lo + i * gap, s[i].y)
  return s
}
