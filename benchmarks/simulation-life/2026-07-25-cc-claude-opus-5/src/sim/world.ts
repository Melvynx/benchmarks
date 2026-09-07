import { Rng } from './rng'
import type { Params } from './params'
import type { Action, Blob, Effect, Kind, Traits, Tree, World } from './types'

/** Fixed simulation timestep. Everything below is expressed per second. */
export const DT = 1 / 30

/**
 * Rule constants. These are the shape of the ecology rather than the dials the
 * player turns — the sliders in `params.ts` move within the world these set up.
 */
export const CONST = {
  maxEnergy: 120,
  /** Energy a blue blob gets from one fruit. */
  fruitEnergy: 34,
  /**
   * A contact is not a transfer — red gains more than blue loses. Keeping the
   * two sides separate is what makes coexistence possible: blue can survive
   * several contacts while red still earns a living from them.
   */
  contactEfficiency: 1.6,
  /** Fraction of the parent's energy lost when a blob copies itself. */
  birthCost: 0.12,
  copyCooldown: 7,
  contactTime: 0.5,
  /**
   * After a contact a blue blob is off-limits for a moment. Without this a
   * blob surrounded by red loses everything in a single frame, and the whole
   * ecology flips between "red starves" and "red eats the world" with nothing
   * in between. Capping the drain per blob is what makes the waves stable.
   */
  contactImmunity: 2.6,
  /** How long a contacted blue stays startled: quicker, and braver about range. */
  panicTime: 2.2,
  panicSpeed: 1.14,
  panicRange: 1.55,
  /**
   * Under a canopy a blue blob is hard to pick out. Red mostly catches blobs
   * crossing open ground between trees — so red's supply tracks how often blue
   * has to travel, not how many blue blobs exist. That is the refuge which
   * stops the swings from growing until one group hits zero.
   */
  shelterRadius: 26,
  shelterFactor: 0.3,
  /**
   * Red blobs working the same patch get in each other's way. This is the
   * one feedback that limits red by its *own* numbers instead of by running
   * the blue group down to nothing, and it is what makes coexistence hold
   * across a wide range of settings rather than on a knife edge.
   */
  interferenceRange: 72,
  interferenceCost: 0.34,
  blobRadius: 7,
  eatReach: 12,
  contactReach: 12,
  /** Waiting still costs this share of the full-speed upkeep. */
  idleUpkeep: 0.28,
  /** Keen eyes are metabolically expensive, so vision cannot run away either. */
  visionCost: 0.35,
  /**
   * A blue blob only panics once a red is this deep inside its vision. Red
   * sensing therefore reaches further than blue nerves, which is what gives
   * red an approach at all — without it nothing is ever caught in the open.
   */
  threatFactor: 0.62,
  /** How much of its caution a blue blob gives up when it is running on empty. */
  hungerNerve: 0.72,
  turnRate: 7,
  separationRange: 26,
  populationCap: 900,
  /**
   * How ripe the garden is at time zero, as a share of what a tree can hold.
   * Trees used to start uniformly well stocked, which handed the opening
   * population a free larder: nearly every blob cleared its copy threshold in
   * the same few seconds, the stock ran out on them together, and both groups
   * crashed together before the first minute was up. Starting from
   * nothing-to-half staggers the first harvest, so the garden ramps up instead
   * of booming and busting.
   */
  startRipeness: 0.5,
  blueLifespan: 210,
  redLifespan: 330,
  lifespanSpread: 0.22,
  mutation: 0.05,
  traitMin: 0.5,
  traitMax: 1.8,
}

/** Tuning hook for the headless probe. Never called by the app. */
export function overrideConst(patch: Partial<typeof CONST>) {
  Object.assign(CONST, patch)
}

const TAU = Math.PI * 2

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// --- creation ---------------------------------------------------------------

