import type { Blob, Effect, Tree, World } from '../sim/types'
import { project, unproject, type Camera } from './camera'
import { seriesColor, type GardenTheme, type Mode } from '../theme'

const TAU = Math.PI * 2
const DISH_LIP = 16

export type SceneOpts = {
  theme: GardenTheme
  mode: Mode
  /** 0..1 between the previous step and the current one. */
  alpha: number
  selectedId: number | null
  /** Wall-clock seconds, so idle animation keeps going while paused. */
  clock: number
}

type Drawable = { depth: number; draw: () => void }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Position to draw a blob at, smoothed between simulation steps. */
function blobAt(b: Blob, alpha: number) {
  return { x: lerp(b.px, b.x, alpha), y: lerp(b.py, b.y, alpha) }
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

/** World units a tall tree reaches above the soil, so the fit leaves it headroom. */
const CANOPY_HEIGHT = 76

export function fitCamera(cam: Camera, width: number, height: number, radius: number) {
  const margin = 22
  // Tilt squashes the dish vertically, so the height budget only has to cover
  // the squashed disc plus one canopy — not the full diameter. Fitting against
  // the diameter is what used to leave the garden marooned in empty space.
  const byWidth = (width - margin * 2) / (radius * 2)
  const byHeight = (height - margin * 2) / (radius * 2 * cam.tilt + CANOPY_HEIGHT)
  cam.scale = Math.max(0.1, Math.min(byWidth, byHeight))
  cam.cx = width / 2
  // Trees grow upwards out of the dish, so the disc sits a little low in frame.
  cam.cy = height / 2 + CANOPY_HEIGHT * cam.scale * 0.3
}

export function drawScene(ctx: CanvasRenderingContext2D, world: World, cam: Camera, opts: SceneOpts) {
  const { theme } = opts
  const w = ctx.canvas.width / (window.devicePixelRatio || 1)
  const h = ctx.canvas.height / (window.devicePixelRatio || 1)
  ctx.clearRect(0, 0, w, h)

  drawDish(ctx, world, cam, theme)

  // Every shadow lies on the soil, so they all go down before any actor —
  // that way a near blob never has a far blob's shadow painted over it.
  for (const tree of world.trees) drawTreeShadow(ctx, tree, cam, theme)
  for (const b of world.blobs) {
    const p = blobAt(b, opts.alpha)
    drawBlobShadow(ctx, p.x, p.y, cam, theme)
  }

  const items: Drawable[] = []
  for (const tree of world.trees) {
    const p = project(cam, tree.x, tree.y, 0)
    items.push({ depth: p.depth, draw: () => drawTree(ctx, tree, cam, opts) })
  }
  for (const b of world.blobs) {
    const pos = blobAt(b, opts.alpha)
    const p = project(cam, pos.x, pos.y, 0)
    items.push({ depth: p.depth, draw: () => drawBlob(ctx, b, pos.x, pos.y, cam, opts) })
  }
  items.sort((a, b) => a.depth - b.depth)
  for (const it of items) it.draw()

  for (const fx of world.effects) drawEffect(ctx, fx, cam, opts)
}

// --- the dish ---------------------------------------------------------------

function dishPath(ctx: CanvasRenderingContext2D, cam: Camera, radius: number, lift: number) {
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy - lift, radius * cam.scale, radius * cam.scale * cam.tilt, 0, 0, TAU)
}

