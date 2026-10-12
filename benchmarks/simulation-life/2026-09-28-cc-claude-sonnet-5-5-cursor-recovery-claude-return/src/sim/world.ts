import { Rng } from './rng'
import type { Params } from './params'

export const BLUE = 0
export const RED = 1
export type Kind = 0 | 1

export const C = {
  DT: 1 / 30,
  MAX_ENERGY: 100,
  FRUIT_ENERGY: 42,
  IDLE_FRAC: 0.35,
  VISION_COST: 0.02,
  BLUE_REF_SPEED: 2.4,
  RED_REF_SPEED: 2.8,
  FEAR: 4.9,
  FLEE_MULT: 1.09,
  HUNT_MULT: 1.0,
  CONTACT_DIST: 1.25,
  IMMUNE: 5.8,
  STUN: 0.9,
  PANIC: 2.5,
  EFFICIENCY: 0.98,
  DRAIN_FRAC: 0.55,
  MATURE_AGE: 8,
  FADE: 1.2,
  MAX_BLUE: 420,
  MAX_RED: 240,
  MAX_SLOTS: 14,
  SAMPLE_CAP: 2400,
}

export type Action =
  | 'wander'
  | 'rest'
  | 'seek'
  | 'search'
  | 'gather'
  | 'flee'
  | 'spread'
  | 'eat'
  | 'hunt'
  | 'pause'
  | 'stunned'
  | 'fading'

export interface Tree {
  id: number
  x: number
  y: number
  scale: number
  fruit: number
  progress: number
  cool: number
  claims: number
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
  action: Action
  actionTime: number
  timer: number
  timerMax: number
  decideIn: number
  wander: number
  dirX: number
  dirY: number
  goalX: number
  goalY: number
  targetTree: number
  targetBlob: number
  memTree: number
  claimed: boolean
  eatTree: number
  eatSlot: number
  panic: number
  immune: number
  speedGene: number
  visionGene: number
  sociable: number
  gen: number
  parent: number
  kids: number
  meals: number
  contacts: number
  bornAt: number
  dead: boolean
  fade: number
  deathCause: string
  justBorn: number
}

export type SimEvent =
  | { type: 'eat'; blob: number; tree: number; slot: number }
  | { type: 'eatDone'; blob: number }
  | { type: 'contact'; blue: number; red: number; amount: number }
  | { type: 'birth'; blob: number; parent: number }
  | { type: 'death'; blob: number; kind: Kind; cause: string }

export interface Sample {
  t: number
  fruit: number
  blue: number
  red: number
  blueEnergy: number
  redEnergy: number
  blueSpeed: number
  blueVision: number
  redSpeed: number
  redVision: number
}

export interface Stats {
  blueBorn: number
  blueStarved: number
  blueDrained: number
  redBorn: number
  redStarved: number
  fruitEaten: number
  contacts: number
  energyDrained: number
  peakBlue: number
  peakRed: number
  maxGen: number
}

const SYLL_A = ['Bi', 'Mo', 'Pip', 'Lu', 'Zo', 'Fi', 'Tu', 'Ka', 'Ne', 'Wu', 'Jo', 'Pa', 'Dum', 'Co', 'Bo', 'Mi', 'Su', 'Ta']
const SYLL_B = ['bble', 'mo', 'pin', 'lo', 'zy', 'bo', 'ti', 'ko', 'ni', 'mu', 'ji', 'po', 'bles', 'ffy', 'nk', 'ppy', 'zu', 'lly']

function makeName(id: number): string {
  const a = SYLL_A[(id * 7 + 3) % SYLL_A.length]
  const b = SYLL_B[(id * 13 + Math.floor(id / SYLL_A.length)) % SYLL_B.length]
  return a + b
}

class Grid {
  private cell: number
  private n: number
  private half: number
  private cells: Blob[][]

  constructor(radius: number, cell: number) {
    this.cell = cell
    this.half = radius + 3
    this.n = Math.ceil((this.half * 2) / cell)
    this.cells = Array.from({ length: this.n * this.n }, () => [])
  }