function makeTraits(rng: Rng): Traits {
  return {
    speed: 1 + rng.normal() * 0.05,
    vision: 1 + rng.normal() * 0.05,
    thrift: 1 + rng.normal() * 0.05,
  }
}

function mutate(value: number, rng: Rng): number {
  const next = value * (1 + rng.normal() * CONST.mutation)
  return Math.min(CONST.traitMax, Math.max(CONST.traitMin, next))
}

function makeBlob(
  id: number,
  kind: Kind,
  x: number,
  y: number,
  energy: number,
  traits: Traits,
  rng: Rng,
  t: number,
  generation: number,
  parentId: number,
): Blob {
  const base = kind === 'blue' ? CONST.blueLifespan : CONST.redLifespan
  const heading = rng.next() * TAU
  return {
    id,
    kind,
    x,
    y,
    px: x,
    py: y,
    vx: Math.cos(heading) * 4,
    vy: Math.sin(heading) * 4,
    energy,
    age: 0,
    lifespan: base * (1 + rng.normal() * CONST.lifespanSpread),
    action: 'wander',
    actionTimer: 0,
    actionTotal: 0,
    copyCooldown: CONST.copyCooldown * rng.range(0.3, 1),
    targetTree: -1,
    targetBlob: -1,
    immunity: 0,
    panic: 0,
    sheltered: false,
    crowding: 0,
    traits,
    generation,
    parentId,
    bornAt: t,
    meals: 0,
    children: 0,
    phase: rng.next() * TAU,
    blinkTimer: rng.range(1, 6),
    blinkFor: 0,
    squash: 0,
    glow: 0,
  }
}

function makeTree(id: number, x: number, y: number, rng: Rng, params: Params): Tree {
  const scale = rng.range(0.82, 1.2)
  const anchorCount = 14
  const anchors: Tree['anchors'] = []
  for (let i = 0; i < anchorCount; i++) {
    // Spread fruit around the canopy shell, biased outward and downward.
    const a = (i / anchorCount) * TAU + rng.range(-0.25, 0.25)
    const rad = rng.range(0.55, 1) * 15 * scale
    anchors.push({
      x: Math.cos(a) * rad,
      y: Math.sin(a) * rad * 0.85,
      z: 26 * scale + rng.range(-9, 9) * scale,
      r: rng.range(3.1, 4.2) * scale,
    })
  }
  const startFruit = Math.min(params.fruitLimit, Math.round(rng.range(0, CONST.startRipeness) * params.fruitLimit))
  return {
    id,
    x,
    y,
    scale,
    fruit: startFruit,
    growth: rng.next(),
    delay: 0,
    anchors,
    pop: anchors.map((_, i) => (i < startFruit ? 1 : 0)),
    leanSeed: rng.next() * TAU,
  }
}

export function createWorld(params: Params): World {
  const rng = new Rng(params.seed)
  const radius = params.worldSize
  const trees: Tree[] = []

  // Poisson-ish scatter so trees do not stack on each other.
  const minGap = Math.max(34, radius / Math.sqrt(Math.max(1, params.trees)) * 0.85)
  let guard = 0
  while (trees.length < params.trees && guard < 4000) {
    guard++
    const p = rng.inDisc(radius * 0.86)
    let ok = true
    for (const tree of trees) {
      if (Math.hypot(tree.x - p.x, tree.y - p.y) < minGap) {
        ok = false
        break
      }
    }
    if (ok) trees.push(makeTree(trees.length, p.x, p.y, rng, params))
  }

  const blobs: Blob[] = []
  let nextId = 1
  for (let i = 0; i < params.blueStart; i++) {
    const p = rng.inDisc(radius * 0.9)
    blobs.push(makeBlob(nextId++, 'blue', p.x, p.y, rng.range(0.45, 0.8) * CONST.maxEnergy, makeTraits(rng), rng, 0, 1, -1))
  }
  for (let i = 0; i < params.redStart; i++) {
    const p = rng.inDisc(radius * 0.9)
    blobs.push(makeBlob(nextId++, 'red', p.x, p.y, rng.range(0.45, 0.8) * CONST.maxEnergy, makeTraits(rng), rng, 0, 1, -1))
  }

  const world: World = {
    t: 0,
    steps: 0,
    radius,
    trees,
    blobs,
    nextId,
    effects: [],
    counts: { fruit: 0, blue: 0, red: 0 },
    totals: {
      births: { blue: 0, red: 0 },
      deaths: { blue: 0, red: 0 },
      starved: { blue: 0, red: 0 },
      aged: { blue: 0, red: 0 },
      fruitEaten: 0,
      contacts: 0,
    },
    extinct: { blue: null, red: null },
    capReached: false,
  }
  recount(world)
  return world
}

