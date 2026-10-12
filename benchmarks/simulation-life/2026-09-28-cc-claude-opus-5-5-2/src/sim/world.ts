import { Rng } from './rng.ts'
import type { Params } from './params.ts'
import { History } from './history.ts'

export const BLUE = 0
export const RED = 1
export type Kind = typeof BLUE | typeof RED

export type Action =
  | 'wander'
  | 'seek'
  | 'eat'
  | 'rest'
  | 'flee'
  | 'hide'
  | 'startled'
  | 'bud'
  | 'hunt'
  | 'pause'
  | 'bump'
  | 'lounge'
  | 'fade'

export const ACTION_LABEL: Record<Action, string> = {
  wander: 'Wandering',
  seek: 'Heading to fruit',
  eat: 'Eating fruit',
  rest: 'Resting by a tree',
  flee: 'Scooting away from red',
  hide: 'Hiding under leaves',
  startled: 'Startled',
  bud: 'Making a copy',
  hunt: 'Chasing a blue blob',
  pause: 'Pausing after a boop',
  bump: 'Bumped into another red',
  lounge: 'Full and lounging',
  fade: 'Fading away',
}

/** Simulation step (seconds of garden time). */
export const DT = 0.05
export const MAX_ENERGY = 100
export const FRUIT_ENERGY = 30
/** Knobs that are not exposed in the UI (tweaked by the headless tuner). */
export const TUNING = {
  /** Share of drained energy a red blob keeps. */
  contactEfficiency: 0.45,
  redBase: 0.6,
  redMove: 1.3,
  blueBase: 0.5,
  blueMove: 1.0,
  shelterSpot: 1.2,
  chaseLimit: 7,
  fearFactor: 0.75,
  nearFear: 2.5,
  /** Chance per think that a red crowded by another red stops to squabble. */
  bumpChance: 0.3,
  bumpRadius: 2.2,
}
export const BODY_RADIUS: Record<Kind, number> = { 0: 0.42, 1: 0.5 }
export const MAX_SLOTS = 12
const HISTORY_EVERY = 0.5

/** Energy burned per second: idle base + movement (∝ speed²) + keeping eyes open (∝ vision). */
const COST = {
  0: { speedRef: 2.2, vision: 0.15, visionRef: 7 },
  1: { speedRef: 2.6, vision: 0.14, visionRef: 8 },
} as const

export interface FruitSlot {
  /** 0..1 size of the fruit on the stem. */
  g: number
  /** 0 growing, 1 ripe, 2 being eaten, 3 resting stem. */
  state: 0 | 1 | 2 | 3
  timer: number
  eater: Blob | null
}

export interface Tree {
  id: number
  x: number
  y: number
  scale: number
  slots: FruitSlot[]
  ripe: number
  /** Blue blobs currently heading to or eating at this tree. */
  visitors: number
}

export interface Blob {
  id: number
  kind: Kind
  name: string
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  heading: number
  energy: number
  age: number
  maxAge: number
  action: Action
  actionTime: number
  actionDur: number
  thinkIn: number
  wanderAngle: number
  target: Blob | null
  tree: Tree | null
  homeTree: Tree | null
  slot: number
  fleeX: number
  fleeY: number
  speedGene: number
  visionGene: number
  generation: number
  parentId: number
  children: number
  copyCooldown: number
  immuneFor: number
  chaseTime: number
  giveUpFor: number
  meals: number
  born: number
  /** Seconds left of a glow pulse (renderer). */
  glow: number
  /** Stable random for animation offsets. */
  phase: number
  alive: boolean
  fadeT: number
  causeOfFade: '' | 'hunger' | 'boop' | 'age'
  /** Tucked under a canopy: red blobs only notice it up close. */
  sheltered: boolean
  /** Red blobs currently chasing this blob. */
  huntedBy: number
}

export type SimEvent =
  | { type: 'eat'; x: number; y: number; id: number }
  | { type: 'contact'; x: number; y: number; redId: number; blueId: number; drained: number; faded: boolean }
  | { type: 'birth'; x: number; y: number; kind: Kind; id: number }
  | { type: 'fade'; x: number; y: number; kind: Kind; cause: string }
  | { type: 'bite'; x: number; y: number; treeId: number; slot: number; blobId: number }

export interface Totals {
  births: [number, number]
  fades: [number, number]
  fadesByBoop: number
  fadesByHunger: [number, number]
  fadesByAge: [number, number]
  fruitEaten: number
  contacts: number
}