function drawDish(ctx: CanvasRenderingContext2D, world: World, cam: Camera, theme: GardenTheme) {
  const r = world.radius
  const rx = r * cam.scale
  const ry = r * cam.scale * cam.tilt
  const lip = DISH_LIP * cam.scale

  ctx.save()
  // A soft pool of shade beneath, so the dish reads as lifted off the page.
  ctx.filter = 'blur(12px)'
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy + lip * 1.5, rx * 0.97, ry * 0.9, 0, 0, TAU)
  ctx.fill()
  ctx.filter = 'none'

  // The rim, as a straight extrusion between two ellipses.
  const side = ctx.createLinearGradient(cam.cx - rx, 0, cam.cx + rx, 0)
  side.addColorStop(0, shade(theme.dishSide, -0.25))
  side.addColorStop(0.42, theme.dishSide)
  side.addColorStop(1, shade(theme.dishSide, -0.35))
  ctx.fillStyle = side
  ctx.beginPath()
  ctx.ellipse(cam.cx, cam.cy + lip, rx, ry, 0, 0, Math.PI)
  ctx.ellipse(cam.cx, cam.cy, rx, ry, 0, Math.PI, 0, true)
  ctx.closePath()
  ctx.fill()

  // Soil surface, lit from the upper left.
  const soil = ctx.createRadialGradient(cam.cx - rx * 0.3, cam.cy - ry * 0.5, rx * 0.05, cam.cx, cam.cy, rx * 1.05)
  soil.addColorStop(0, theme.soilLight)
  soil.addColorStop(1, theme.soil)
  ctx.fillStyle = soil
  dishPath(ctx, cam, r, 0)
  ctx.fill()

  // Grass fringe just inside the rim.
  ctx.strokeStyle = theme.grass
  ctx.lineWidth = Math.max(2, 7 * cam.scale)
  ctx.globalAlpha = 0.5
  dishPath(ctx, cam, r - 5, 0)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.strokeStyle = theme.dishRim
  ctx.lineWidth = Math.max(1.5, 3 * cam.scale)
  dishPath(ctx, cam, r, 0)
  ctx.stroke()
  ctx.restore()
}

// --- trees ------------------------------------------------------------------