function recount(world: World) {
  let fruit = 0
  let blue = 0
  let red = 0
  for (const tree of world.trees) fruit += tree.fruit
  for (const b of world.blobs) {
    if (b.kind === 'blue') blue++
    else red++
  }
  world.counts = { fruit, blue, red }
}

// --- spatial hash -----------------------------------------------------------

class Grid {
  private cell: number
  private map = new Map<number, Blob[]>()

  constructor(cell: number) {
    this.cell = Math.max(24, cell)
  }

  private key(cx: number, cy: number) {
    return (cx + 4096) * 8192 + (cy + 4096)
  }

  insert(b: Blob) {
    const cx = Math.floor(b.x / this.cell)
    const cy = Math.floor(b.y / this.cell)
    const k = this.key(cx, cy)
    const bucket = this.map.get(k)
    if (bucket) bucket.push(b)
    else this.map.set(k, [b])
  }

  /** Calls `fn` for every blob within `radius` of (x, y). May include a few extras. */
  query(x: number, y: number, radius: number, fn: (b: Blob) => void) {
    const span = Math.ceil(radius / this.cell)
    const cx = Math.floor(x / this.cell)
    const cy = Math.floor(y / this.cell)
    for (let ix = cx - span; ix <= cx + span; ix++) {
      for (let iy = cy - span; iy <= cy + span; iy++) {
        const bucket = this.map.get(this.key(ix, iy))
        if (!bucket) continue
        for (const b of bucket) fn(b)
      }
    }
  }
}

// --- effects ----------------------------------------------------------------

function addEffect(world: World, e: Omit<Effect, 'maxLife'> & { maxLife?: number }) {
  if (world.effects.length > 260) world.effects.shift()
  world.effects.push({ ...e, maxLife: e.maxLife ?? e.life })
}

// --- step -------------------------------------------------------------------

export type StepRng = { rng: Rng }

