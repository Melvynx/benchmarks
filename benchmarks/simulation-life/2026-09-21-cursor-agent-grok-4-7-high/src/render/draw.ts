import { actionLabel, blobName } from '../sim/labels'
import type { Blob, Tree, World } from '../sim/types'
import { makeCamera, project, type Camera } from './camera'

const BLUES = ['#3c92f5', '#2f78e8', '#59b0ff', '#2468d8']
const REDS = ['#ff5c68', '#ef3d52', '#ff7d62', '#e12f48']

export function drawGarden(
  ctx: CanvasRenderingContext2D,
  world: World,
  yaw: number,
  width: number,
  height: number,
  selectedId: number | null,
) {
  const cam = makeCamera(width, height, world.radius, yaw)
  ctx.clearRect(0, 0, width, height)
  drawDish(ctx, cam)
  ctx.save()
  clipDish(ctx, cam)
  drawDecor(ctx, world, cam)
  const drawables: { depth: number; paint: () => void }[] = []
  for (const tree of world.trees) {
    const sway = Math.sin(world.t * 0.8 + tree.leanSeed) * 5
    const base = project(tree.x, tree.y, 0, cam)
    drawables.push({
      depth: base.depth,
      paint: () => drawTree(ctx, tree, sway, cam),
    })
  }
  for (const blob of world.blobs) {
    const ground = project(blob.x, blob.y, 0, cam)
    drawables.push({
      depth: ground.depth + 0.5,
      paint: () => drawBlob(ctx, world, blob, cam, blob.id === selectedId),
    })
  }
  for (const spark of world.sparks) {
    const point = project(spark.x, spark.y, spark.z + (1 - spark.life / spark.max) * 16, cam)
    drawables.push({
      depth: point.depth + 1,
      paint: () => drawSpark(ctx, spark.tint, point.sx, point.sy, spark.life / spark.max, cam.scale),
    })
  }
  drawables.sort((a, b) => a.depth - b.depth)
  for (const item of drawables) item.paint()
  ctx.restore()
  drawFrontRim(ctx, cam)
}

function drawDish(ctx: CanvasRenderingContext2D, cam: Camera) {
  const rx = cam.radius * cam.scale
  const ry = cam.radius * cam.tilt * cam.scale
  ctx.save()
  ctx.fillStyle = 'rgba(86, 58, 32, 0.18)'
  ctx.beginPath()
  ctx.ellipse(cam.cx + 10, cam.cy + ry * 0.18 + 16, rx * 1.04, ry * 1.02, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#efe4d4'
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy + 12, rx + 16, ry + 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e4d3bc'
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy + 18, rx + 16, ry + 10, 0, 0.05 * Math.PI, 0.95 * Math.PI)
  ctx.fill()
  const soil = ctx.createRadialGradient(cam.cx - rx * 0.1, cam.cy - ry * 0.2, rx * 0.1, cam.cx, cam.cy, rx)
  soil.addColorStop(0, '#b7d86a')
  soil.addColorStop(0.55, '#67a84a')
  soil.addColorStop(1, '#2f6a38')
  ctx.fillStyle = soil
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(24, 58, 28, 0.28)'
  ctx.lineWidth = Math.max(6, 10 * cam.scale)
  ctx.stroke()
  ctx.restore()
}

function clipDish(ctx: CanvasRenderingContext2D, cam: Camera) {
  const rx = cam.radius * cam.scale
  const ry = cam.radius * cam.tilt * cam.scale
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy, rx - 1, ry - 1, 0, 0, Math.PI * 2)
  ctx.clip()
}

function drawFrontRim(ctx: CanvasRenderingContext2D, cam: Camera) {
  const rx = cam.radius * cam.scale
  const ry = cam.radius * cam.tilt * cam.scale
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 250, 242, 0.85)'
  ctx.lineWidth = Math.max(4, 7 * cam.scale)
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy, rx + 8, ry + 7, 0, 0.12 * Math.PI, 0.88 * Math.PI)
  ctx.stroke()
  ctx.restore()
}

