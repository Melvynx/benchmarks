import { mulberry32, randRange, clamp, type Rng } from './rng'
import type { Params } from './params'

export const MAX_ENERGY = 100
export const FRUIT_ENERGY = 34
const BLUE_IDLE_COST = 0.045
const RED_IDLE_COST = 0.05
const MOVE_COST_PER_SPEED = 0.024
const BLOB_RADIUS = 9
const TREE_REACH = 22
const CONTACT_RANGE = 17
const FLEE_FACTOR = 0.55 // fraction of vision that triggers fleeing
const SPECIES_CAP = 320
const HISTORY_EVERY = 4
const HISTORY_CAP = 6000

export type BlobState = 'wander' | 'seek-fruit' | 'eat' | 'flee' | 'chase' | 'digest'

export interface Tree {
  id: number
  x: number
  y: number
  fruit: number
  sinceEaten: number
  growAcc: number
  size: number // visual canopy scale
}

export interface Blob {
  id: number
  kind: 'blue' | 'red'
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  bornAt: number
  generation: number
  parentId: number | null
  state: BlobState
  stateTimer: number // ticks left in eat / digest
  targetId: number | null // tree id or prey id
  chaseStartedAt: number // reds give up on chases that drag on
  heading: number
  wanderTimer: number
  speedTrait: number
  visionTrait: number
  lastAteAt: number
  graceUntil: number // ticks until this blue can be drained again (post-contact startle)
}

export type SimEvent =
  | { type: 'eat'; x: number; y: number; treeId: number; blobId: number }
  | { type: 'contact'; x: number; y: number; redId: number; blueId: number }
  | { type: 'miss'; x: number; y: number; redId: number; blueId: number }
  | { type: 'birth'; x: number; y: number; kind: 'blue' | 'red'; id: number }
  | { type: 'death'; x: number; y: number; kind: 'blue' | 'red' }

export interface HistorySample {
  t: number
  fruit: number
  blue: number
  red: number
  blueSpeed: number
  blueVision: number
  redSpeed: number
  redVision: number
}

export interface World {
  tick: number
  params: Params
  rng: Rng
  radius: number
  trees: Tree[]
  blues: Blob[]
  reds: Blob[]
  nextId: number
  events: SimEvent[]
  history: HistorySample[]
  blueBirths: number
  redBirths: number
  blueDeaths: number
  redDeaths: number
  version: number // bumped every step so UI can cheaply detect change
}

function spawnBlob(
  world: World,
  kind: 'blue' | 'red',
  x: number,
  y: number,
  energy: number,
  generation: number,
  parentId: number | null,
  speedTrait: number,
  visionTrait: number,
): Blob {
  const b: Blob = {
    id: world.nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    energy,
    bornAt: world.tick,
    generation,
    parentId,
    state: 'wander',
    stateTimer: 0,
    targetId: null,
    chaseStartedAt: -1,
    heading: world.rng() * Math.PI * 2,
    wanderTimer: Math.floor(world.rng() * 80),
    speedTrait,
    visionTrait,
    lastAteAt: world.tick,
    graceUntil: 0,
  }
  return b
}

function mutateTrait(rng: Rng, parent: number): number {
  return clamp(parent * (1 + (rng() - 0.5) * 0.14), 0.6, 1.5)
}