/** Advance the world by exactly one DT. `rng` must be the world's own stream. */
export function step(world: World, params: Params, rng: Rng) {
  const dt = DT
  world.t += dt
  world.steps++

  growFruit(world, params, dt)

  const visionCell = Math.max(params.blueVision, params.redVision, 40)
  const grid = new Grid(visionCell / 1.5)
  const shelter2 = CONST.shelterRadius * CONST.shelterRadius
  for (const b of world.blobs) {
    grid.insert(b)
    if (b.kind !== 'blue') continue
    b.sheltered = false
    for (const tree of world.trees) {
      const dx = tree.x - b.x
      const dy = tree.y - b.y
      if (dx * dx + dy * dy < shelter2) {
        b.sheltered = true
        break
      }
    }
  }

  const born: Blob[] = []

  for (const b of world.blobs) {
    b.px = b.x
    b.py = b.y
    b.age += dt
    if (b.copyCooldown > 0) b.copyCooldown -= dt
    if (b.immunity > 0) b.immunity -= dt
    if (b.panic > 0) b.panic -= dt
    if (b.glow > 0) b.glow = Math.max(0, b.glow - dt * 1.6)
    if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 3)

    if (b.actionTimer > 0) {
      b.actionTimer -= dt
      if (b.actionTimer <= 0) finishLockedAction(world, params, b, rng)
    }

    if (b.kind === 'blue') stepBlue(world, params, b, grid, rng, dt)
    else stepRed(world, params, b, grid, rng, dt)

    // Upkeep. Effort is measured against the *species* speed, not the blob's own
    // top speed, so a blob born fast genuinely pays for it — otherwise the speed
    // trait is free and blue simply evolves out of red's reach. Squaring it makes
    // sprinting expensive and idling cheap, which is what lets a hungry red blob
    // coast through a lean patch instead of burning itself out hunting.
    const base = b.kind === 'blue' ? params.blueSpeed : params.redSpeed
    const effort = base > 0 ? Math.hypot(b.vx, b.vy) / base : 0
    const jostle = b.kind === 'red' ? 1 + CONST.interferenceCost * b.crowding : 1
    const senses = 1 + CONST.visionCost * (b.traits.vision - 1)
    const upkeep = ((b.kind === 'blue' ? params.blueUpkeep : params.redUpkeep) * jostle * senses) / b.traits.thrift
    b.energy -= upkeep * (CONST.idleUpkeep + (1 - CONST.idleUpkeep) * effort * effort) * dt

    if (b.actionTimer <= 0 && b.copyCooldown <= 0) tryCopy(world, params, b, born, rng)
  }

  if (born.length) world.blobs.push(...born)

  // Deaths
  const survivors: Blob[] = []
  for (const b of world.blobs) {
    const starved = b.energy <= 0
    const old = b.age >= b.lifespan
    if (starved || old) {
      world.totals.deaths[b.kind]++
      if (starved) world.totals.starved[b.kind]++
      else world.totals.aged[b.kind]++
      addEffect(world, { kind: 'death', x: b.x, y: b.y, z: 8, life: 0.75, color: b.kind, seed: b.id })
    } else {
      survivors.push(b)
    }
  }
  world.blobs = survivors

  // Effects decay
  for (let i = world.effects.length - 1; i >= 0; i--) {
    world.effects[i].life -= dt
    if (world.effects[i].life <= 0) world.effects.splice(i, 1)
  }

  recount(world)
  if (world.counts.blue === 0 && world.extinct.blue === null) world.extinct.blue = world.t
  if (world.counts.blue > 0) world.extinct.blue = null
  if (world.counts.red === 0 && world.extinct.red === null) world.extinct.red = world.t
  if (world.counts.red > 0) world.extinct.red = null
}

function kindSpeed(params: Params, b: Blob) {
  return (b.kind === 'blue' ? params.blueSpeed : params.redSpeed) * b.traits.speed
}

function kindVision(params: Params, b: Blob) {
  return (b.kind === 'blue' ? params.blueVision : params.redVision) * b.traits.vision
}

function growFruit(world: World, params: Params, dt: number) {
  for (const tree of world.trees) {
    if (tree.fruit > params.fruitLimit) {
      // Limit was lowered mid-run: shed the extras.
      tree.fruit = params.fruitLimit
    }
    for (let i = 0; i < tree.pop.length; i++) {
      const target = i < tree.fruit ? 1 : 0
      if (tree.pop[i] !== target) {
        tree.pop[i] = target === 1 ? Math.min(1, tree.pop[i] + dt * 3.2) : Math.max(0, tree.pop[i] - dt * 5)
      }
    }
    if (tree.delay > 0) {
      tree.delay -= dt
      continue
    }
    if (tree.fruit >= params.fruitLimit) {
      tree.growth = Math.min(tree.growth, 0.999)
      continue
    }
    tree.growth += params.fruitGrowth * dt
    while (tree.growth >= 1 && tree.fruit < params.fruitLimit) {
      tree.growth -= 1
      tree.fruit++
      addEffect(world, {
        kind: 'ripen',
        x: tree.x,
        y: tree.y,
        z: 26 * tree.scale,
        life: 0.5,
        color: 'fruit',
        seed: tree.id * 31 + tree.fruit,
      })
    }
  }
}

