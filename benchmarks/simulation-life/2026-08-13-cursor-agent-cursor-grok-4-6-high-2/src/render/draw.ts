import type { Blob, Spark, Tree, World } from '../sim/types'

export type Camera = {
  yaw: number
  originX: number
  originY: number
  scale: number
}

const SQUASH = 0.42

export function project(x: number, y: number, cam: Camera, lift = 0) {
  const c = Math.cos(cam.yaw)
  const s = Math.sin(cam.yaw)
  const rx = x * c - y * s
  const ry = x * s + y * c
  return {
    x: cam.originX + rx * cam.scale,
    y: cam.originY + ry * cam.scale * SQUASH - lift * cam.scale * 0.52,
    depth: ry,
    rx,
    ry,
  }
}

export function unproject(sx: number, sy: number, cam: Camera) {
  const rx = (sx - cam.originX) / cam.scale
  const ry = (sy - cam.originY) / (cam.scale * SQUASH)
  const c = Math.cos(-cam.yaw)
  const s = Math.sin(-cam.yaw)
  return { x: rx * c - ry * s, y: rx * s + ry * c }
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function discGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer: string,
) {
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  return g
}

export function fitCamera(world: World, width: number, height: number, yaw: number): Camera {
  const pad = Math.min(width, height) * 0.08
  const usable = Math.min(width, height * 1.55) - pad * 2
  const scale = usable / (world.radius * 2.15)
  return {
    yaw,
    originX: width * 0.5,
    originY: height * 0.52,
    scale,
  }
}