const SYL_A = ['Mo', 'Pi', 'Lu', 'Bo', 'Ki', 'Zu', 'Fe', 'Ni', 'Ta', 'Ru', 'Po', 'Mi', 'Chu', 'Wi', 'Da', 'Bee', 'Gu', 'Lo', 'Su', 'Pe']
const SYL_B = ['chi', 'ppy', 'mo', 'bo', 'nk', 'zzle', 'ly', 'po', 'ki', 'bun', 'dle', 'mp', 'ko', 'nu', 'bby', 'lo', 'rt', 'fu']

export class World {
  params: Params
  rng: Rng
  radius: number
  t = 0
  trees: Tree[] = []
  blobs: Blob[] = []
  counts: [number, number] = [0, 0]
  ripe = 0
  fruitCapacity = 0
  history = new History()
  events: SimEvent[] = []
  totals: Totals = {
    births: [0, 0],
    fades: [0, 0],
    fadesByBoop: 0,
    fadesByHunger: [0, 0],
    fadesByAge: [0, 0],
    fruitEaten: 0,
    contacts: 0,
  }
  private nextId = 1
  private sinceRecord = 0
  // spatial grid (linked lists over blob indices)
  private cell = 2.5
  private gridN = 1
  private gridHead = new Int32Array(1)
  private gridNext = new Int32Array(1)

  constructor(params: Params) {
    this.params = { ...params }
    this.rng = new Rng(params.seed * 2654435761)
    this.radius = params.worldSize
    this.setupGrid()
    this.plantTrees()
    for (let i = 0; i < params.blue0; i++) this.spawnInitial(BLUE)
    for (let i = 0; i < params.red0; i++) this.spawnInitial(RED)
    this.recount()
    this.record()
  }

  setParams(p: Params) {
    this.params = { ...p }
  }

  // ---------------------------------------------------------------- setup

  private setupGrid() {
    this.gridN = Math.ceil((this.radius * 2) / this.cell) + 2
    this.gridHead = new Int32Array(this.gridN * this.gridN)
  }

  private plantTrees() {
    const { trees } = this.params
    const R = this.radius
    const minGap = Math.min(4.2, Math.sqrt((Math.PI * R * R) / Math.max(1, trees)) * 0.62)
    for (let i = 0; i < trees; i++) {
      let best: { x: number; y: number } | null = null
      let bestD = -1
      for (let k = 0; k < 40; k++) {
        const a = this.rng.range(0, Math.PI * 2)
        const r = Math.sqrt(this.rng.next()) * (R - 3)
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        let d = Infinity
        for (const t of this.trees) d = Math.min(d, Math.hypot(t.x - x, t.y - y))
        if (d >= minGap) {
          best = { x, y }
          break
        }
        if (d > bestD) {
          bestD = d
          best = { x, y }
        }
      }
      const slots: FruitSlot[] = []
      for (let s = 0; s < MAX_SLOTS; s++) {
        // stagger the starting fruit so trees don't ripen in lockstep
        const ripe = this.rng.next() < 0.75
        slots.push({ g: ripe ? 1 : this.rng.next(), state: ripe ? 1 : 0, timer: 0, eater: null })
      }
      this.trees.push({ id: i, x: best!.x, y: best!.y, scale: this.rng.range(0.85, 1.2), slots, ripe: 0, visitors: 0 })
    }
  }

  private freeSpot(margin = 1.2): { x: number; y: number } {
    const R = this.radius
    for (let k = 0; k < 30; k++) {
      const a = this.rng.range(0, Math.PI * 2)
      const r = Math.sqrt(this.rng.next()) * (R - margin)
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (this.trees.every((t) => Math.hypot(t.x - x, t.y - y) > 1.3 * t.scale)) return { x, y }
    }
    return { x: 0, y: 0 }
  }

  private makeName(): string {
    return this.rng.pick(SYL_A) + this.rng.pick(SYL_B)
  }

  private newBlob(kind: Kind, x: number, y: number, energy: number, parent: Blob | null): Blob {
    const mut = this.params.mutation
    const gene = (g: number) => Math.min(1.8, Math.max(0.5, g * (1 + this.rng.normal() * mut)))
    const b: Blob = {
      id: this.nextId++,
      kind,
      name: this.makeName(),
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      heading: this.rng.range(0, Math.PI * 2),
      energy,
      age: 0,
      maxAge: kind === BLUE ? this.rng.range(120, 200) : this.rng.range(240, 340),
      action: 'wander',
      actionTime: 0,
      actionDur: 0,
      thinkIn: this.rng.range(0, 0.3),
      wanderAngle: this.rng.range(0, Math.PI * 2),
      target: null,
      tree: null,
      homeTree: null,
      slot: -1,
      fleeX: 0,
      fleeY: 0,
      speedGene: parent ? gene(parent.speedGene) : 1 + this.rng.normal() * 0.04,
      visionGene: parent ? gene(parent.visionGene) : 1 + this.rng.normal() * 0.04,
      generation: parent ? parent.generation + 1 : 0,
      parentId: parent ? parent.id : 0,
      children: 0,
      copyCooldown: parent ? 6 : this.rng.range(0, 6),
      immuneFor: 0,
      chaseTime: 0,
      giveUpFor: 0,
      meals: 0,
      born: this.t,
      glow: 0,
      phase: this.rng.next() * 1000,
      alive: true,
      fadeT: 0,
      causeOfFade: '',
      sheltered: false,
      huntedBy: 0,
    }
    b.wanderAngle = b.heading
    return b
  }