function finishLockedAction(world: World, params: Params, b: Blob, rng: Rng) {
  if (b.action === 'eat') {
    b.energy = Math.min(CONST.maxEnergy, b.energy + CONST.fruitEnergy)
    b.meals++
    b.glow = 0.7
    b.squash = 0.55
    world.totals.fruitEaten++
    addEffect(world, { kind: 'eat', x: b.x, y: b.y, z: 10, life: 0.6, color: 'fruit', seed: b.id + world.steps })
    b.action = 'wander'
    b.actionTimer = 0
    b.targetTree = -1
  } else if (b.action === 'contact') {
    // The contact moment is over; now the red blob rests it off.
    b.action = 'rest'
    b.actionTimer = params.redPause
    b.actionTotal = params.redPause
  } else if (b.action === 'rest') {
    b.action = 'wander'
    b.actionTimer = 0
    b.targetBlob = -1
    // Nudge it off in a fresh direction so it does not re-lock on the same spot.
    const a = rng.next() * TAU
    b.vx = Math.cos(a) * 3
    b.vy = Math.sin(a) * 3
  }
}

function steer(b: Blob, dx: number, dy: number, maxSpeed: number, dt: number, agility = 1) {
  const len = Math.hypot(dx, dy)
  let tx = 0
  let ty = 0
  if (len > 1e-6) {
    tx = (dx / len) * maxSpeed
    ty = (dy / len) * maxSpeed
  }
  const k = Math.min(1, CONST.turnRate * agility * dt)
  b.vx += (tx - b.vx) * k
  b.vy += (ty - b.vy) * k
  const sp = Math.hypot(b.vx, b.vy)
  if (sp > maxSpeed) {
    b.vx = (b.vx / sp) * maxSpeed
    b.vy = (b.vy / sp) * maxSpeed
  }
}

function applyMotion(world: World, b: Blob, dt: number) {
  b.x += b.vx * dt
  b.y += b.vy * dt
  const r = Math.hypot(b.x, b.y)
  const edge = world.radius - CONST.blobRadius - 2
  if (r > edge) {
    const nx = b.x / r
    const ny = b.y / r
    b.x = nx * edge
    b.y = ny * edge
    // Slide along the rim instead of sticking to it.
    const dot = b.vx * nx + b.vy * ny
    b.vx -= nx * dot * 1.6
    b.vy -= ny * dot * 1.6
  }
}

/** Smooth wander heading, deterministic per blob. */
function wanderVector(b: Blob, world: World, rng: Rng): { x: number; y: number } {
  // Occasional heading nudge keeps paths curved rather than jittery.
  if (rng.next() < 0.035) {
    b.phase += rng.range(-0.9, 0.9)
  }
  const drift = b.phase + Math.sin(world.t * 0.35 + b.id * 1.7) * 0.5
  let dx = Math.cos(drift)
  let dy = Math.sin(drift)
  // Keep away from the rim.
  const r = Math.hypot(b.x, b.y)
  const margin = world.radius * 0.82
  if (r > margin) {
    const push = (r - margin) / (world.radius - margin)
    dx -= (b.x / r) * push * 2.2
    dy -= (b.y / r) * push * 2.2
  }
  return { x: dx, y: dy }
}

/** Red blobs sharing a patch cost each other energy — see CONST.interferenceCost. */
function countCrowding(b: Blob, grid: Grid) {
  let n = 0
  const range2 = CONST.interferenceRange * CONST.interferenceRange
  grid.query(b.x, b.y, CONST.interferenceRange, (o) => {
    if (o === b || o.kind !== 'red') return
    const dx = o.x - b.x
    const dy = o.y - b.y
    if (dx * dx + dy * dy < range2) n++
  })
  b.crowding = n
}