function drawDish(ctx: CanvasRenderingContext2D, world: World, cam: Camera) {
  const rim = project(0, 0, cam)
  const rx = world.radius * cam.scale
  const ry = world.radius * cam.scale * SQUASH

  ctx.save()
  ellipse(ctx, rim.x, rim.y + ry * 0.22, rx * 1.08, ry * 1.18)
  ctx.fillStyle = 'rgba(8, 12, 18, 0.45)'
  ctx.fill()
  ctx.restore()

  ellipse(ctx, rim.x, rim.y + 6, rx * 1.06, ry * 1.08)
  ctx.fillStyle = '#6f8f7c'
  ctx.fill()

  ellipse(ctx, rim.x, rim.y, rx * 1.05, ry * 1.05)
  const lip = ctx.createLinearGradient(rim.x - rx, rim.y, rim.x + rx, rim.y)
  lip.addColorStop(0, '#8fb8a0')
  lip.addColorStop(0.45, '#cfe3d4')
  lip.addColorStop(0.7, '#9dc4ae')
  lip.addColorStop(1, '#6f947e')
  ctx.fillStyle = lip
  ctx.fill()

  ellipse(ctx, rim.x, rim.y - 2, rx * 0.93, ry * 0.93)
  ctx.fillStyle = '#3a4a32'
  ctx.fill()

  ellipse(ctx, rim.x, rim.y - 3, rx * 0.9, ry * 0.9)
  const soil = ctx.createRadialGradient(rim.x - rx * 0.15, rim.y - ry * 0.2, 8, rim.x, rim.y, rx)
  soil.addColorStop(0, '#4d6a42')
  soil.addColorStop(0.55, '#3b5536')
  soil.addColorStop(1, '#2a3c28')
  ctx.fillStyle = soil
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(rim.x, rim.y - 3, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 28; i++) {
    const a = i * 2.4
    const rr = (0.15 + (i % 7) * 0.1) * rx
    ellipse(ctx, rim.x + Math.cos(a) * rr, rim.y + Math.sin(a) * rr * SQUASH - 3, 7 + (i % 5), 3.5)
    ctx.fillStyle = i % 2 ? '#6a8a58' : '#2f442c'
    ctx.fill()
  }
  ctx.restore()

  ctx.beginPath()
  ctx.ellipse(rim.x, rim.y - 8, rx * 0.72, ry * 0.42, -0.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(220, 240, 220, 0.08)'
  ctx.fill()
}

function berryPos(tree: Tree, berry: Tree['berries'][number], cam: Camera) {
  const p = project(tree.x, tree.y, cam)
  const s = tree.scale * clamp(cam.scale * 0.085, 1.15, 1.85)
  const a = berry.angle
  const r = berry.spread * s * 0.85
  return {
    x: p.x + Math.cos(a) * r,
    y: p.y - 22 * s + Math.sin(a) * r * 0.42,
    depth: p.depth,
  }
}

function drawTreeShadow(ctx: CanvasRenderingContext2D, tree: Tree, cam: Camera) {
  const p = project(tree.x, tree.y, cam)
  ellipse(ctx, p.x + 6, p.y + 4, 18 * tree.scale, 7 * tree.scale)
  ctx.fillStyle = 'rgba(12, 18, 14, 0.28)'
  ctx.fill()
}

function drawBlobShadow(ctx: CanvasRenderingContext2D, blob: Blob, cam: Camera) {
  const p = project(blob.x, blob.y, cam)
  const moving = Math.min(1, Math.hypot(blob.vx, blob.vy) / 20)
  ellipse(ctx, p.x + 3, p.y + 2, 11 - moving * 2, 4.2)
  ctx.fillStyle = 'rgba(10, 14, 16, 0.32)'
  ctx.fill()
}

function drawTree(ctx: CanvasRenderingContext2D, tree: Tree, cam: Camera, t: number) {
  const p = project(tree.x, tree.y, cam)
  const s = tree.scale * clamp(cam.scale * 0.085, 1.15, 1.85)
  const sway = Math.sin(t * 0.7 + tree.lean * 4) * 0.08 + tree.lean
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(sway * 0.12)

  ctx.fillStyle = '#5a3a28'
  ctx.beginPath()
  ctx.moveTo(-3.2 * s, 2)
  ctx.lineTo(3.2 * s, 2)
  ctx.lineTo(1.6 * s, -18 * s)
  ctx.lineTo(-1.6 * s, -18 * s)
  ctx.closePath()
  ctx.fill()

  const canopyY = -22 * s
  const layers = [
    { x: -7 * s, y: canopyY + 4 * s, r: 13 * s, c: '#2f5a34' },
    { x: 8 * s, y: canopyY + 3 * s, r: 14 * s, c: '#3a6b3c' },
    { x: 0, y: canopyY - 4 * s, r: 15 * s, c: '#4a8248' },
    { x: 4 * s, y: canopyY - 8 * s, r: 9 * s, c: '#5c9856' },
  ]
  for (const layer of layers) {
    ctx.beginPath()
    ctx.arc(layer.x, layer.y, layer.r, 0, Math.PI * 2)
    ctx.fillStyle = discGradient(ctx, layer.x - 3, layer.y - 4, layer.r, '#7db56a', layer.c)
    ctx.fill()
  }

  ctx.restore()

  for (const berry of tree.berries) {
    const grown = berry.ripe ? 1 : Math.max(0.12, berry.grow)
    if (!berry.ripe && berry.grow < 0.12) continue
    const bp = berryPos(tree, berry, cam)
    const r = (3.6 + berry.size * 1.6) * grown
    ellipse(ctx, bp.x, bp.y, r, r)
    const g = ctx.createRadialGradient(bp.x - r * 0.3, bp.y - r * 0.35, r * 0.1, bp.x, bp.y, r)
    g.addColorStop(0, berry.ripe ? '#d6f58a' : '#8fbf6a')
    g.addColorStop(0.55, berry.ripe ? '#8ee05c' : '#5a8a44')
    g.addColorStop(1, berry.ripe ? '#3f8a32' : '#2f5a28')
    ctx.fillStyle = g
    ctx.fill()
    ctx.beginPath()
    ctx.arc(bp.x - r * 0.28, bp.y - r * 0.32, r * 0.22, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
  }
}

function blobColor(kind: Blob['kind']) {
  return kind === 'blue'
    ? { a: '#b8efff', b: '#3ec4e8', c: '#1a7aa0', eye: '#143048' }
    : { a: '#ffd0c8', b: '#f05662', c: '#a02838', eye: '#2a1014' }
}

function drawBlob(ctx: CanvasRenderingContext2D, blob: Blob, cam: Camera, selected: boolean) {
  const hop = blob.hop * 7 + (blob.action === 'eat' ? Math.sin(blob.age * 16) * 2 : 0)
  const p = project(blob.x, blob.y, cam, 7 + hop)
  const col = blobColor(blob.kind)
  const lean = Math.atan2(blob.vy, blob.vx) * 0.18
  const squash = 1 - blob.squash * 0.18
  const stretch = 1 + blob.squash * 0.12
  const w = 13 * stretch
  const h = 10 * squash

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(lean)

  if (selected) {
    ellipse(ctx, 0, 8, 16, 6)
    ctx.strokeStyle = 'rgba(240, 210, 130, 0.9)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  if (blob.glow > 0.05) {
    ellipse(ctx, 0, 0, 18, 14)
    ctx.fillStyle = blob.kind === 'blue' ? `rgba(90, 210, 240, ${blob.glow * 0.28})` : `rgba(255, 120, 110, ${blob.glow * 0.28})`
    ctx.fill()
  }

  ellipse(ctx, -1.5, 1.2, w * 0.72, h * 0.72)
  ctx.fillStyle = col.c
  ctx.fill()

  ellipse(ctx, 0, 0, w * 0.72, h * 0.72)
  const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 14)
  g.addColorStop(0, col.a)
  g.addColorStop(0.45, col.b)
  g.addColorStop(1, col.c)
  ctx.fillStyle = g
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(-4.2, -3.4, 3.2, 2.1, -0.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.fill()

  const closed = blob.blinkFor > 0
  if (closed) {
    ctx.strokeStyle = col.eye
    ctx.lineWidth = 1.15
    ctx.beginPath()
    ctx.moveTo(-3.6, -0.4)
    ctx.lineTo(-1.4, -0.4)
    ctx.moveTo(1.2, -0.4)
    ctx.lineTo(3.4, -0.4)
    ctx.stroke()
  } else {
    ctx.fillStyle = col.eye
    ctx.beginPath()
    ctx.arc(-2.5, -0.6, 1.15, 0, Math.PI * 2)
    ctx.arc(2.2, -0.6, 1.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-2.15, -0.95, 0.38, 0, Math.PI * 2)
    ctx.arc(2.55, -0.95, 0.38, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = col.eye
  ctx.lineWidth = 1.1
  ctx.beginPath()
  if (blob.action === 'eat') {
    ctx.arc(0, 2.4, 2.1, 0.15, Math.PI - 0.15)
  } else if (blob.action === 'flee') {
    ctx.moveTo(-1.6, 2.6)
    ctx.lineTo(1.6, 2.6)
  } else {
    ctx.arc(0, 1.7, 2.4, 0.2, Math.PI - 0.2)
  }
  ctx.stroke()

  ctx.restore()
}

function drawSpark(ctx: CanvasRenderingContext2D, spark: Spark, cam: Camera) {
  const p = project(spark.x, spark.y, cam, spark.z)
  const u = 1 - spark.life / spark.max
  const n = 5
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.globalAlpha = Math.max(0, spark.life / spark.max)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + spark.seed * 6
    const r = 4 + u * 14
    ctx.beginPath()
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.6, 1.6, 0, Math.PI * 2)
    ctx.fillStyle = spark.hue === 'fruit' ? '#b6f06a' : spark.hue === 'blue' ? '#7ee0ff' : '#ff8a86'
    ctx.fill()
  }
  ctx.restore()
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  selectedId: number | null,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  drawDish(ctx, world, cam)

  for (const tree of world.trees) drawTreeShadow(ctx, tree, cam)
  for (const blob of world.blobs) drawBlobShadow(ctx, blob, cam)

  type Item = { depth: number; draw: () => void }
  const items: Item[] = []
  for (const tree of world.trees) {
    const p = project(tree.x, tree.y, cam)
    items.push({ depth: p.depth, draw: () => drawTree(ctx, tree, cam, world.t) })
  }
  for (const blob of world.blobs) {
    const p = project(blob.x, blob.y, cam)
    items.push({
      depth: p.depth + 0.4,
      draw: () => drawBlob(ctx, blob, cam, blob.id === selectedId),
    })
  }
  items.sort((a, b) => a.depth - b.depth)
  for (const item of items) item.draw()
  for (const spark of world.sparks) drawSpark(ctx, spark, cam)
}

export function hitBlob(world: World, cam: Camera, sx: number, sy: number): number | null {
  let best: number | null = null
  let bestD = 18 * 18
  for (const blob of world.blobs) {
    const p = project(blob.x, blob.y, cam, 8)
    const d2 = (p.x - sx) ** 2 + (p.y - sy) ** 2
    if (d2 < bestD) {
      bestD = d2
      best = blob.id
    }
  }
  return best
}