export function createWorld(params: Params): World {
  const rng = mulberry32(params.seed || 1)
  const world: World = {
    tick: 0,
    params: { ...params },
    rng,
    radius: params.worldSize,
    trees: [],
    blues: [],
    reds: [],
    nextId: 1,
    events: [],
    history: [],
    blueBirths: 0,
    redBirths: 0,
    blueDeaths: 0,
    redDeaths: 0,
    version: 0,
  }

  // Scatter trees with a bit of spacing, none too close to the rim.
  for (let i = 0; i < params.startTrees; i++) {
    let x = 0
    let y = 0
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = rng() * Math.PI * 2
      const r = Math.sqrt(rng()) * world.radius * 0.78
      x = Math.cos(a) * r
      y = Math.sin(a) * r
      const ok = world.trees.every((t) => Math.hypot(t.x - x, t.y - y) > 70)
      if (ok) break
    }
    world.trees.push({
      id: world.nextId++,
      x,
      y,
      fruit: Math.max(1, Math.round(params.fruitLimit * randRange(rng, 0.5, 1))),
      sinceEaten: params.fruitReturnDelay,
      growAcc: 0,
      size: randRange(rng, 0.85, 1.2),
    })
  }

  const placeBlob = (kind: 'blue' | 'red') => {
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * world.radius * 0.85
    return spawnBlob(
      world,
      kind,
      Math.cos(a) * r,
      Math.sin(a) * r,
      randRange(rng, 55, 75),
      1,
      null,
      randRange(rng, 0.92, 1.08),
      randRange(rng, 0.92, 1.08),
    )
  }
  for (let i = 0; i < params.startBlue; i++) world.blues.push(placeBlob('blue'))
  for (let i = 0; i < params.startRed; i++) world.reds.push(placeBlob('red'))

  sampleHistory(world)
  return world
}

function sampleHistory(world: World) {
  const avg = (list: Blob[], f: (b: Blob) => number) =>
    list.length === 0 ? 0 : list.reduce((s, b) => s + f(b), 0) / list.length
  world.history.push({
    t: world.tick,
    fruit: world.trees.reduce((s, t) => s + t.fruit, 0),
    blue: world.blues.length,
    red: world.reds.length,
    blueSpeed: avg(world.blues, (b) => b.speedTrait),
    blueVision: avg(world.blues, (b) => b.visionTrait),
    redSpeed: avg(world.reds, (b) => b.speedTrait),
    redVision: avg(world.reds, (b) => b.visionTrait),
  })
  if (world.history.length > HISTORY_CAP) {
    // Downsample by 2: keep every other sample so long runs stay bounded.
    world.history = world.history.filter((_, i) => i % 2 === 0)
  }
}

function steer(b: Blob, dirX: number, dirY: number, speed: number, agility = 0.22) {
  const len = Math.hypot(dirX, dirY)
  if (len > 1e-6) {
    b.vx += ((dirX / len) * speed - b.vx) * agility
    b.vy += ((dirY / len) * speed - b.vy) * agility
  } else {
    b.vx *= 0.9
    b.vy *= 0.9
  }
}

function integrate(world: World, b: Blob) {
  b.x += b.vx
  b.y += b.vy
  const dist = Math.hypot(b.x, b.y)
  const maxR = world.radius - BLOB_RADIUS - 4
  if (dist > maxR && dist > 1e-6) {
    const nx = b.x / dist
    const ny = b.y / dist
    b.x = nx * maxR
    b.y = ny * maxR
    // reflect velocity inward
    const dot = b.vx * nx + b.vy * ny
    if (dot > 0) {
      b.vx -= 2 * dot * nx
      b.vy -= 2 * dot * ny
    }
  }
}

function separation(blobs: Blob[], b: Blob, radius: number) {
  let pushX = 0
  let pushY = 0
  for (const o of blobs) {
    if (o === b) continue
    const dx = b.x - o.x
    const dy = b.y - o.y
    const d2 = dx * dx + dy * dy
    if (d2 > 0.01 && d2 < radius * radius) {
      const d = Math.sqrt(d2)
      const f = ((radius - d) / radius) * 0.9
      pushX += (dx / d) * f
      pushY += (dy / d) * f
    }
  }
  b.vx += pushX
  b.vy += pushY
}

function nearestTreeWithFruit(world: World, b: Blob, vision: number): Tree | null {
  const desperate = b.energy < 30
  let best: Tree | null = null
  let bestScore = Infinity
  for (const t of world.trees) {
    if (t.fruit <= 0) continue
    const d = Math.hypot(t.x - b.x, t.y - b.y)
    if (d > vision) continue
    // Avoid crowding: trees already hosting several blues look less appealing.
    let crowd = 0
    for (const o of world.blues) {
      if (o.targetId === t.id || Math.hypot(o.x - t.x, o.y - t.y) < 34) crowd++
    }
    // Avoid trees a red blob is lurking by — unless starving and willing to risk it.
    let redNear = false
    for (const r of world.reds) {
      if (Math.hypot(r.x - t.x, r.y - t.y) < 80) {
        redNear = true
        break
      }
    }
    let score = d * (1 + Math.max(0, crowd - 2) * 0.6)
    if (redNear && !desperate) score += 260
    if (score < bestScore) {
      bestScore = score
      best = t
    }
  }
  return best
}