function stepBlue(world: World, params: Params, b: Blob, grid: Grid, rng: Rng, dt: number) {
  if (b.actionTimer > 0) {
    // Locked: chewing. Slow to a stop.
    b.vx *= 0.82
    b.vy *= 0.82
    applyMotion(world, b, dt)
    return
  }

  const vision = kindVision(params, b)
  const startled = b.panic > 0
  // A full blob keeps its distance; an empty one has to risk the open ground.
  // Without this trade-off a crowd of red freezes every blue into fleeing
  // forever, and the whole blue group starves with the trees still loaded.
  const hunger = 1 - clamp01(b.energy / (CONST.maxEnergy * 0.7))
  const nerve = 1 - CONST.hungerNerve * hunger
  const threatRange = vision * CONST.threatFactor * nerve * (startled ? CONST.panicRange : 1)
  const maxSpeed = kindSpeed(params, b) * (startled ? CONST.panicSpeed : 1)

  // Threat scan + crowd scan in one pass.
  let fleeX = 0
  let fleeY = 0
  let threatWeight = 0
  let sepX = 0
  let sepY = 0
  let crowd = 0
  grid.query(b.x, b.y, Math.max(vision, CONST.separationRange), (o) => {
    if (o === b) return
    const dx = b.x - o.x
    const dy = b.y - o.y
    const d2 = dx * dx + dy * dy
    if (o.kind === 'red') {
      if (d2 < threatRange * threatRange && d2 > 1e-6) {
        const d = Math.sqrt(d2)
        const w = 1 - d / threatRange
        fleeX += (dx / d) * w
        fleeY += (dy / d) * w
        threatWeight += w
      }
    } else if (d2 < CONST.separationRange * CONST.separationRange && d2 > 1e-6) {
      const d = Math.sqrt(d2)
      const w = 1 - d / CONST.separationRange
      sepX += (dx / d) * w
      sepY += (dy / d) * w
      crowd += w
    }
  })

  let action: Action = 'wander'
  let dx = 0
  let dy = 0
  let agility = 1

  if (threatWeight > 0.02) {
    action = 'flee'
    agility = 1.6
    dx = fleeX * 3 + sepX * 0.4
    dy = fleeY * 3 + sepY * 0.4
    const w = wanderVector(b, world, rng)
    dx += w.x * 0.35
    dy += w.y * 0.35
  } else {
    // Look for the best tree in range: lots of fruit, close by, and sticky
    // toward whatever it was already walking to.
    let best = -1
    let bestScore = -Infinity
    let bestDist = 0
    let nearestTree = -1
    let nearestDist = Infinity
    for (const tree of world.trees) {
      const d = Math.hypot(tree.x - b.x, tree.y - b.y)
      if (d > vision) continue
      if (d < nearestDist) {
        nearestDist = d
        nearestTree = tree.id
      }
      if (tree.fruit <= 0) continue
      let score = tree.fruit / (d + 34)
      if (tree.id === b.targetTree) score *= 1.28
      if (score > bestScore) {
        bestScore = score
        best = tree.id
        bestDist = d
      }
    }

    if (best >= 0) {
      const tree = world.trees[best]
      b.targetTree = best
      const reach = CONST.eatReach + 8 * tree.scale
      if (bestDist <= reach && tree.fruit > 0) {
        // Pick it now: the fruit visibly leaves the tree, then the blob chews.
        tree.fruit--
        tree.delay = params.fruitDelay
        b.action = 'eat'
        b.actionTimer = params.blueEatTime
        b.actionTotal = params.blueEatTime
        b.squash = 0.5
        b.vx *= 0.3
        b.vy *= 0.3
        applyMotion(world, b, dt)
        return
      }
      action = 'seek'
      dx = tree.x - b.x
      dy = tree.y - b.y
      const len = Math.hypot(dx, dy) || 1
      dx /= len
      dy /= len
      if (crowd > 0.6) {
        dx += sepX * 1.1
        dy += sepY * 1.1
        action = 'avoid'
      }
    } else if (crowd > 1.1) {
      action = 'avoid'
      dx = sepX * 2
      dy = sepY * 2
      const w = wanderVector(b, world, rng)
      dx += w.x * 0.5
      dy += w.y * 0.5
    } else if (nearestTree >= 0) {
      // Nothing ripe, but stay in the neighbourhood of a tree and wait.
      const tree = world.trees[nearestTree]
      const toTree = Math.hypot(tree.x - b.x, tree.y - b.y)
      action = 'gather'
      b.targetTree = nearestTree
      const w = wanderVector(b, world, rng)
      // Loose orbit: approach when far, drift freely when already close.
      const pull = toTree > 46 ? 1.1 : -0.25
      dx = ((tree.x - b.x) / (toTree || 1)) * pull + w.x * 0.9 + sepX * 0.6
      dy = ((tree.y - b.y) / (toTree || 1)) * pull + w.y * 0.9 + sepY * 0.6
    } else {
      action = 'wander'
      b.targetTree = -1
      const w = wanderVector(b, world, rng)
      dx = w.x + sepX * 0.5
      dy = w.y + sepY * 0.5
    }
  }

  b.action = action
  const cruise = action === 'gather' ? maxSpeed * 0.55 : maxSpeed
  steer(b, dx, dy, cruise, dt, agility)
  applyMotion(world, b, dt)
}