function drawTreeShadow(ctx: CanvasRenderingContext2D, tree: Tree, cam: Camera, theme: GardenTheme) {
  const p = project(cam, tree.x, tree.y, 0)
  ctx.save()
  ctx.fillStyle = theme.shadow
  ctx.filter = 'blur(4px)'
  ctx.beginPath()
  ctx.ellipse(p.sx + 5 * cam.scale, p.sy + 2 * cam.scale, 19 * tree.scale * cam.scale, 9 * tree.scale * cam.scale, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawTree(ctx: CanvasRenderingContext2D, tree: Tree, cam: Camera, opts: SceneOpts) {
  const { theme, clock } = opts
  const sway = Math.sin(clock * 0.7 + tree.leanSeed) * 0.035
  const base = project(cam, tree.x, tree.y, 0)
  const s = cam.scale * tree.scale

  // Trunk: a tapered quad leaning with the breeze.
  const topH = 26 * tree.scale
  const top = project(cam, tree.x, tree.y, topH)
  const leanX = sway * 16 * cam.scale
  ctx.beginPath()
  ctx.moveTo(base.sx - 3.6 * s, base.sy)
  ctx.lineTo(base.sx + 3.6 * s, base.sy)
  ctx.lineTo(top.sx + 2.2 * s + leanX, top.sy)
  ctx.lineTo(top.sx - 2.2 * s + leanX, top.sy)
  ctx.closePath()
  const trunkGrad = ctx.createLinearGradient(base.sx - 4 * s, 0, base.sx + 4 * s, 0)
  trunkGrad.addColorStop(0, theme.trunkDark)
  trunkGrad.addColorStop(0.5, theme.trunk)
  trunkGrad.addColorStop(1, theme.trunkDark)
  ctx.fillStyle = trunkGrad
  ctx.fill()

  // Canopy: overlapping lobes, darker at the back.
  const lobes = [
    { dx: 0, dy: 0, r: 15, tone: theme.leaf },
    { dx: -9, dy: 4, r: 11, tone: theme.leafDark },
    { dx: 9, dy: 5, r: 11.5, tone: theme.leafDark },
    { dx: -3, dy: -7, r: 11, tone: theme.leafLight },
    { dx: 6, dy: -5, r: 9.5, tone: theme.leafLight },
  ]
  for (const lobe of lobes) {
    ctx.beginPath()
    ctx.ellipse(top.sx + lobe.dx * s + leanX, top.sy + lobe.dy * s, lobe.r * s, lobe.r * s * 0.92, 0, 0, TAU)
    ctx.fillStyle = lobe.tone
    ctx.fill()
  }

  // Fruit, hung on the canopy at its own anchor and depth-sorted within the tree.
  const fruitColor = seriesColor('fruit', opts.mode)
  const hung = tree.anchors
    .map((a, i) => ({ a, i, p: project(cam, tree.x + a.x, tree.y + a.y, a.z * tree.scale) }))
    .sort((l, r) => l.p.depth - r.p.depth)
  for (const { a, i, p } of hung) {
    const pop = tree.pop[i]
    if (pop <= 0.01) continue
    const rr = a.r * cam.scale * (0.55 + 0.45 * pop) * (0.9 + 0.1 * Math.sin(clock * 2 + i))
    ctx.beginPath()
    ctx.arc(p.sx + leanX, p.sy, rr, 0, TAU)
    ctx.fillStyle = fruitColor
    ctx.fill()
    ctx.beginPath()
    ctx.arc(p.sx + leanX - rr * 0.3, p.sy - rr * 0.34, rr * 0.32, 0, TAU)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fill()
  }
}

// --- blobs ------------------------------------------------------------------

function drawBlobShadow(ctx: CanvasRenderingContext2D, x: number, y: number, cam: Camera, theme: GardenTheme) {
  const p = project(cam, x, y, 0)
  ctx.save()
  ctx.fillStyle = theme.shadow
  ctx.filter = 'blur(2px)'
  ctx.beginPath()
  ctx.ellipse(p.sx + 2 * cam.scale, p.sy + 1.5 * cam.scale, 7.5 * cam.scale, 3.4 * cam.scale, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawBlob(ctx: CanvasRenderingContext2D, b: Blob, x: number, y: number, cam: Camera, opts: SceneOpts) {
  const { clock, mode } = opts
  const speed = Math.hypot(b.vx, b.vy)
  // A little hop while travelling, a slow breath while still.
  const gait = speed > 2 ? Math.abs(Math.sin(clock * 7 + b.phase)) * 3.2 : Math.sin(clock * 1.8 + b.phase) * 0.7
  const hop = Math.max(0, gait)
  const p = project(cam, x, y, hop + 8)

  const color = seriesColor(b.kind, mode)
  const s = cam.scale
  // Squash on impact, stretch into the run.
  const stretch = 1 + Math.min(0.16, speed * 0.004) - b.squash * 0.22
  const rw = 8.4 * s * (1 / stretch) * (1 + b.squash * 0.3)
  const rh = 9.6 * s * stretch

  ctx.save()
  ctx.translate(p.sx, p.sy)
  // Lean into the direction of travel, measured on screen so the tilt still
  // looks right after the camera has been spun round.
  const dir = project(cam, x + b.vx, y + b.vy, 0)
  ctx.rotate(Math.max(-0.34, Math.min(0.34, (dir.sx - p.sx) * 0.012)))

  if (opts.selectedId === b.id) {
    ctx.beginPath()
    ctx.ellipse(0, rh * 0.72, rw * 1.5, rw * 0.72, 0, 0, TAU)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
  }

  if (b.glow > 0) {
    ctx.beginPath()
    ctx.ellipse(0, 0, rw * (1.3 + b.glow * 0.5), rh * (1.25 + b.glow * 0.5), 0, 0, TAU)
    ctx.fillStyle = color
    ctx.globalAlpha = b.glow * 0.3
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // Body.
  const body = ctx.createLinearGradient(0, -rh, 0, rh)
  body.addColorStop(0, shade(color, 0.26))
  body.addColorStop(0.55, color)
  body.addColorStop(1, shade(color, -0.24))
  ctx.beginPath()
  ctx.ellipse(0, 0, rw, rh, 0, 0, TAU)
  ctx.fillStyle = body
  ctx.fill()

  // Gloss.
  ctx.beginPath()
  ctx.ellipse(-rw * 0.32, -rh * 0.42, rw * 0.3, rh * 0.22, -0.5, 0, TAU)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()

  // Blinking is presentation only, so it runs off the wall clock — the blobs
  // keep blinking while the world is paused, and it stays out of the rules.
  const cycle = (clock * 0.3 + b.blinkTimer) % 1
  drawFace(ctx, b, rw, rh, cycle < 0.05)
  ctx.restore()

  // A quiet energy pip, so the inspector's numbers have a visible counterpart.
  const frac = Math.max(0, Math.min(1, b.energy / 120))
  ctx.beginPath()
  ctx.arc(p.sx, p.sy - rh - 4 * s, 1.7 * s, 0, TAU)
  ctx.fillStyle = frac < 0.25 ? 'rgba(220,70,50,0.9)' : 'rgba(255,255,255,0.55)'
  ctx.fill()
}

function drawFace(ctx: CanvasRenderingContext2D, b: Blob, rw: number, rh: number, blinking: boolean) {
  const eyeY = -rh * 0.12
  const dx = rw * 0.36
  const eating = b.action === 'eat'
  const scared = b.action === 'flee'

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(20,18,16,0.85)'
  ctx.lineWidth = Math.max(1, rw * 0.11)

  if (blinking) {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * dx - rw * 0.16, eyeY)
      ctx.lineTo(side * dx + rw * 0.16, eyeY)
      ctx.stroke()
    }
  } else {
    const open = scared ? 1.25 : 1
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(side * dx, eyeY, rw * 0.19, rh * 0.17 * open, 0, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(side * dx, eyeY + rh * 0.02, rw * 0.09, 0, TAU)
      ctx.fillStyle = 'rgba(20,18,16,0.9)'
      ctx.fill()
      ctx.fillStyle = '#ffffff'
    }
  }

  // Mouth: chewing opens and closes, fright makes a small o.
  ctx.strokeStyle = 'rgba(20,18,16,0.7)'
  ctx.lineWidth = Math.max(1, rw * 0.1)
  const my = rh * 0.36
  ctx.beginPath()
  if (eating) {
    const chew = (Math.sin(b.actionTimer * 14) + 1) / 2
    ctx.ellipse(0, my, rw * 0.2, rh * (0.06 + chew * 0.1), 0, 0, TAU)
    ctx.fillStyle = 'rgba(40,26,22,0.8)'
    ctx.fill()
  } else if (scared) {
    ctx.arc(0, my, rw * 0.14, 0, TAU)
    ctx.fillStyle = 'rgba(40,26,22,0.75)'
    ctx.fill()
  } else {
    ctx.arc(0, my - rh * 0.08, rw * 0.26, 0.35, Math.PI - 0.35)
    ctx.stroke()
  }
}

// --- effects ----------------------------------------------------------------

function drawEffect(ctx: CanvasRenderingContext2D, fx: Effect, cam: Camera, opts: SceneOpts) {
  const p = project(cam, fx.x, fx.y, fx.z)
  const life = fx.life / fx.maxLife
  const gone = 1 - life
  const color = fx.color === 'fruit' ? seriesColor('fruit', opts.mode) : seriesColor(fx.color, opts.mode)
  const s = cam.scale

  ctx.save()
  ctx.globalAlpha = life
  if (fx.kind === 'eat' || fx.kind === 'ripen') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + fx.seed
      const d = (6 + gone * 14) * s
      ctx.beginPath()
      ctx.arc(p.sx + Math.cos(a) * d, p.sy + Math.sin(a) * d * 0.7 - gone * 8 * s, 1.9 * s * life, 0, TAU)
      ctx.fillStyle = color
      ctx.fill()
    }
  } else if (fx.kind === 'contact') {
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, (7 + gone * 17) * s, (7 + gone * 17) * s * 0.68, 0, 0, TAU)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.2 * life
    ctx.stroke()
  } else if (fx.kind === 'birth') {
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, (4 + gone * 12) * s, (4 + gone * 12) * s * 0.7, 0, 0, TAU)
    ctx.strokeStyle = color
    ctx.lineWidth = 2 * life
    ctx.stroke()
  } else if (fx.kind === 'death') {
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy - gone * 10 * s, 8 * s * (1 - gone * 0.5), 9 * s * (1 - gone * 0.5), 0, 0, TAU)
    ctx.fillStyle = color
    ctx.globalAlpha = life * 0.45
    ctx.fill()
  }
  ctx.restore()
}

// --- hit testing ------------------------------------------------------------

export function pickBlob(world: World, cam: Camera, sx: number, sy: number, alpha: number): Blob | null {
  let best: Blob | null = null
  let bestD = 15 * cam.scale + 8
  for (const b of world.blobs) {
    const pos = blobAt(b, alpha)
    const p = project(cam, pos.x, pos.y, 8)
    const d = Math.hypot(p.sx - sx, p.sy - sy)
    // Nearer blobs win ties, matching what the eye picked out.
    if (d < bestD || (d < bestD * 1.3 && best && p.depth > project(cam, best.x, best.y, 8).depth)) {
      bestD = Math.min(bestD, d)
      best = b
    }
  }
  return best
}

export { unproject }
