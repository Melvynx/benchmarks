import { GARDEN } from '../theme'
import { DT } from '../sim/world'
import type { Blob, Effect, Tree, World } from '../sim/types'
import { project, unproject, type Camera, type Projected } from './camera'

type DrawItem =
  | { kind: 'tree'; tree: Tree; p: Projected }
  | { kind: 'blob'; blob: Blob; p: Projected; x: number; y: number }
  | { kind: 'effect'; effect: Effect; p: Projected }

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function fitCamera(cam: Camera, world: World, width: number, height: number) {
  cam.cx = width / 2
  cam.cy = height * 0.52
  const pad = 28
  const usable = Math.min(width, height * 1.35) - pad * 2
  cam.scale = usable / (world.radius * 2.15)
}

export function pickBlob(cam: Camera, world: World, sx: number, sy: number, leftover: number): Blob | null {
  const hit = unproject(cam, sx, sy)
  let best: Blob | null = null
  let bestD = 22
  for (const b of world.blobs) {
    const x = b.x + b.vx * leftover * DT
    const y = b.y + b.vy * leftover * DT
    const d = Math.hypot(x - hit.x, y - hit.y)
    if (d < bestD) {
      bestD = d
      best = b
    }
  }
  return best
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  selectedId: number | null,
  leftover: number,
  now: number,
) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  drawDish(ctx, world, cam)

  const items: DrawItem[] = []
  for (const tree of world.trees) {
    items.push({ kind: 'tree', tree, p: project(cam, tree.x, tree.y, 0) })
  }
  for (const blob of world.blobs) {
    const x = blob.x + blob.vx * leftover * DT
    const y = blob.y + blob.vy * leftover * DT
    items.push({ kind: 'blob', blob, p: project(cam, x, y, 0), x, y })
  }
  for (const effect of world.effects) {
    items.push({ kind: 'effect', effect, p: project(cam, effect.x, effect.y, effect.z) })
  }
  items.sort((a, b) => a.p.depth - b.p.depth)

  for (const item of items) {
    if (item.kind === 'tree') drawTree(ctx, cam, item.tree, world.t)
    else if (item.kind === 'blob') drawBlob(ctx, cam, item.blob, item.x, item.y, selectedId === item.blob.id, now)
    else drawEffect(ctx, item.effect, item.p)
  }
}