function stepRed(world: World, params: Params, b: Blob, grid: Grid, rng: Rng, dt: number) {
  countCrowding(b, grid)
  if (b.actionTimer > 0) {
    b.vx *= b.action === 'contact' ? 0.75 : 0.88
    b.vy *= b.action === 'contact' ? 0.75 : 0.88
    applyMotion(world, b, dt)
    return
  }

  const vision = kindVision(params, b)
  const maxSpeed = kindSpeed(params, b)

  let target: Blob | null = null
  let bestScore = -Infinity
  let sepX = 0
  let sepY = 0
  grid.query(b.x, b.y, Math.max(vision, CONST.separationRange), (o) => {
    if (o === b) return
    const dx = o.x - b.x
    const dy = o.y - b.y
    const d2 = dx * dx + dy * dy
    if (o.kind === 'blue') {
      // Tucked against a trunk it is hard to make out. Reaching up into the
      // branches for fruit breaks cover, which is where most contacts happen.
      const reach = o.sheltered && o.action !== 'eat' ? vision * CONST.shelterFactor : vision
      if (d2 > reach * reach) return
      // Still glowing from the last contact — not worth chasing yet.
      if (o.immunity > 0) return
      const d = Math.sqrt(d2)
      // Closer is better, but a chewing blob is standing still and worth
      // crossing the garden for — that is where most contacts actually happen.
      let score = 1 - d / vision
      if (o.action === 'eat') score += 1.2
      else if (o.action === 'gather' || o.action === 'seek') score += 0.2
      if (o.id === b.targetBlob) score += 0.18
      if (score > bestScore) {
        bestScore = score
        target = o
      }
    } else if (d2 < CONST.separationRange * CONST.separationRange && d2 > 1e-6) {
      const d = Math.sqrt(d2)
      const w = 1 - d / CONST.separationRange
      sepX -= (dx / d) * w
      sepY -= (dy / d) * w
    }
  })

  let action: Action = 'wander'
  let dx = 0
  let dy = 0

  const prey = target as Blob | null
  if (prey) {
    const d = Math.hypot(prey.x - b.x, prey.y - b.y)
    b.targetBlob = prey.id
    if (d <= CONST.contactReach) {
      const taken = Math.min(params.redStrength, Math.max(0, prey.energy))
      prey.energy -= params.redStrength
      prey.squash = 0.85
      prey.glow = 0.5
      prey.immunity = CONST.contactImmunity
      prey.panic = CONST.panicTime
      // Being touched breaks a meal off mid-chew.
      if (prey.action === 'eat') {
        prey.action = 'flee'
        prey.actionTimer = 0
      }
      b.energy = Math.min(CONST.maxEnergy, b.energy + taken * CONST.contactEfficiency)
      b.meals++
      b.glow = 0.9
      b.squash = 0.6
      b.action = 'contact'
      b.actionTimer = CONST.contactTime
      b.actionTotal = CONST.contactTime + params.redPause
      world.totals.contacts++
      addEffect(world, {
        kind: 'contact',
        x: (b.x + prey.x) / 2,
        y: (b.y + prey.y) / 2,
        z: 9,
        life: 0.65,
        color: 'red',
        seed: b.id * 7 + world.steps,
      })
      b.vx *= 0.2
      b.vy *= 0.2
      applyMotion(world, b, dt)
      return
    }
    action = 'hunt'
    dx = (prey.x - b.x) / (d || 1) + sepX * 0.35
    dy = (prey.y - b.y) / (d || 1) + sepY * 0.35
  } else {
    b.targetBlob = -1
    action = 'wander'
    const w = wanderVector(b, world, rng)
    dx = w.x + sepX * 0.6
    dy = w.y + sepY * 0.6
  }

  b.action = action
  // With nothing in sight a lean red blob stops burning energy it cannot spare
  // and drifts instead. Coasting through a thin patch rather than sprinting
  // through it is what carries red across the troughs between blue waves.
  const thin = 1 - clamp01(b.energy / (CONST.maxEnergy * 0.5))
  const cruise = action === 'hunt' ? maxSpeed : maxSpeed * (0.72 - 0.34 * thin)
  steer(b, dx, dy, cruise, dt, action === 'hunt' ? 1.2 : 1)
  applyMotion(world, b, dt)
}