function nearestBlob(list: Blob[], x: number, y: number, vision: number, skipGrace = false, tick = 0): Blob | null {
  let best: Blob | null = null
  let bestD = vision
  for (const o of list) {
    if (skipGrace && o.graceUntil > tick) continue
    const d = Math.hypot(o.x - x, o.y - y)
    if (d < bestD) {
      bestD = d
      best = o
    }
  }
  return best
}

function wander(world: World, b: Blob, speed: number) {
  b.wanderTimer--
  if (b.wanderTimer <= 0) {
    b.wanderTimer = 50 + Math.floor(world.rng() * 90)
    b.heading += (world.rng() - 0.5) * 2.2
  }
  let dx = Math.cos(b.heading)
  let dy = Math.sin(b.heading)
  // gentle pull back toward the middle when drifting near the rim
  const dist = Math.hypot(b.x, b.y)
  if (dist > world.radius * 0.7) {
    dx += (-b.x / dist) * 0.8
    dy += (-b.y / dist) * 0.8
  }
  steer(b, dx, dy, speed * 0.55)
}

function stepBlue(world: World, b: Blob) {
  const p = world.params
  const speed = p.blueSpeed * b.speedTrait
  const vision = p.blueVision * b.visionTrait

  if (b.state === 'eat') {
    b.stateTimer--
    b.vx *= 0.8
    b.vy *= 0.8
    if (b.stateTimer <= 0) {
      const tree = world.trees.find((t) => t.id === b.targetId)
      if (tree && tree.fruit > 0 && Math.hypot(tree.x - b.x, tree.y - b.y) < TREE_REACH + 14) {
        tree.fruit--
        tree.sinceEaten = 0
        b.energy = Math.min(MAX_ENERGY, b.energy + FRUIT_ENERGY)
        b.lastAteAt = world.tick
        world.events.push({ type: 'eat', x: tree.x, y: tree.y, treeId: tree.id, blobId: b.id })
      }
      b.state = 'wander'
      b.targetId = null
    }
  } else {
    // 1. danger?
    const threat = nearestBlob(world.reds, b.x, b.y, vision * FLEE_FACTOR)
    if (threat && (b.state !== 'flee' || b.targetId !== threat.id)) {
      b.state = 'flee'
      b.targetId = threat.id
    }
    if (b.state === 'flee') {
      const t = world.reds.find((r) => r.id === b.targetId) ?? threat
      if (t && Math.hypot(t.x - b.x, t.y - b.y) < vision * FLEE_FACTOR * 1.4) {
        steer(b, b.x - t.x, b.y - t.y, speed, 0.3)
      } else {
        b.state = 'wander'
        b.targetId = null
      }
    }

    if (b.state !== 'flee') {
      // 2. food? Well-fed blues ignore fruit and loiter far from the trees
      // where reds hunt — a behavioral refuge that stabilizes the ecology.
      const hungry = b.energy < Math.min(72, p.blueCopyThreshold - 8)
      const tree = hungry ? nearestTreeWithFruit(world, b, vision) : null
      if (tree) {
        b.state = 'seek-fruit'
        b.targetId = tree.id
        const d = Math.hypot(tree.x - b.x, tree.y - b.y)
        if (d < TREE_REACH) {
          b.state = 'eat'
          b.stateTimer = p.blueEatingTime
          b.vx = 0
          b.vy = 0
        } else {
          steer(b, tree.x - b.x, tree.y - b.y, speed)
        }
      } else {
        b.state = 'wander'
        b.targetId = null
        wander(world, b, speed)
      }
    }
  }

  separation(world.blues, b, 16)
  integrate(world, b)

  const frac = Math.min(1, Math.hypot(b.vx, b.vy) / Math.max(0.01, speed))
  b.energy -= (BLUE_IDLE_COST + MOVE_COST_PER_SPEED * speed * frac) * p.blueEnergyUse
}