  private spawnInitial(kind: Kind) {
    const p = this.freeSpot()
    const b = this.newBlob(kind, p.x, p.y, this.rng.range(45, 70), null)
    b.age = this.rng.range(10, 60)
    this.blobs.push(b)
  }

  // ---------------------------------------------------------------- traits

  speedOf(b: Blob): number {
    return (b.kind === BLUE ? this.params.blueSpeed : this.params.redSpeed) * b.speedGene
  }

  visionOf(b: Blob): number {
    return (b.kind === BLUE ? this.params.blueVision : this.params.redVision) * b.visionGene
  }

  energyUseOf(b: Blob, speed: number): number {
    const c = COST[b.kind]
    const mult = b.kind === BLUE ? this.params.blueEnergyUse : this.params.redEnergyUse
    const s = speed / c.speedRef
    const base = b.kind === BLUE ? TUNING.blueBase : TUNING.redBase
    const move = b.kind === BLUE ? TUNING.blueMove : TUNING.redMove
    return mult * (base + move * s * s + c.vision * (this.visionOf(b) / c.visionRef))
  }

  // ---------------------------------------------------------------- grid

  private rebuildGrid() {
    const n = this.blobs.length
    if (this.gridNext.length < n) this.gridNext = new Int32Array(Math.max(64, n * 2))
    this.gridHead.fill(-1)
    for (let i = 0; i < n; i++) {
      const b = this.blobs[i]
      if (!b.alive) continue
      const c = this.cellIndex(b.x, b.y)
      this.gridNext[i] = this.gridHead[c]
      this.gridHead[c] = i
    }
  }

  private cellCoord(v: number): number {
    const c = Math.floor((v + this.radius) / this.cell) + 1
    return c < 0 ? 0 : c >= this.gridN ? this.gridN - 1 : c
  }

  private cellIndex(x: number, y: number): number {
    return this.cellCoord(y) * this.gridN + this.cellCoord(x)
  }