function tryCopy(world: World, params: Params, b: Blob, born: Blob[], rng: Rng) {
  const threshold = b.kind === 'blue' ? params.blueCopy : params.redCopy
  if (b.energy < threshold) return
  if (world.blobs.length + born.length >= CONST.populationCap) {
    world.capReached = true
    return
  }
  const share = (b.energy * (1 - CONST.birthCost)) / 2
  b.energy = share
  b.copyCooldown = CONST.copyCooldown
  b.children++

  const a = rng.next() * TAU
  const off = CONST.blobRadius * 1.6
  const child = makeBlob(
    world.nextId++,
    b.kind,
    b.x + Math.cos(a) * off,
    b.y + Math.sin(a) * off,
    share,
    {
      speed: mutate(b.traits.speed, rng),
      vision: mutate(b.traits.vision, rng),
      thrift: mutate(b.traits.thrift, rng),
    },
    rng,
    world.t,
    b.generation + 1,
    b.id,
  )
  child.copyCooldown = CONST.copyCooldown
  born.push(child)
  world.totals.births[b.kind]++
  addEffect(world, { kind: 'birth', x: b.x, y: b.y, z: 9, life: 0.55, color: b.kind, seed: child.id })
}

// --- derived readouts -------------------------------------------------------

export function meanEnergy(world: World, kind: Kind): number {
  let sum = 0
  let n = 0
  for (const b of world.blobs) {
    if (b.kind !== kind) continue
    sum += b.energy
    n++
  }
  return n ? sum / n : 0
}

export function meanTrait(world: World, kind: Kind, trait: keyof Traits): number {
  let sum = 0
  let n = 0
  for (const b of world.blobs) {
    if (b.kind !== kind) continue
    sum += b.traits[trait]
    n++
  }
  return n ? sum / n : 1
}

export function fruitCapacity(world: World, params: Params): number {
  return world.trees.length * params.fruitLimit
}