function stepRed(world: World, b: Blob) {
  const p = world.params
  const torpid = b.energy < 24 // starving reds slow down to ride out lean times
  const speed = p.redSpeed * b.speedTrait * (torpid ? 0.45 : 1)
  const vision = p.redVision * b.visionTrait

  if (b.state === 'digest') {
    b.stateTimer--
    b.vx *= 0.85
    b.vy *= 0.85
    if (b.stateTimer <= 0) {
      b.state = 'wander'
      b.targetId = null
    }
  } else {
    const prey = nearestBlob(world.blues, b.x, b.y, vision, true, world.tick)
    if (prey) {
      if (b.state !== 'chase' || b.targetId !== prey.id) {
        b.chaseStartedAt = world.tick
      } else if (world.tick - b.chaseStartedAt > 150) {
        // this chase is going nowhere — give up and prowl
        b.state = 'wander'
        b.targetId = null
        b.chaseStartedAt = -1
        steer(b, b.vx, b.vy, speed * 0.4)
        separation(world.reds, b, 16)
        integrate(world, b)
        b.energy -= (RED_IDLE_COST + MOVE_COST_PER_SPEED * speed * 0.4) * p.redEnergyUse
        return
      }
      b.state = 'chase'
      b.targetId = prey.id
      const d = Math.hypot(prey.x - b.x, prey.y - b.y)
      const busy = prey.state === 'eat' || prey.state === 'digest'
      if (d < CONTACT_RANGE) {
        if (world.rng() < 0.55) {
          // pounce connects
          const gain = Math.min(p.redContactStrength, MAX_ENERGY - b.energy)
          b.energy += gain
          // a gentle interaction: the blue is startled and drained, not eaten
          prey.energy -= p.redContactStrength * 0.6
          prey.graceUntil = world.tick + p.contactGrace
          prey.state = 'flee'
          prey.targetId = b.id
          // the commotion scatters nearby blues (interrupting any meal)
          for (const o of world.blues) {
            if (o !== prey && Math.hypot(o.x - prey.x, o.y - prey.y) < 70) {
              o.state = 'flee'
              o.targetId = b.id
              o.stateTimer = 0
            }
          }
          b.state = 'digest'
          b.stateTimer = p.redPauseTime
          b.lastAteAt = world.tick
          world.events.push({ type: 'contact', x: prey.x, y: prey.y, redId: b.id, blueId: prey.id })
        } else {
          // pounce missed — the blue bolts, the red needs a moment
          prey.state = 'flee'
          prey.targetId = b.id
          prey.graceUntil = Math.max(prey.graceUntil, world.tick + 40)
          b.state = 'digest'
          b.stateTimer = Math.max(8, Math.floor(p.redPauseTime * 0.35))
          world.events.push({ type: 'miss', x: prey.x, y: prey.y, redId: b.id, blueId: prey.id })
        }
      } else if (d < vision * 0.5 || busy) {
        // strike range or a distracted target: commit to the sprint
        steer(b, prey.x - b.x, prey.y - b.y, speed, 0.26)
      } else {
        // too far to sprint — prowl closer, saving energy
        steer(b, prey.x - b.x, prey.y - b.y, speed * 0.62, 0.18)
      }
    } else {
      // no prey in sight: lurk near the fruit trees where hungry blues will come
      b.state = 'wander'
      b.targetId = null
      let bestTree: Tree | null = null
      let bestFruit = 0
      for (const t of world.trees) {
        if (t.fruit > bestFruit) {
          bestFruit = t.fruit
          bestTree = t
        }
      }
      if (bestTree && !torpid) {
        const d = Math.hypot(bestTree.x - b.x, bestTree.y - b.y)
        if (d > 60) {
          steer(b, bestTree.x - b.x, bestTree.y - b.y, speed * 0.6, 0.16)
        } else {
          // loiter in orbit around the tree
          steer(b, -(bestTree.y - b.y), bestTree.x - b.x, speed * 0.3, 0.12)
        }
      } else {
        wander(world, b, speed)
      }
    }
  }

  separation(world.reds, b, 16)
  integrate(world, b)

  const frac = Math.min(1, Math.hypot(b.vx, b.vy) / Math.max(0.01, p.redSpeed * b.speedTrait))
  const thrift = torpid ? 0.55 : 1
  b.energy -= (RED_IDLE_COST + MOVE_COST_PER_SPEED * speed * frac) * p.redEnergyUse * thrift
}