  /** Calls fn for every live blob within r of (x,y) — excluding `self`. */
  private near(x: number, y: number, r: number, self: Blob | null, fn: (o: Blob, d2: number) => void) {
    const x0 = this.cellCoord(x - r)
    const x1 = this.cellCoord(x + r)
    const y0 = this.cellCoord(y - r)
    const y1 = this.cellCoord(y + r)
    const r2 = r * r
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = this.gridHead[cy * this.gridN + cx]
        while (i !== -1) {
          const o = this.blobs[i]
          if (o !== self && o.alive) {
            const dx = o.x - x
            const dy = o.y - y
            const d2 = dx * dx + dy * dy
            if (d2 <= r2) fn(o, d2)
          }
          i = this.gridNext[i]
        }
      }
    }
  }

  // ---------------------------------------------------------------- step

  step() {
    const dt = DT
    this.t += dt
    this.events.length = 0
    this.growFruit(dt)
    this.rebuildGrid()
    this.markShelter()

    const blobs = this.blobs
    const n = blobs.length
    for (let i = 0; i < n; i++) {
      const b = blobs[i]
      b.px = b.x
      b.py = b.y
      if (!b.alive) {
        b.fadeT += dt
        continue
      }
      this.updateBlob(b, dt)
    }
    this.resolveOverlaps()

    // births are appended during update; remove fully faded blobs
    let w = 0
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i]
      if (!b.alive && b.fadeT > 1.4) continue
      blobs[w++] = b
    }
    blobs.length = w

    this.recount()
    this.sinceRecord += dt
    if (this.sinceRecord >= HISTORY_EVERY - 1e-9) {
      this.sinceRecord = 0
      this.record()
    }
  }

  private growFruit(dt: number) {
    const { fruitGrowth, fruitLimit, fruitDelay } = this.params
    let ripe = 0
    for (const tree of this.trees) {
      let tr = 0
      tree.visitors = 0
      for (let s = 0; s < MAX_SLOTS; s++) {
        const slot = tree.slots[s]
        if (s >= fruitLimit) {
          // stems beyond the limit wither back to bare
          if (slot.state !== 2) {
            slot.state = 3
            slot.g = 0
            slot.timer = Math.max(slot.timer, fruitDelay)
          }
          continue
        }
        if (slot.state === 3) {
          slot.timer -= dt
          if (slot.timer <= 0) {
            slot.state = 0
            slot.g = 0
          }
        } else if (slot.state === 0) {
          slot.g += fruitGrowth * dt
          if (slot.g >= 1) {
            slot.g = 1
            slot.state = 1
          }
        }
        if (slot.state === 1) tr++
      }
      tree.ripe = tr
      ripe += tr
    }
    this.ripe = ripe
    this.fruitCapacity = this.trees.length * fruitLimit
    for (const b of this.blobs) if (b.alive && b.kind === BLUE && b.tree && (b.action === 'seek' || b.action === 'eat')) b.tree.visitors++
  }

  private updateBlob(b: Blob, dt: number) {
    b.age += dt
    b.copyCooldown -= dt
    b.immuneFor -= dt
    b.giveUpFor -= dt
    b.glow = Math.max(0, b.glow - dt)

    const speedNow = Math.hypot(b.vx, b.vy)
    b.energy -= this.energyUseOf(b, speedNow) * dt
    if (b.energy <= 0) {
      this.fade(b, 'hunger')
      return
    }
    if (b.age > b.maxAge) {
      this.fade(b, 'age')
      return
    }

    // timed actions
    if (b.actionTime > 0) {
      b.actionTime -= dt
      if (b.actionTime <= 0) this.finishAction(b)
    }

    // Decide
    const busy = b.action === 'eat' || b.action === 'bud' || b.action === 'pause' || b.action === 'startled' || b.action === 'bump'
    if (!busy) {
      if (this.wantsToCopy(b)) {
        this.startAction(b, 'bud', b.kind === BLUE ? 0.9 : 1.2)
      } else {
        b.thinkIn -= dt
        if (b.thinkIn <= 0) {
          b.thinkIn = 0.25 + this.rng.next() * 0.15
          if (b.kind === BLUE) this.thinkBlue(b)
          else this.thinkRed(b)
        }
      }
    }

    // Steer
    let dvx = 0
    let dvy = 0
    const top = this.speedOf(b)
    switch (b.action) {
      case 'eat':
      case 'bud':
      case 'pause':
      case 'startled':
      case 'hide':
      case 'bump':
        break
      case 'seek': {
        const t = b.tree!
        const dx = t.x - b.x
        const dy = t.y - b.y
        const d = Math.hypot(dx, dy) || 1
        const reach = this.reachOf(t, b)
        if (d <= reach) {
          this.tryEat(b)
        } else {
          const s = top * Math.min(1, (d - reach) / 1.2 + 0.35)
          dvx = (dx / d) * s
          dvy = (dy / d) * s
        }
        break
      }
      case 'flee': {
        const d = Math.hypot(b.fleeX, b.fleeY) || 1
        dvx = (b.fleeX / d) * top
        dvy = (b.fleeY / d) * top
        break
      }
      case 'hunt': {
        const t = b.target!
        if (!t.alive) {
          b.action = 'wander'
          b.target = null
          break
        }
        const dx = t.x - b.x
        const dy = t.y - b.y
        const d = Math.hypot(dx, dy) || 1
        if (d < BODY_RADIUS[0] + BODY_RADIUS[1] + 0.15) {
          this.contact(b, t)
          break
        }
        b.chaseTime += dt
        // aim a little ahead of the fleeing blob
        const lead = Math.min(1.2, d / (top + 0.01)) * 0.5
        const ax = dx + t.vx * lead
        const ay = dy + t.vy * lead
        const ad = Math.hypot(ax, ay) || 1
        dvx = (ax / ad) * top
        dvy = (ay / ad) * top
        break
      }
      case 'rest': {
        const home = b.homeTree
        if (home) {
          const dx = home.x - b.x
          const dy = home.y - b.y
          const d = Math.hypot(dx, dy)
          if (d > 3.2) {
            dvx = (dx / d) * top * 0.4
            dvy = (dy / d) * top * 0.4
            break
          }
        }
        // idle bobbing: mostly still, the odd shuffle
        b.wanderAngle += this.rng.normal() * 2.2 * Math.sqrt(dt)
        const shuffle = Math.sin(b.age * 0.9 + b.phase) > 0.55 ? 0.22 : 0
        dvx = Math.cos(b.wanderAngle) * top * shuffle
        dvy = Math.sin(b.wanderAngle) * top * shuffle
        break
      }
      default: {
        // wander / lounge: persistent random walk that curls back from the rim
        b.wanderAngle += this.rng.normal() * 1.6 * Math.sqrt(dt)
        const r = Math.hypot(b.x, b.y)
        if (r > this.radius - 3) {
          const inward = Math.atan2(-b.y, -b.x)
          let diff = inward - b.wanderAngle
          diff = Math.atan2(Math.sin(diff), Math.cos(diff))
          b.wanderAngle += diff * Math.min(1, dt * 2.5)
        }
        const f = b.action === 'lounge' ? 0.25 : b.kind === RED ? 0.5 : 0.45
        dvx = Math.cos(b.wanderAngle) * top * f
        dvy = Math.sin(b.wanderAngle) * top * f
      }
    }

    // soft personal space: blobs sidestep crowds
    if (dvx !== 0 || dvy !== 0) {
      let sx = 0
      let sy = 0
      const rr = 1.5
      this.near(b.x, b.y, rr, b, (o, d2) => {
        if (b.action === 'hunt' && o === b.target) return
        const d = Math.sqrt(d2) || 0.01
        const w = (rr - d) / rr
        sx += ((b.x - o.x) / d) * w
        sy += ((b.y - o.y) / d) * w
      })
      dvx += sx * top * 0.6
      dvy += sy * top * 0.6
      const m = Math.hypot(dvx, dvy)
      if (m > top) {
        dvx = (dvx / m) * top
        dvy = (dvy / m) * top
      }
    }

    // rim: slide along the edge instead of pushing outwards
    const r = Math.hypot(b.x, b.y)
    const edge = this.radius - BODY_RADIUS[b.kind] - 0.4
    if (r > edge - 1.5 && r > 0) {
      const nx = b.x / r
      const ny = b.y / r
      const out = dvx * nx + dvy * ny
      if (out > 0) {
        dvx -= nx * out * 1.1
        dvy -= ny * out * 1.1
      }
    }

    const k = Math.min(1, dt * (b.action === 'flee' || b.action === 'hunt' ? 8 : 5))
    b.vx += (dvx - b.vx) * k
    b.vy += (dvy - b.vy) * k
    b.x += b.vx * dt
    b.y += b.vy * dt
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > 0.15) {
      const want = Math.atan2(b.vy, b.vx)
      let diff = want - b.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      b.heading += diff * Math.min(1, dt * 8)
    } else if (b.action === 'eat' && b.tree) {
      const want = Math.atan2(b.tree.y - b.y, b.tree.x - b.x)
      let diff = want - b.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      b.heading += diff * Math.min(1, dt * 6)
    } else if (b.action === 'hunt' || b.action === 'flee') {
      // keep facing
    }
  }

  private markShelter() {
    for (const b of this.blobs) b.huntedBy = 0
    for (const b of this.blobs) if (b.alive && b.action === 'hunt' && b.target) b.target.huntedBy++
    for (const b of this.blobs) {
      b.sheltered = false
      if (!b.alive || b.kind !== BLUE) continue
      for (const t of this.trees) {
        const r = 1.7 * t.scale
        const dx = b.x - t.x
        const dy = b.y - t.y
        if (dx * dx + dy * dy < r * r) {
          b.sheltered = true
          break
        }
      }
    }
  }

  private reachOf(t: Tree, b: Blob): number {
    return 1.25 * t.scale + BODY_RADIUS[b.kind]
  }

  private wantsToCopy(b: Blob): boolean {
    const at = b.kind === BLUE ? this.params.blueCopyAt : this.params.redCopyAt
    return b.energy >= at && b.copyCooldown <= 0 && b.age > (b.kind === BLUE ? 6 : 8) && b.action !== 'flee'
  }

  private startAction(b: Blob, a: Action, dur: number) {
    b.action = a
    b.actionTime = dur
    b.actionDur = dur
  }

  private finishAction(b: Blob) {
    const a = b.action
    b.actionTime = 0
    if (a === 'eat') {
      const t = b.tree!
      const slot = t.slots[b.slot]
      if (slot.eater === b) {
        slot.state = 3
        slot.g = 0
        slot.timer = this.params.fruitDelay
        slot.eater = null
      }
      b.energy = Math.min(MAX_ENERGY, b.energy + FRUIT_ENERGY)
      b.meals++
      b.glow = 0.5
      b.homeTree = t
      b.slot = -1
      this.totals.fruitEaten++
      this.events.push({ type: 'eat', x: b.x, y: b.y, id: b.id })
      b.action = 'wander'
      b.thinkIn = 0
    } else if (a === 'bud') {
      this.copy(b)
      b.action = b.kind === BLUE && b.homeTree ? 'rest' : 'wander'
      b.thinkIn = 0
    } else if (a === 'pause' || a === 'bump') {
      b.action = 'wander'
      b.thinkIn = 0
    } else if (a === 'startled') {
      b.action = 'wander'
      b.thinkIn = 0
    }
  }

  private copy(parent: Blob) {
    // A copy is made from stored energy; a little is lost in the making.
    const e = parent.energy
    const a = this.rng.range(0, Math.PI * 2)
    const cr = BODY_RADIUS[parent.kind] * 2.1
    let x = parent.x + Math.cos(a) * cr
    let y = parent.y + Math.sin(a) * cr
    const r = Math.hypot(x, y)
    const lim = this.radius - 1
    if (r > lim) {
      x *= lim / r
      y *= lim / r
    }
    const child = this.newBlob(parent.kind, x, y, e * 0.42, parent)
    child.homeTree = parent.homeTree
    child.vx = Math.cos(a) * 1.2
    child.vy = Math.sin(a) * 1.2
    parent.energy = e * 0.48
    parent.children++
    parent.copyCooldown = parent.kind === BLUE ? 4 : 5
    parent.glow = 0.6
    this.blobs.push(child)
    this.totals.births[parent.kind]++
    this.events.push({ type: 'birth', x, y, kind: parent.kind, id: child.id })
  }

  private fade(b: Blob, cause: 'hunger' | 'boop' | 'age') {
    if (b.action === 'eat') this.dropFruit(b)
    b.alive = false
    b.action = 'fade'
    b.fadeT = 0
    b.causeOfFade = cause
    b.target = null
    this.totals.fades[b.kind]++
    if (cause === 'boop') this.totals.fadesByBoop++
    else if (cause === 'hunger') this.totals.fadesByHunger[b.kind]++
    else this.totals.fadesByAge[b.kind]++
    this.events.push({ type: 'fade', x: b.x, y: b.y, kind: b.kind, cause })
  }

  /** Interrupted meal: the blob keeps what it already chewed, the fruit is used up. */
  private dropFruit(b: Blob) {
    const t = b.tree
    if (!t || b.slot < 0) return
    const slot = t.slots[b.slot]
    if (slot.eater === b) {
      const progress = b.actionDur > 0 ? 1 - b.actionTime / b.actionDur : 0
      b.energy = Math.min(MAX_ENERGY, b.energy + FRUIT_ENERGY * Math.max(0, progress) * 0.8)
      slot.state = 3
      slot.g = 0
      slot.timer = this.params.fruitDelay
      slot.eater = null
    }
    b.slot = -1
  }

  private tryEat(b: Blob) {
    const t = b.tree!
    const lim = Math.min(this.params.fruitLimit, MAX_SLOTS)
    // pick the ripe fruit hanging closest to this blob
    let best = -1
    let bestD = Infinity
    for (let s = 0; s < lim; s++) {
      const slot = t.slots[s]
      if (slot.state !== 1) continue
      const a = slotAngle(t.id, s)
      const d = Math.hypot(t.x + Math.cos(a) - b.x, t.y + Math.sin(a) - b.y)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    if (best < 0) {
      b.action = 'wander'
      b.thinkIn = 0
      b.tree = null
      return
    }
    const slot = t.slots[best]
    slot.state = 2
    slot.eater = b
    t.ripe--
    this.ripe--
    b.slot = best
    this.startAction(b, 'eat', this.params.blueEatTime)
    this.events.push({ type: 'bite', x: b.x, y: b.y, treeId: t.id, slot: best, blobId: b.id })
  }

  private contact(red: Blob, blue: Blob) {
    const drained = Math.min(this.params.redContact, blue.energy)
    blue.energy -= drained
    red.energy = Math.min(MAX_ENERGY, red.energy + drained * TUNING.contactEfficiency)
    red.glow = 1.2
    red.target = null
    red.chaseTime = 0
    red.meals++
    this.startAction(red, 'pause', this.params.redPause)
    red.vx *= 0.2
    red.vy *= 0.2
    this.totals.contacts++
    const faded = blue.energy <= 0.5
    this.events.push({ type: 'contact', x: (red.x + blue.x) / 2, y: (red.y + blue.y) / 2, redId: red.id, blueId: blue.id, drained, faded })
    if (faded) {
      this.fade(blue, 'boop')
      return
    }
    if (blue.action === 'eat') this.dropFruit(blue)
    blue.immuneFor = 3
    blue.tree = null
    blue.glow = 0.4
    this.startAction(blue, 'startled', 0.5)
    const dx = blue.x - red.x
    const dy = blue.y - red.y
    const d = Math.hypot(dx, dy) || 1
    blue.fleeX = dx / d
    blue.fleeY = dy / d
    blue.vx = (dx / d) * 1.5
    blue.vy = (dy / d) * 1.5
  }

  private thinkBlue(b: Blob) {
    const vision = this.visionOf(b)
    // 1) any awake red close by?
    let fx = 0
    let fy = 0
    let threats = 0
    let closest = Infinity
    const fear = vision * TUNING.fearFactor
    this.near(b.x, b.y, fear, b, (o, d2) => {
      if (o.kind !== RED || o.action === 'pause' || o.action === 'lounge' || o.action === 'bud') return
      const d = Math.sqrt(d2) || 0.01
      // a red on the prowl is scary from afar; an idle one only up close
      if (o.action !== 'hunt' && d > TUNING.nearFear) return
      fx += (b.x - o.x) / (d * d)
      fy += (b.y - o.y) / (d * d)
      threats++
      closest = Math.min(closest, d)
    })
    if (threats > 0) {
      // under leaves and not spotted yet? keep still instead of running into the open
      if (b.sheltered && closest > TUNING.shelterSpot + 0.6) {
        if (b.action !== 'seek') b.action = 'hide'
        return
      }
      // run away — and if there is a canopy that isn't behind the red, dash for it
      const fl = Math.hypot(fx, fy) || 1
      fx /= fl
      fy /= fl
      let refuge: Tree | null = null
      let refugeD = vision
      for (const t of this.trees) {
        const dx = t.x - b.x
        const dy = t.y - b.y
        const d = Math.hypot(dx, dy)
        if (d >= refugeD || d < 0.01) continue
        if ((dx * fx + dy * fy) / d < -0.1) continue
        refuge = t
        refugeD = d
      }
      b.action = 'flee'
      b.tree = null
      b.fleeX = fx
      b.fleeY = fy
      if (refuge) {
        b.fleeX = fx * 0.6 + ((refuge.x - b.x) / refugeD) * 1.0
        b.fleeY = fy * 0.6 + ((refuge.y - b.y) / refugeD) * 1.0
      }
      return
    }

    // 2) hungry enough to look for fruit?
    if (b.energy < MAX_ENERGY - FRUIT_ENERGY * 0.3) {
      if (b.action === 'seek' && b.tree && b.tree.ripe > 0) return
      let best: Tree | null = null
      let bestScore = -Infinity
      for (const t of this.trees) {
        const d = Math.hypot(t.x - b.x, t.y - b.y)
        if (d > vision + 1.2 * t.scale || t.ripe <= 0) continue
        // prefer close trees with fruit to spare; dodge crowded ones
        const spare = t.ripe - t.visitors
        const score = Math.min(spare, 3) * 1.0 - Math.max(0, -spare) * 0.8 - (d / vision) * 2.2
        if (score > bestScore) {
          bestScore = score
          best = t
        }
      }
      if (best && bestScore > -2.5) {
        b.action = 'seek'
        b.tree = best
        return
      }
      // nothing in sight: with energy to spare, wait by the last good tree for
      // it to regrow; when running low, go exploring instead
      b.tree = null
      if (b.homeTree && b.energy > 55) {
        if (b.action !== 'rest' && this.rng.next() < 0.1) b.action = 'rest'
        else if (b.action !== 'rest') b.action = 'wander'
      } else {
        b.action = 'wander'
      }
      return
    }

    // 3) full: hang around a tree
    b.tree = null
    b.action = b.homeTree ? 'rest' : 'wander'
  }

  private thinkRed(b: Blob) {
    if (b.energy > MAX_ENERGY * 0.92) {
      b.action = 'lounge'
      b.target = null
      return
    }
    if (b.action === 'lounge') b.action = 'wander'
    // reds get in each other's way: crowded reds stop for a little squabble
    if (TUNING.bumpChance > 0) {
      let rival: Blob | null = null
      this.near(b.x, b.y, TUNING.bumpRadius, b, (o) => {
        if (o.kind === RED && o.action !== 'pause' && o.action !== 'bud') rival = o
      })
      if (rival && this.rng.next() < TUNING.bumpChance) {
        const r = rival as Blob
        b.target = null
        b.chaseTime = 0
        this.startAction(b, 'bump', 1.2)
        b.heading = Math.atan2(r.y - b.y, r.x - b.x)
        return
      }
    }
    const vision = this.visionOf(b)
    if (b.action === 'hunt' && b.target) {
      const t = b.target
      const d = Math.hypot(t.x - b.x, t.y - b.y)
      const hidden = t.sheltered && d > TUNING.shelterSpot
      if (t.alive && !hidden && d < vision * 1.25 && b.chaseTime < TUNING.chaseLimit && t.immuneFor <= 0) return
      if (b.chaseTime >= TUNING.chaseLimit || hidden) b.giveUpFor = hidden ? 1 : 2.5
      b.target = null
      b.action = 'wander'
      b.chaseTime = 0
    }
    if (b.giveUpFor > 0) return
    let best: Blob | null = null
    let bestD = Infinity
    this.near(b.x, b.y, vision, b, (o, d2) => {
      if (o.kind !== BLUE || o.immuneFor > 0 || o.huntedBy > 0) return
      if (o.sheltered && d2 > TUNING.shelterSpot * TUNING.shelterSpot) return
      if (d2 < bestD) {
        bestD = d2
        best = o
      }
    })
    if (best) {
      b.action = 'hunt'
      b.target = best
      b.chaseTime = 0
    } else {
      b.action = 'wander'
    }
  }

  private resolveOverlaps() {
    const blobs = this.blobs
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i]
      if (!b.alive) continue
      const rb = BODY_RADIUS[b.kind] * this.sizeOf(b)
      this.near(b.x, b.y, 1.1, b, (o, d2) => {
        if (o.id < b.id) return
        const ro = BODY_RADIUS[o.kind] * this.sizeOf(o)
        const min = (rb + ro) * 0.92
        if (d2 >= min * min) return
        const d = Math.sqrt(d2) || 0.001
        const push = (min - d) * 0.5
        const nx = d2 > 0 ? (o.x - b.x) / d : 1
        const ny = d2 > 0 ? (o.y - b.y) / d : 0
        const bm = b.action === 'eat' || b.action === 'pause' ? 0.3 : 1
        const om = o.action === 'eat' || o.action === 'pause' ? 0.3 : 1
        const tot = bm + om
        b.x -= nx * push * (2 * bm) / tot
        b.y -= ny * push * (2 * bm) / tot
        o.x += nx * push * (2 * om) / tot
        o.y += ny * push * (2 * om) / tot
      })
      // trunks are solid
      for (const t of this.trees) {
        const dx = b.x - t.x
        const dy = b.y - t.y
        const min = 0.45 * t.scale + rb
        const d2 = dx * dx + dy * dy
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 0.001
          b.x = t.x + (dx / d) * min
          b.y = t.y + (dy / d) * min
        }
      }
      const r = Math.hypot(b.x, b.y)
      const lim = this.radius - rb - 0.3
      if (r > lim) {
        b.x *= lim / r
        b.y *= lim / r
      }
    }
  }

  /** Newborns start small and grow into full size. */
  sizeOf(b: Blob): number {
    return Math.min(1, 0.6 + b.age * 0.05)
  }

  // ---------------------------------------------------------------- stats

  private recount() {
    let nb = 0
    let nr = 0
    for (const b of this.blobs) {
      if (!b.alive) continue
      if (b.kind === BLUE) nb++
      else nr++
    }
    this.counts = [nb, nr]
  }

  private record() {
    let bs = 0
    let bv = 0
    let rs = 0
    let rv = 0
    let be = 0
    let re = 0
    for (const b of this.blobs) {
      if (!b.alive) continue
      if (b.kind === BLUE) {
        bs += b.speedGene
        bv += b.visionGene
        be += b.energy
      } else {
        rs += b.speedGene
        rv += b.visionGene
        re += b.energy
      }
    }
    const [nb, nr] = this.counts
    this.history.push({
      t: this.t,
      fruit: this.ripe,
      cap: this.fruitCapacity,
      blue: nb,
      red: nr,
      blueSpeed: nb ? bs / nb : NaN,
      blueVision: nb ? bv / nb : NaN,
      redSpeed: nr ? rs / nr : NaN,
      redVision: nr ? rv / nr : NaN,
      blueEnergy: nb ? be / nb : NaN,
      redEnergy: nr ? re / nr : NaN,
    })
  }

  findBlob(id: number): Blob | undefined {
    return this.blobs.find((b) => b.id === id)
  }
}

/** Where on the canopy a fruit stem sits (shared by sim + renderer). */
export function slotAngle(treeId: number, s: number): number {
  return s * 2.39996 + treeId * 1.7
}