function drawDecor(ctx: CanvasRenderingContext2D, world: World, cam: Camera) {
  for (const decor of world.decor) {
    const p = project(decor.x, decor.y, 0, cam)
    ctx.save()
    ctx.translate(p.sx, p.sy)
    ctx.rotate(decor.rot)
    const s = decor.scale * cam.scale
    if (decor.kind === 'tuft') {
      ctx.strokeStyle = decor.tint > 0.5 ? '#2f7a34' : '#4e9a40'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-3 * s, -7 * s)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -9 * s)
      ctx.moveTo(0, 0)
      ctx.lineTo(3.5 * s, -6 * s)
      ctx.stroke()
    } else if (decor.kind === 'pebble') {
      ctx.fillStyle = decor.tint > 0.5 ? '#d7c7a4' : '#c4b08a'
      ctx.beginPath()
      ctx.ellipse(0, 0, 3.2 * s, 2.2 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (decor.kind === 'moss') {
      ctx.fillStyle = 'rgba(48, 110, 52, 0.45)'
      ctx.beginPath()
      ctx.ellipse(0, 0, 10 * s, 5 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = decor.tint > 0.66 ? '#f2d36b' : decor.tint > 0.33 ? '#f0a0b8' : '#f7f3ea'
      ctx.beginPath()
      ctx.arc(0, -2 * s, 2.1 * s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

function drawTree(ctx: CanvasRenderingContext2D, tree: Tree, sway: number, cam: Camera) {
  const ground = project(tree.x, tree.y, 0, cam)
  const top = project(tree.x + sway, tree.y, 34 * tree.scale, cam)
  ctx.save()
  ctx.strokeStyle = 'rgba(40, 70, 28, 0.25)'
  ctx.fillStyle = 'rgba(40, 70, 28, 0.25)'
  ctx.beginPath()
  ctx.ellipse(ground.sx, ground.sy + 2, 16 * tree.scale * cam.scale, 7 * tree.scale * cam.scale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#6b4124'
  ctx.lineWidth = Math.max(2, 4.5 * tree.scale * cam.scale)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(ground.sx, ground.sy)
  ctx.lineTo(top.sx, top.sy)
  ctx.stroke()
  const canopy = project(tree.x + sway * 0.6, tree.y, 30 * tree.scale, cam)
  const rx = 22 * tree.scale * cam.scale
  const ry = 16 * tree.scale * cam.scale
  ctx.fillStyle = '#246b34'
  ctx.beginPath()
  ctx.ellipse(canopy.sx - rx * 0.08, canopy.sy + ry * 0.15, rx, ry * 0.92, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3d9444'
  ctx.beginPath()
  ctx.ellipse(canopy.sx, canopy.sy, rx * 0.86, ry * 0.78, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(196, 230, 140, 0.55)'
  ctx.beginPath()
  ctx.ellipse(canopy.sx - rx * 0.22, canopy.sy - ry * 0.28, rx * 0.38, ry * 0.26, -0.4, 0, Math.PI * 2)
  ctx.fill()
  for (const slot of tree.slots) {
    if (slot.pop < 0.05) continue
    const berry = project(tree.x + sway * 0.35 + slot.x, tree.y + slot.y, slot.z, cam)
    const radius = slot.r * slot.pop * cam.scale
    ctx.fillStyle = '#7cb342'
    ctx.beginPath()
    ctx.arc(berry.sx, berry.sy, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#d6ef7a'
    ctx.beginPath()
    ctx.arc(berry.sx - radius * 0.25, berry.sy - radius * 0.3, radius * 0.38, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawBlob(ctx: CanvasRenderingContext2D, world: World, blob: Blob, cam: Camera, selected: boolean) {
  const speed = Math.hypot(blob.vx, blob.vy)
  const locked = blob.actionTimer > 0
  const moving = speed > 3.5 && !locked
  const hop = Math.abs(Math.sin(world.t * (moving ? 10 : 3.2) + blob.id * 0.7))
  const lift = (moving ? 7 : 2.4) * hop
  const ground = project(blob.x, blob.y, 0, cam)
  const body = project(blob.x, blob.y, lift, cam)
  const radius = Math.max(12, 18 * cam.scale)
  ctx.save()
  ctx.fillStyle = 'rgba(36, 58, 24, 0.22)'
  ctx.beginPath()
  ctx.ellipse(ground.sx, ground.sy, radius * 0.85, radius * 0.38, 0, 0, Math.PI * 2)
  ctx.fill()
  if (selected) {
    ctx.strokeStyle = 'rgba(255, 250, 240, 0.95)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(ground.sx, ground.sy, radius * 1.15, radius * 0.5, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (blob.glow > 0.02) {
    ctx.fillStyle = blob.group === 'blue' ? `rgba(120, 186, 255, ${0.35 * blob.glow})` : `rgba(255, 140, 120, ${0.4 * blob.glow})`
    ctx.beginPath()
    ctx.arc(body.sx, body.sy, radius * (1.15 + blob.glow * 0.35), 0, Math.PI * 2)
    ctx.fill()
  }
  let angle = blob.phase * 0.15
  if (speed > 1) {
    const ahead = project(blob.x + blob.vx, blob.y + blob.vy, lift, cam)
    angle = Math.atan2(ahead.sy - body.sy, ahead.sx - body.sx)
  }
  const squash = blob.squash
  const sx = (1 + squash * 0.28) * (1 + (moving ? 0.06 : 0.02) * Math.sin(world.t * 10 + blob.id))
  const sy = (1 - squash * 0.22) * (1 - (moving ? 0.07 : 0.02) * Math.sin(world.t * 10 + blob.id))
  ctx.translate(body.sx, body.sy)
  ctx.rotate(angle)
  ctx.scale(sx, sy)
  const palette = blob.group === 'blue' ? BLUES[blob.id % BLUES.length] : REDS[blob.id % REDS.length]
  const gradient = ctx.createLinearGradient(0, -radius, 0, radius)
  gradient.addColorStop(0, lighten(palette, 0.35))
  gradient.addColorStop(0.45, palette)
  gradient.addColorStop(1, lighten(palette, -0.18))
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(-radius * 0.95, radius * 0.05)
  ctx.bezierCurveTo(-radius * 1.05, -radius * 0.85, -radius * 0.1, -radius * 0.95, radius * 0.25, -radius * 0.72)
  ctx.bezierCurveTo(radius * 1.15, -radius * 0.35, radius * 1.05, radius * 0.55, radius * 0.35, radius * 0.78)
  ctx.bezierCurveTo(-radius * 0.15, radius * 1.05, -radius * 0.9, radius * 0.7, -radius * 0.95, radius * 0.05)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-radius * 0.15, -radius * 0.42, radius * 0.34, radius * 0.18, -0.4, 0, Math.PI * 2)
  ctx.fill()
  const blink = blob.blinkFor > 0 ? 0.12 : 1
  const eyeY = blob.face === 2 ? -0.08 : -0.16
  drawEye(ctx, radius * 0.08, radius * eyeY, radius * 0.2, blink)
  drawEye(ctx, radius * 0.48, radius * (eyeY - 0.02), radius * 0.18, blink)
  ctx.strokeStyle = 'rgba(40, 24, 28, 0.75)'
  ctx.lineWidth = Math.max(1, radius * 0.06)
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (blob.action === 'eat') {
    const chew = 0.5 + 0.5 * Math.sin(world.t * 16)
    ctx.ellipse(radius * 0.32, radius * 0.28, radius * 0.16, radius * (0.08 + chew * 0.12), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(90, 30, 40, 0.35)'
    ctx.fill()
  } else if (blob.action === 'rest' || blob.action === 'birth') {
    ctx.moveTo(radius * 0.18, radius * 0.28)
    ctx.quadraticCurveTo(radius * 0.34, radius * 0.46, radius * 0.52, radius * 0.26)
    ctx.stroke()
  } else if (blob.action === 'flee') {
    ctx.arc(radius * 0.34, radius * 0.3, radius * 0.08, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.moveTo(radius * 0.2, radius * 0.32)
    ctx.quadraticCurveTo(radius * 0.36, radius * 0.42, radius * 0.5, radius * 0.3)
    ctx.stroke()
  }
  ctx.fillStyle = blob.group === 'blue' ? 'rgba(255, 170, 190, 0.55)' : 'rgba(255, 210, 170, 0.5)'
  ctx.beginPath()
  ctx.ellipse(-radius * 0.05, radius * 0.22, radius * 0.1, radius * 0.07, 0, 0, Math.PI * 2)
  ctx.ellipse(radius * 0.62, radius * 0.16, radius * 0.09, radius * 0.06, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (selected) {
    const label = `${blobName(blob.id)} · ${actionLabel(blob.action)}`
    ctx.save()
    ctx.font = '600 12px ui-rounded, "Avenir Next", sans-serif'
    const pad = 6
    const w = ctx.measureText(label).width + pad * 2
    const x = body.sx - w / 2
    const y = body.sy - radius * sy - 18
    ctx.fillStyle = 'rgba(255, 250, 244, 0.94)'
    roundRect(ctx, x, y, w, 18, 8)
    ctx.fill()
    ctx.fillStyle = '#241c16'
    ctx.fillText(label, x + pad, y + 13)
    ctx.restore()
  }
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, blink: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, blink)
  ctx.fillStyle = '#fffdf8'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#241820'
  ctx.beginPath()
  ctx.arc(r * 0.25, 0, r * 0.48, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(r * 0.05, -r * 0.28, r * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSpark(ctx: CanvasRenderingContext2D, tint: 'blue' | 'red' | 'fruit', x: number, y: number, life: number, scale: number) {
  const color = tint === 'blue' ? '#8ec6ff' : tint === 'red' ? '#ffb0a4' : '#d2ee78'
  ctx.save()
  ctx.globalAlpha = Math.max(0, life)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, (2.5 + (1 - life) * 4) * Math.max(0.8, scale), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (channel: number) => {
    const next = amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount)
    return Math.round(Math.min(255, Math.max(0, next)))
  }
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