function maybeReproduce(world: World, list: Blob[], b: Blob, threshold: number) {
  if (b.energy < threshold || list.length >= SPECIES_CAP) return
  const before = b.energy
  b.energy = before * 0.6
  const angle = world.rng() * Math.PI * 2
  const child = spawnBlob(
    world,
    b.kind,
    clamp(b.x + Math.cos(angle) * 14, -world.radius + 12, world.radius - 12),
    clamp(b.y + Math.sin(angle) * 14, -world.radius + 12, world.radius - 12),
    before * 0.4,
    b.generation + 1,
    b.id,
    mutateTrait(world.rng, b.speedTrait),
    mutateTrait(world.rng, b.visionTrait),
  )
  list.push(child)
  if (b.kind === 'blue') world.blueBirths++
  else world.redBirths++
  world.events.push({ type: 'birth', x: child.x, y: child.y, kind: b.kind, id: child.id })
}

export function stepWorld(world: World) {
  const p = world.params
  world.tick++
  world.events.length = 0

  // fruit regrowth
  for (const t of world.trees) {
    t.sinceEaten++
    if (t.fruit < p.fruitLimit && t.sinceEaten >= p.fruitReturnDelay) {
      t.growAcc += p.fruitGrowth
      while (t.growAcc >= 1 && t.fruit < p.fruitLimit) {
        t.fruit++
        t.growAcc -= 1
      }
    }
  }

  // blues act on a shuffled copy so turn order isn't biased by birth order
  const blueOrder = [...world.blues]
  for (const b of blueOrder) stepBlue(world, b)
  const redOrder = [...world.reds]
  for (const b of redOrder) stepRed(world, b)

  // reproduction (thresholds read live from params)
  for (const b of [...world.blues]) maybeReproduce(world, world.blues, b, p.blueCopyThreshold)
  for (const b of [...world.reds]) maybeReproduce(world, world.reds, b, p.redCopyThreshold)

  // deaths
  const bury = (list: Blob[], kind: 'blue' | 'red') => {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].energy <= 0) {
        world.events.push({ type: 'death', x: list[i].x, y: list[i].y, kind })
        if (kind === 'blue') world.blueDeaths++
        else world.redDeaths++
        list.splice(i, 1)
      }
    }
  }
  bury(world.blues, 'blue')
  bury(world.reds, 'red')

  if (world.tick % HISTORY_EVERY === 0) sampleHistory(world)
  world.version++
}

/** Live-update a tunable param. Setup params (startTrees/Blue/Red) apply on reset. */
export function applyParam(world: World, key: keyof Params, value: number) {
  const oldRadius = world.params.worldSize
  world.params[key] = value
  if (key === 'worldSize' && value !== oldRadius) {
    // rescale entity positions so the garden keeps its layout
    const f = value / oldRadius
    world.radius = value
    for (const t of world.trees) {
      t.x *= f
      t.y *= f
    }
    for (const b of [...world.blues, ...world.reds]) {
      b.x *= f
      b.y *= f
    }
  }
  if (key === 'fruitLimit') {
    for (const t of world.trees) t.fruit = Math.min(t.fruit, value)
  }
}

export function blobAge(world: World, b: Blob): number {
  return world.tick - b.bornAt
}

export const STATE_LABELS: Record<BlobState, string> = {
  wander: 'Wandering',
  'seek-fruit': 'Looking for fruit',
  eat: 'Eating fruit',
  flee: 'Fleeing a red blob',
  chase: 'Hunting a blue blob',
  digest: 'Resting after contact',
}