function drawDish(ctx: CanvasRenderingContext2D, world: World, cam: Camera) {
  const r = world.radius
  const rim = r + 18
  const wall = 16
  const top = project(cam, 0, 0, 0)
  const rx = rim * cam.scale
  const ry = rim * cam.scale * cam.tilt
  const innerX = r * cam.scale
  const innerY = r * cam.scale * cam.tilt

  ctx.save()
  ctx.fillStyle = 'rgba(8, 6, 18, 0.45)'
  ctx.beginPath()
  ctx.ellipse(top.sx + 10, top.sy + wall + 18, rx * 1.02, ry * 0.95, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = GARDEN.dishSide
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy + wall, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = GARDEN.dishRim
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  const rimGrad = ctx.createLinearGradient(top.sx - rx, top.sy - ry, top.sx + rx, top.sy + ry)
  rimGrad.addColorStop(0, GARDEN.dishRimLight)
  rimGrad.addColorStop(0.45, GARDEN.dishRim)
  rimGrad.addColorStop(1, GARDEN.dishSide)
  ctx.fillStyle = rimGrad
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = GARDEN.dishInner
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy, innerX + 6 * cam.scale, innerY + 6 * cam.scale * cam.tilt, 0, 0, Math.PI * 2)
  ctx.fill()

  const soil = ctx.createRadialGradient(top.sx - innerX * 0.2, top.sy - innerY * 0.3, 8, top.sx, top.sy, innerX)
  soil.addColorStop(0, GARDEN.soilLight)
  soil.addColorStop(0.55, GARDEN.moss)
  soil.addColorStop(1, GARDEN.mossDark)
  ctx.fillStyle = soil
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy, innerX, innerY, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy, innerX, innerY, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 28; i++) {
    const a = (i * 2.39996) % (Math.PI * 2)
    const rad = (0.15 + ((i * 17) % 80) / 100) * r
    const px = Math.cos(a) * rad
    const py = Math.sin(a) * rad
    const p = project(cam, px, py, 0)
    ctx.fillStyle = i % 2 === 0 ? GARDEN.mossLight : GARDEN.mossDark
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, 18 * cam.scale, 10 * cam.scale * cam.tilt, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.strokeStyle = GARDEN.dishRimLight
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.ellipse(top.sx, top.sy, rx - 3, ry - 3, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawTree(ctx: CanvasRenderingContext2D, cam: Camera, tree: Tree, t: number) {
  const lean = Math.sin(t * 0.7 + tree.leanSeed) * 0.08
  const base = project(cam, tree.x, tree.y, 0)
  const s = cam.scale * tree.scale

  ctx.save()
  ctx.fillStyle = GARDEN.shadow
  ctx.beginPath()
  ctx.ellipse(base.sx + 4, base.sy + 4, 16 * s, 7 * s * cam.tilt, 0, 0, Math.PI * 2)
  ctx.fill()

  const top = project(cam, tree.x + lean * 6, tree.y, 28 * tree.scale)
  ctx.strokeStyle = GARDEN.trunkDark
  ctx.lineWidth = Math.max(2.4, 4.2 * s)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(base.sx, base.sy)
  ctx.lineTo(top.sx, top.sy)
  ctx.stroke()
  ctx.strokeStyle = GARDEN.trunk
  ctx.lineWidth = Math.max(1.6, 2.8 * s)
  ctx.beginPath()
  ctx.moveTo(base.sx - 1, base.sy)
  ctx.lineTo(top.sx - 1, top.sy)
  ctx.stroke()

  const canopy = project(cam, tree.x + lean * 8, tree.y, 32 * tree.scale)
  const crx = 18 * s
  const cry = 12 * s
  ctx.fillStyle = GARDEN.leafDark
  ctx.beginPath()
  ctx.ellipse(canopy.sx + 2, canopy.sy + 3, crx * 1.05, cry * 1.05, lean, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = GARDEN.leaf
  ctx.beginPath()
  ctx.ellipse(canopy.sx, canopy.sy, crx, cry, lean, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = GARDEN.leafLight
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.ellipse(canopy.sx - crx * 0.28, canopy.sy - cry * 0.28, crx * 0.45, cry * 0.38, lean, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  for (let i = 0; i < tree.slots.length; i++) {
    const slot = tree.slots[i]
    if (slot.pop <= 0.04) continue
    const fp = project(cam, tree.x + slot.x + lean * 4, tree.y + slot.y, slot.z)
    const fr = slot.r * cam.scale * slot.pop
    ctx.fillStyle = GARDEN.shadow
    ctx.globalAlpha = 0.25 * slot.pop
    ctx.beginPath()
    ctx.ellipse(fp.sx + 1, fp.sy + 2, fr * 0.9, fr * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = slot.pop
    const g = ctx.createRadialGradient(fp.sx - fr * 0.3, fp.sy - fr * 0.35, 0.4, fp.sx, fp.sy, fr)
    g.addColorStop(0, GARDEN.fruitLight)
    g.addColorStop(0.55, GARDEN.fruit)
    g.addColorStop(1, GARDEN.fruitDark)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(fp.sx, fp.sy, fr, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  blob: Blob,
  x: number,
  y: number,
  selected: boolean,
  now: number,
) {
  const bounce = reducedMotion ? 0 : Math.abs(Math.sin(now * 0.007 + blob.phase)) * (2.2 + Math.hypot(blob.vx, blob.vy) * 0.04)
  const z = 7 + bounce * (1 - blob.squash * 0.6)
  const p = project(cam, x, y, z)
  const s = cam.scale
  const squash = 1 - blob.squash * 0.28
  const stretch = 1 + blob.squash * 0.18
  const heading = Math.atan2(blob.vy, blob.vx)
  const lean = Math.sin(heading - cam.yaw) * 0.18 * Math.min(1, Math.hypot(blob.vx, blob.vy) / 20)

  ctx.save()
  ctx.fillStyle = GARDEN.shadow
  ctx.beginPath()
  ctx.ellipse(p.sx + 2, project(cam, x, y, 0).sy + 3, 8.5 * s, 3.6 * s * cam.tilt, 0, 0, Math.PI * 2)
  ctx.fill()

  if (selected) {
    ctx.strokeStyle = GARDEN.ink
    ctx.globalAlpha = 0.85
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy + 2, 12 * s, 8 * s, lean, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  const body = blob.kind === 'blue' ? GARDEN.blue : GARDEN.red
  const dark = blob.kind === 'blue' ? GARDEN.blueDark : GARDEN.redDark
  const light = blob.kind === 'blue' ? GARDEN.blueLight : GARDEN.redLight
  const rx = 9.2 * s * stretch
  const ry = 7.2 * s * squash

  if (blob.glow > 0) {
    ctx.fillStyle = body
    ctx.globalAlpha = blob.glow * 0.35
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, rx * 1.55, ry * 1.55, lean, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  const grad = ctx.createRadialGradient(p.sx - rx * 0.35, p.sy - ry * 0.45, 1, p.sx, p.sy + ry * 0.2, rx * 1.15)
  grad.addColorStop(0, light)
  grad.addColorStop(0.45, body)
  grad.addColorStop(1, dark)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(p.sx, p.sy, rx, ry, lean, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(p.sx - rx * 0.28, p.sy - ry * 0.38, rx * 0.28, ry * 0.18, lean, 0, Math.PI * 2)
  ctx.fill()

  const blinking = blob.blinkFor > 0 || (!reducedMotion && Math.sin(now * 0.002 + blob.phase * 3) > 0.992)
  const eyeY = p.sy - ry * 0.08
  const eyeSpread = rx * 0.32
  ctx.fillStyle = '#1a1730'
  if (blinking) {
    ctx.lineWidth = Math.max(1, 1.2 * s)
    ctx.strokeStyle = '#1a1730'
    ctx.beginPath()
    ctx.moveTo(p.sx - eyeSpread - 2 * s, eyeY)
    ctx.lineTo(p.sx - eyeSpread + 2 * s, eyeY)
    ctx.moveTo(p.sx + eyeSpread - 2 * s, eyeY)
    ctx.lineTo(p.sx + eyeSpread + 2 * s, eyeY)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.ellipse(p.sx - eyeSpread, eyeY, 1.35 * s, 1.7 * s, 0, 0, Math.PI * 2)
    ctx.ellipse(p.sx + eyeSpread, eyeY, 1.35 * s, 1.7 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.arc(p.sx - eyeSpread - 0.3 * s, eyeY - 0.5 * s, 0.45 * s, 0, Math.PI * 2)
    ctx.arc(p.sx + eyeSpread - 0.3 * s, eyeY - 0.5 * s, 0.45 * s, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = '#1a1730'
  ctx.globalAlpha = 0.55
  ctx.lineWidth = Math.max(1, 1.1 * s)
  ctx.beginPath()
  const chew = blob.action === 'eat' ? Math.sin(now * 0.02) * 1.4 * s : 0
  ctx.arc(p.sx, p.sy + ry * 0.28 + chew * 0.15, 2.4 * s + chew, 0.15, Math.PI - 0.15)
  ctx.stroke()
  ctx.globalAlpha = 1

  if (blob.action === 'eat' || blob.action === 'contact') {
    ctx.fillStyle = blob.action === 'eat' ? GARDEN.fruitLight : GARDEN.ink
    ctx.globalAlpha = 0.7
    for (let i = 0; i < 3; i++) {
      const a = now * 0.004 + i * 2.1 + blob.phase
      ctx.beginPath()
      ctx.arc(p.sx + Math.cos(a) * rx * 1.15, p.sy - ry * 0.9 + Math.sin(a * 1.3) * 4, 1.4 * s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function drawEffect(ctx: CanvasRenderingContext2D, effect: Effect, p: Projected) {
  const u = 1 - effect.life / effect.maxLife
  const alpha = 1 - u
  ctx.save()
  ctx.globalAlpha = alpha
  if (effect.kind === 'death') {
    ctx.fillStyle = effect.color === 'blue' ? GARDEN.blueLight : GARDEN.redLight
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, 6 + u * 10, 0, Math.PI * 2)
    ctx.fill()
  } else if (effect.kind === 'birth') {
    ctx.strokeStyle = effect.color === 'blue' ? GARDEN.blueLight : GARDEN.redLight
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, 4 + u * 12, 0, Math.PI * 2)
    ctx.stroke()
  } else if (effect.kind === 'contact') {
    ctx.fillStyle = GARDEN.redLight
    for (let i = 0; i < 5; i++) {
      const a = effect.seed * 0.7 + i * 1.256
      ctx.beginPath()
      ctx.arc(p.sx + Math.cos(a) * (4 + u * 10), p.sy + Math.sin(a) * (4 + u * 8), 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = GARDEN.fruitLight
    ctx.beginPath()
    ctx.arc(p.sx, p.sy - u * 8, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