  clear() {
    for (const c of this.cells) c.length = 0
  }

  private ix(v: number) {
    const i = Math.floor((v + this.half) / this.cell)
    return i < 0 ? 0 : i >= this.n ? this.n - 1 : i
  }

  add(b: Blob) {
    this.cells[this.ix(b.y) * this.n + this.ix(b.x)].push(b)
  }

  query(x: number, y: number, r: number, out: Blob[]) {
    out.length = 0
    const x0 = this.ix(x - r)
    const x1 = this.ix(x + r)
    const y0 = this.ix(y - r)
    const y1 = this.ix(y + r)
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const c = this.cells[j * this.n + i]
        for (let k = 0; k < c.length; k++) out.push(c[k])
      }
    }
  }
}

function angleLerp(a: number, b: number, t: number): number {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export class World {
  params: Params
  rng: Rng
  t = 0
  radius = 26
  trees: Tree[] = []
  blobs: Blob[] = []
  byId = new Map<number, Blob>()
  history: Sample[] = []
  stats!: Stats
  events: SimEvent[] = []
  emit = true
  blueCount = 0
  redCount = 0
  fruitCount = 0
  sampleEvery = 1

  private nextId = 1
  private nextSample = 0
  private blueGrid!: Grid
  private redGrid!: Grid
  private near: Blob[] = []
  private near2: Blob[] = []
  private births: Blob[] = []

  constructor(params: Params) {
    this.params = { ...params }
    this.rng = new Rng(params.seed)
    this.init()
  }

  reset(params?: Params) {
    if (params) this.params = { ...params }
    this.rng = new Rng(this.params.seed)
    this.init()
  }

  private init() {
    const p = this.params
    this.t = 0
    this.radius = p.worldSize
    this.trees = []
    this.blobs = []
    this.byId.clear()
    this.history = []
    this.events = []
    this.nextId = 1
    this.nextSample = 0
    this.sampleEvery = 1
    this.stats = {
      blueBorn: 0,
      blueStarved: 0,
      blueDrained: 0,
      redBorn: 0,
      redStarved: 0,
      fruitEaten: 0,
      contacts: 0,
      energyDrained: 0,
      peakBlue: 0,
      peakRed: 0,
      maxGen: 0,
    }
    this.blueGrid = new Grid(this.radius, 5)
    this.redGrid = new Grid(this.radius, 5)
    this.placeTrees()
    for (let i = 0; i < p.startBlue; i++) this.spawnStarter(BLUE)
    for (let i = 0; i < p.startRed; i++) this.spawnStarter(RED)
    this.countAll()
    this.record()
  }

  private placeTrees() {
    const p = this.params
    const R = this.radius
    const usable = R - 3.6
    let minDist = 0.78 * Math.sqrt((Math.PI * usable * usable) / Math.max(1, p.trees))
    for (let i = 0; i < p.trees; i++) {
      let best: { x: number; y: number } | null = null
      for (let attempt = 0; attempt < 90; attempt++) {
        const a = this.rng.next() * Math.PI * 2
        const r = Math.sqrt(this.rng.next()) * usable
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        let ok = true
        for (const t of this.trees) {
          if (Math.hypot(t.x - x, t.y - y) < minDist) {
            ok = false
            break
          }
        }
        if (ok) {
          best = { x, y }
          break
        }
        if (attempt % 30 === 29) minDist *= 0.88
      }
      if (!best) {
        const a = this.rng.next() * Math.PI * 2
        const r = Math.sqrt(this.rng.next()) * usable
        best = { x: Math.cos(a) * r, y: Math.sin(a) * r }
      }
      this.trees.push({
        id: i,
        x: best.x,
        y: best.y,
        scale: this.rng.range(0.85, 1.2),
        fruit: Math.round(p.fruitLimit * this.rng.range(0.4, 0.9)),
        progress: this.rng.next() * 0.8,
        cool: 0,
        claims: 0,
      })
    }
  }

  private randomSpot(): { x: number; y: number } {
    const R = this.radius - 2
    for (let i = 0; i < 20; i++) {
      const a = this.rng.next() * Math.PI * 2
      const r = Math.sqrt(this.rng.next()) * R
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      let ok = true
      for (const t of this.trees) {
        if (Math.hypot(t.x - x, t.y - y) < 1.8) {
          ok = false
          break
        }
      }
      if (ok) return { x, y }
    }
    return { x: 0, y: 0 }
  }

  private makeBlob(kind: Kind, x: number, y: number, energy: number, parent: Blob | null): Blob {
    const id = this.nextId++
    const m = this.params.mutation
    const clampGene = (g: number) => Math.min(1.6, Math.max(0.6, g))
    const sg = parent ? clampGene(parent.speedGene * (1 + this.rng.gauss() * m)) : 1 + this.rng.gauss() * m * 0.6
    const vg = parent ? clampGene(parent.visionGene * (1 + this.rng.gauss() * m)) : 1 + this.rng.gauss() * m * 0.6
    const heading = this.rng.next() * Math.PI * 2
    const b: Blob = {
      id,
      kind,
      name: makeName(id),
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      heading,
      energy,
      age: 0,
      action: 'wander',
      actionTime: 0,
      timer: 0,
      timerMax: 0,
      decideIn: this.rng.next() * 0.3,
      wander: heading,
      dirX: 0,
      dirY: 0,
      goalX: 0,
      goalY: 0,
      targetTree: -1,
      targetBlob: -1,
      memTree: -1,
      claimed: false,
      eatTree: -1,
      eatSlot: 0,
      panic: 0,
      immune: 0,
      speedGene: clampGene(sg),
      visionGene: clampGene(vg),
      sociable: this.rng.next(),
      gen: parent ? parent.gen + 1 : 0,
      parent: parent ? parent.id : 0,
      kids: 0,
      meals: 0,
      contacts: 0,
      bornAt: this.t,
      dead: false,
      fade: 0,
      deathCause: '',
      justBorn: 0,
    }
    this.blobs.push(b)
    this.byId.set(id, b)
    return b
  }

  private spawnStarter(kind: Kind) {
    const s = this.randomSpot()
    const e = kind === BLUE ? this.rng.range(45, 85) : this.rng.range(50, 85)
    const b = this.makeBlob(kind, s.x, s.y, e, null)
    b.age = this.rng.range(0, 30)
  }

  private countAll() {
    let bl = 0
    let rd = 0
    for (const b of this.blobs) {
      if (b.dead) continue
      if (b.kind === BLUE) bl++
      else rd++
    }
    let f = 0
    for (const t of this.trees) f += t.fruit
    this.blueCount = bl
    this.redCount = rd
    this.fruitCount = f
  }

  private setAction(b: Blob, a: Action, timer = 0) {
    if (b.action !== a) {
      b.action = a
      b.actionTime = 0
    }
    b.timer = timer
    b.timerMax = timer
  }

  private releaseClaim(b: Blob) {
    if (b.claimed && b.targetTree >= 0) {
      const t = this.trees[b.targetTree]
      if (t && t.claims > 0) t.claims--
    }
    b.claimed = false
  }

  private kill(b: Blob, cause: string) {
    if (b.dead) return
    this.releaseClaim(b)
    b.dead = true
    b.fade = 0
    b.deathCause = cause
    b.action = 'fading'
    b.actionTime = 0
    b.timer = 0
    const s = this.stats
    if (b.kind === BLUE) {
      if (cause === 'drained') s.blueDrained++
      else s.blueStarved++
    } else s.redStarved++
    if (this.emit) this.events.push({ type: 'death', blob: b.id, kind: b.kind, cause })
  }

  step() {
    const dt = C.DT
    this.t += dt
    this.growTrees(dt)
    this.blueGrid.clear()
    this.redGrid.clear()
    for (const b of this.blobs) {
      if (b.dead) continue
      if (b.kind === BLUE) this.blueGrid.add(b)
      else this.redGrid.add(b)
    }
    const list = this.blobs
    const n = list.length
    for (let i = 0; i < n; i++) {
      const b = list[i]
      if (b.dead) {
        b.fade += dt
        continue
      }
      this.updateBlob(b, dt)
    }
    if (this.births.length) {
      for (const parent of this.births) this.spawnChild(parent)
      this.births.length = 0
    }
    let w = 0
    for (let i = 0; i < this.blobs.length; i++) {
      const b = this.blobs[i]
      if (b.dead && b.fade > C.FADE) {
        this.byId.delete(b.id)
        continue
      }
      this.blobs[w++] = b
    }
    this.blobs.length = w
    this.countAll()
    if (this.blueCount > this.stats.peakBlue) this.stats.peakBlue = this.blueCount
    if (this.redCount > this.stats.peakRed) this.stats.peakRed = this.redCount
    if (this.t >= this.nextSample) this.record()
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400)
  }

  private growTrees(dt: number) {
    const p = this.params
    for (const t of this.trees) {
      if (t.fruit > p.fruitLimit) t.fruit = p.fruitLimit
      if (t.cool > 0) {
        t.cool -= dt
      } else if (t.fruit < p.fruitLimit) {
        t.progress += p.fruitGrowth * dt
        if (t.progress >= 1) {
          t.fruit++
          t.progress = 0
        }
      } else {
        t.progress = 0
      }
    }
  }

  private record() {
    let bl = 0
    let rd = 0
    let be = 0
    let re = 0
    let bs = 0
    let bv = 0
    let rs = 0
    let rv = 0
    const p = this.params
    for (const b of this.blobs) {
      if (b.dead) continue
      if (b.kind === BLUE) {
        bl++
        be += b.energy
        bs += b.speedGene
        bv += b.visionGene
      } else {
        rd++
        re += b.energy
        rs += b.speedGene
        rv += b.visionGene
      }
    }
    let f = 0
    for (const t of this.trees) f += t.fruit
    const sample: Sample = {
      t: this.t,
      fruit: f,
      blue: bl,
      red: rd,
      blueEnergy: bl ? be / bl : 0,
      redEnergy: rd ? re / rd : 0,
      blueSpeed: bl ? (bs / bl) * p.blueSpeed : 0,
      blueVision: bl ? (bv / bl) * p.blueVision : 0,
      redSpeed: rd ? (rs / rd) * p.redSpeed : 0,
      redVision: rd ? (rv / rd) * p.redVision : 0,
    }
    this.history.push(sample)
    this.nextSample = this.t + this.sampleEvery
    if (this.history.length > C.SAMPLE_CAP) {
      this.history = this.history.filter((_, i) => i % 2 === 0)
      this.sampleEvery *= 2
    }
  }

  private updateBlob(b: Blob, dt: number) {
    const p = this.params
    const isBlue = b.kind === BLUE
    b.px = b.x
    b.py = b.y
    b.age += dt
    b.actionTime += dt
    if (b.justBorn > 0) b.justBorn -= dt
    if (b.immune > 0) b.immune -= dt
    if (b.panic > 0) b.panic -= dt

    const speed = Math.hypot(b.vx, b.vy)
    const ref = isBlue ? C.BLUE_REF_SPEED : C.RED_REF_SPEED
    const use = isBlue ? p.blueUse : p.redUse
    const vision = (isBlue ? p.blueVision : p.redVision) * b.visionGene
    const rel = speed / ref
    const cost = use * (C.IDLE_FRAC + (1 - C.IDLE_FRAC) * Math.min(rel * rel, 4) + C.VISION_COST * vision)
    b.energy -= cost * dt
    if (b.energy <= 0) {
      b.energy = 0
      this.kill(b, 'starved')
      return
    }

    if (b.timer > 0) {
      b.timer -= dt
      if (b.timer <= 0) {
        b.timer = 0
        this.finishAction(b)
      }
    }

    b.decideIn -= dt
    if (b.decideIn <= 0 && b.action !== 'eat' && b.action !== 'pause' && b.action !== 'stunned') {
      b.decideIn = 0.25 + this.rng.next() * 0.2
      if (isBlue) this.decideBlue(b)
      else this.decideRed(b)
    }

    this.steer(b, dt)

    const copy = isBlue ? p.blueCopy : p.redCopy
    if (
      b.energy >= copy &&
      b.age >= C.MATURE_AGE &&
      b.action !== 'eat' &&
      b.action !== 'pause' &&
      b.action !== 'stunned'
    ) {
      const cap = isBlue ? C.MAX_BLUE : C.MAX_RED
      const count = isBlue ? this.blueCount + this.pendingBirths(BLUE) : this.redCount + this.pendingBirths(RED)
      if (count < cap) {
        b.energy -= copy * 0.5
        this.births.push(b)
      }
    }
  }

  private pendingBirths(kind: Kind): number {
    let n = 0
    for (const b of this.births) if (b.kind === kind) n++
    return n
  }

  private spawnChild(parent: Blob) {
    const copy = parent.kind === BLUE ? this.params.blueCopy : this.params.redCopy
    const a = this.rng.next() * Math.PI * 2
    let x = parent.x + Math.cos(a) * 1.0
    let y = parent.y + Math.sin(a) * 1.0
    const r = Math.hypot(x, y)
    const lim = this.radius - 1
    if (r > lim) {
      x = (x / r) * lim
      y = (y / r) * lim
    }
    const child = this.makeBlob(parent.kind, x, y, copy * 0.4, parent)
    child.justBorn = 0.9
    child.vx = Math.cos(a) * 1.5
    child.vy = Math.sin(a) * 1.5
    this.setAction(child, 'rest', 0.6)
    parent.kids++
    if (parent.kind === BLUE) this.stats.blueBorn++
    else this.stats.redBorn++
    if (child.gen > this.stats.maxGen) this.stats.maxGen = child.gen
    if (this.emit) this.events.push({ type: 'birth', blob: child.id, parent: parent.id })
  }

  private finishAction(b: Blob) {
    switch (b.action) {
      case 'eat': {
        b.energy = Math.min(C.MAX_ENERGY, b.energy + C.FRUIT_ENERGY)
        b.meals++
        this.stats.fruitEaten++
        if (this.emit) this.events.push({ type: 'eatDone', blob: b.id })
        this.setAction(b, 'rest', 0.35)
        b.decideIn = 0.35
        break
      }
      case 'stunned':
        b.panic = Math.max(b.panic, C.PANIC)
        b.action = 'flee'
        b.actionTime = 0
        b.decideIn = 0
        break
      case 'pause':
        b.action = 'wander'
        b.actionTime = 0
        b.decideIn = 0
        break
      default:
        b.action = 'wander'
        b.actionTime = 0
        b.decideIn = 0
    }
  }

  private decideBlue(b: Blob) {
    const p = this.params
    const vision = p.blueVision * b.visionGene
    const fear = Math.min(vision, C.FEAR)

    let fx = 0
    let fy = 0
    let threat = false
    this.redGrid.query(b.x, b.y, fear, this.near)
    for (const r of this.near) {
      const dx = b.x - r.x
      const dy = b.y - r.y
      const d = Math.hypot(dx, dy)
      if (d < fear && d > 0.001) {
        const w = 1 / (d * d)
        fx += (dx / d) * w
        fy += (dy / d) * w
        threat = true
      }
    }
    if (!threat && b.panic > 0) {
      fx = b.goalX
      fy = b.goalY
      threat = true
    }
    if (threat) {
      const m = Math.hypot(fx, fy) || 1
      b.dirX = fx / m
      b.dirY = fy / m
      this.releaseClaim(b)
      b.targetTree = -1
      this.setAction(b, 'flee')
      return
    }

    if (b.action === 'rest' && b.timer > 0) return
    if (b.action === 'spread' && b.timer > 0) return
    if (b.action === 'flee') this.setAction(b, 'wander')

    const eatBelow = Math.min(99, Math.max(80, p.blueCopy + 3))
    const hungry = b.energy < eatBelow

    if (hungry) {
      if (b.targetTree >= 0 && b.action === 'seek') {
        const t = this.trees[b.targetTree]
        if (t.fruit > 0) return
        this.releaseClaim(b)
      }
      const pick = this.pickTree(b, vision)
      if (pick >= 0) {
        this.releaseClaim(b)
        b.targetTree = pick
        this.trees[pick].claims++
        b.claimed = true
        b.memTree = pick
        this.setAction(b, 'seek')
        return
      }
      this.releaseClaim(b)
      b.targetTree = -1
      if (b.memTree >= 0) {
        const t = this.trees[b.memTree]
        const d = Math.hypot(t.x - b.x, t.y - b.y)
        if (d > vision * 0.7) {
          b.goalX = t.x
          b.goalY = t.y
          this.setAction(b, 'search')
          return
        }
        b.memTree = -1
      }
      this.beWander(b, false)
      return
    }

    this.releaseClaim(b)
    b.targetTree = -1

    this.blueGrid.query(b.x, b.y, 3.2, this.near)
    let crowd = 0
    let cx = 0
    let cy = 0
    for (const o of this.near) {
      if (o === b) continue
      const d = Math.hypot(o.x - b.x, o.y - b.y)
      if (d < 3.2) {
        crowd++
        cx += o.x
        cy += o.y
      }
    }
    if (crowd >= 5) {
      cx /= crowd
      cy /= crowd
      const dx = b.x - cx
      const dy = b.y - cy
      const m = Math.hypot(dx, dy) || 1
      b.dirX = dx / m
      b.dirY = dy / m
      this.setAction(b, 'spread', 1.2 + this.rng.next() * 1.4)
      return
    }

    if (b.sociable > 0.35) {
      let bi = -1
      let bd = vision * 1.4
      for (let i = 0; i < this.trees.length; i++) {
        const t = this.trees[i]
        const d = Math.hypot(t.x - b.x, t.y - b.y)
        if (d < bd) {
          bd = d
          bi = i
        }
      }
      if (bi >= 0) {
        const t = this.trees[bi]
        if (bd > 3.6) {
          const a = this.rng.next() * Math.PI * 2
          const rr = this.rng.range(2.2, 3.4)
          b.goalX = t.x + Math.cos(a) * rr
          b.goalY = t.y + Math.sin(a) * rr
          this.setAction(b, 'gather')
          return
        }
        if (this.rng.chance(0.5)) {
          this.setAction(b, 'rest', this.rng.range(1, 3))
          return
        }
      }
    }
    this.beWander(b, true)
  }

  private beWander(b: Blob, canRest: boolean) {
    if (canRest && this.rng.chance(0.22)) {
      this.setAction(b, 'rest', this.rng.range(0.7, 2.2))
      return
    }
    if (b.action !== 'wander') {
      this.setAction(b, 'wander')
      b.wander = this.rng.next() * Math.PI * 2
    }
  }

  private pickTree(b: Blob, vision: number): number {
    let best = -1
    let bestScore = Infinity
    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i]
      const mine = b.claimed && b.targetTree === i ? 1 : 0
      if (t.fruit - t.claims + mine < 1) continue
      const d = Math.hypot(t.x - b.x, t.y - b.y)
      if (d > vision + 1.8) continue
      const score = d + 0.8 * (t.claims - mine)
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    }
    return best
  }

  private decideRed(b: Blob) {
    const p = this.params
    if (b.action === 'rest' && b.timer > 0) return
    const vision = p.redVision * b.visionGene

    let target: Blob | undefined
    if (b.targetBlob >= 0) {
      const t = this.byId.get(b.targetBlob)
      if (t && !t.dead && t.immune <= 0 && Math.hypot(t.x - b.x, t.y - b.y) < vision * 1.2) target = t
    }
    if (!target) {
      this.blueGrid.query(b.x, b.y, vision, this.near2)
      let bd = vision
      for (const o of this.near2) {
        if (o.dead || o.immune > 0) continue
        const d = Math.hypot(o.x - b.x, o.y - b.y)
        if (d < bd) {
          bd = d
          target = o
        }
      }
    }
    if (target) {
      b.targetBlob = target.id
      this.setAction(b, 'hunt')
      return
    }
    b.targetBlob = -1
    const hungry = b.energy < 40
    if (b.action === 'hunt') this.setAction(b, 'wander')
    this.beWander(b, !hungry)
  }

  private steer(b: Blob, dt: number) {
    const p = this.params
    const isBlue = b.kind === BLUE
    const maxSpeed = (isBlue ? p.blueSpeed : p.redSpeed) * b.speedGene
    let tx = 0
    let ty = 0
    let sp = 0

    switch (b.action) {
      case 'wander': {
        b.wander += (this.rng.next() + this.rng.next() - 1) * 3.2 * dt
        tx = Math.cos(b.wander)
        ty = Math.sin(b.wander)
        sp = maxSpeed * 0.55
        break
      }
      case 'seek': {
        const t = b.targetTree >= 0 ? this.trees[b.targetTree] : null
        if (!t) {
          this.setAction(b, 'wander')
          break
        }
        const dx = t.x - b.x
        const dy = t.y - b.y
        const d = Math.hypot(dx, dy)
        const reach = 1.35 + 0.55 * t.scale
        if (d <= reach) {
          this.startEating(b, t)
        } else {
          tx = dx / d
          ty = dy / d
          sp = maxSpeed
        }
        break
      }
      case 'search': {
        const dx = b.goalX - b.x
        const dy = b.goalY - b.y
        const d = Math.hypot(dx, dy) || 1
        tx = dx / d
        ty = dy / d
        sp = maxSpeed * 0.9
        break
      }
      case 'gather': {
        const dx = b.goalX - b.x
        const dy = b.goalY - b.y
        const d = Math.hypot(dx, dy) || 1
        if (d < 0.7) {
          this.setAction(b, 'rest', this.rng.range(1.2, 3.5))
        } else {
          tx = dx / d
          ty = dy / d
          sp = maxSpeed * 0.6
        }
        break
      }
      case 'flee': {
        tx = b.dirX
        ty = b.dirY
        sp = maxSpeed * C.FLEE_MULT
        break
      }
      case 'spread': {
        tx = b.dirX
        ty = b.dirY
        sp = maxSpeed * 0.7
        break
      }
      case 'hunt': {
        const t = this.byId.get(b.targetBlob)
        if (!t || t.dead || t.immune > 0) {
          b.targetBlob = -1
          b.decideIn = 0
          this.setAction(b, 'wander')
          break
        }
        const dx = t.x + t.vx * 0.25 - b.x
        const dy = t.y + t.vy * 0.25 - b.y
        const d = Math.hypot(dx, dy) || 1
        const real = Math.hypot(t.x - b.x, t.y - b.y)
        if (real <= C.CONTACT_DIST) {
          this.contact(b, t)
        } else {
          tx = dx / d
          ty = dy / d
          sp = maxSpeed * C.HUNT_MULT
        }
        break
      }
      default:
        sp = 0
    }

    let vx = tx * sp
    let vy = ty * sp

    const r = Math.hypot(b.x, b.y)
    const soft = this.radius - 4
    if (r > soft && r > 0.001) {
      const push = Math.min(1, (r - soft) / 3) * maxSpeed * 1.4
      vx -= (b.x / r) * push
      vy -= (b.y / r) * push
      if (b.action === 'wander') {
        b.wander = angleLerp(b.wander, Math.atan2(-b.y, -b.x), 0.06)
      }
    }

    const grid = isBlue ? this.blueGrid : this.redGrid
    grid.query(b.x, b.y, 1.3, this.near)
    for (const o of this.near) {
      if (o === b || o.dead) continue
      const dx = b.x - o.x
      const dy = b.y - o.y
      const d2 = dx * dx + dy * dy
      if (d2 < 1.3 * 1.3 && d2 > 1e-6) {
        const d = Math.sqrt(d2)
        const w = (1.3 - d) / 1.3
        vx += (dx / d) * w * 2.2
        vy += (dy / d) * w * 2.2
      }
    }

    for (const t of this.trees) {
      const dx = b.x - t.x
      const dy = b.y - t.y
      const d2 = dx * dx + dy * dy
      const lim = 1.15 * t.scale
      if (d2 < lim * lim && d2 > 1e-6) {
        const d = Math.sqrt(d2)
        b.x = t.x + (dx / d) * lim
        b.y = t.y + (dy / d) * lim
      }
    }

    const k = 1 - Math.exp(-dt / 0.22)
    b.vx += (vx - b.vx) * k
    b.vy += (vy - b.vy) * k
    const s = Math.hypot(b.vx, b.vy)
    const cap = maxSpeed * 1.4
    if (s > cap) {
      b.vx = (b.vx / s) * cap
      b.vy = (b.vy / s) * cap
    }
    b.x += b.vx * dt
    b.y += b.vy * dt

    const rr = Math.hypot(b.x, b.y)
    const lim = this.radius - 0.9
    if (rr > lim) {
      b.x = (b.x / rr) * lim
      b.y = (b.y / rr) * lim
      const nx = b.x / rr
      const ny = b.y / rr
      const vn = b.vx * nx + b.vy * ny
      if (vn > 0) {
        b.vx -= nx * vn
        b.vy -= ny * vn
      }
    }

    if (b.action === 'eat' && b.eatTree >= 0) {
      const t = this.trees[b.eatTree]
      b.heading = angleLerp(b.heading, Math.atan2(t.y - b.y, t.x - b.x), 1 - Math.exp(-dt * 8))
    } else if (b.action === 'pause' && b.targetBlob >= 0) {
      const t = this.byId.get(b.targetBlob)
      if (t) b.heading = angleLerp(b.heading, Math.atan2(t.y - b.y, t.x - b.x), 1 - Math.exp(-dt * 6))
    } else if (s > 0.25) {
      b.heading = angleLerp(b.heading, Math.atan2(b.vy, b.vx), 1 - Math.exp(-dt * 9))
    }
  }

  private startEating(b: Blob, t: Tree) {
    if (t.fruit <= 0) {
      this.releaseClaim(b)
      b.targetTree = -1
      b.decideIn = 0
      this.setAction(b, 'wander')
      return
    }
    if (b.claimed && t.claims > 0) t.claims--
    b.claimed = false
    t.fruit--
    t.cool = Math.max(t.cool, this.params.fruitDelay)
    t.progress = 0
    b.eatTree = t.id
    b.eatSlot = t.fruit
    b.targetTree = -1
    this.setAction(b, 'eat', this.params.blueEatTime)
    b.vx *= 0.2
    b.vy *= 0.2
    if (this.emit) this.events.push({ type: 'eat', blob: b.id, tree: t.id, slot: t.fruit })
  }

  private contact(red: Blob, blue: Blob) {
    const p = this.params
    if (blue.action === 'eat') {
      blue.energy = Math.min(C.MAX_ENERGY, blue.energy + C.FRUIT_ENERGY)
      blue.meals++
      this.stats.fruitEaten++
    }
    const amount = Math.min(p.redStrength, blue.energy * C.DRAIN_FRAC)
    blue.energy -= amount
    red.energy = Math.min(C.MAX_ENERGY, red.energy + amount * C.EFFICIENCY)
    red.contacts++
    this.stats.contacts++
    this.stats.energyDrained += amount

    blue.immune = C.IMMUNE
    blue.goalX = blue.x - red.x
    blue.goalY = blue.y - red.y
    const gm = Math.hypot(blue.goalX, blue.goalY) || 1
    blue.goalX /= gm
    blue.goalY /= gm
    blue.dirX = blue.goalX
    blue.dirY = blue.goalY
    blue.vx += blue.goalX * 3
    blue.vy += blue.goalY * 3
    this.releaseClaim(blue)
    blue.targetTree = -1
    blue.eatTree = -1
    this.setAction(blue, 'stunned', C.STUN)
    if (this.emit) this.events.push({ type: 'contact', blue: blue.id, red: red.id, amount })

    red.targetBlob = blue.id
    red.vx *= 0.1
    red.vy *= 0.1
    this.setAction(red, 'pause', p.redPause)

    if (blue.energy <= 0.01) {
      blue.energy = 0
      this.kill(blue, 'drained')
    }
  }
}
