import type { Params } from './params'
import { Rng } from './rng'
import type { Action, Blob, Decor, Group, Spark, Traits, Tree, World } from './types'

export const DT = 1 / 30

export const CONST = {
  maxEnergy: 120,
  fruitEnergy: 34,
  contactEfficiency: 1.6,
  birthCost: 0.12,
  copyCooldown: 7,
  contactTime: 0.5,
  contactImmunity: 2.6,
  panicTime: 2.2,
  panicSpeed: 1.14,
  panicRange: 1.55,
  shelterRadius: 26,
  shelterFactor: 0.3,
  interferenceRange: 72,
  interferenceCost: 0.34,
  blobRadius: 7,
  eatReach: 12,
  contactReach: 12,
  idleUpkeep: 0.28,
  visionCost: 0.35,
  threatFactor: 0.62,
  hungerNerve: 0.72,
  turnRate: 7,
  separationRange: 26,
  populationCap: 900,
  startRipeness: 0.5,
  blueLifespan: 210,
  redLifespan: 330,
  lifespanSpread: 0.22,
  mutation: 0.05,
  traitMin: 0.5,
  traitMax: 1.8,
  digestTime: 0.28,
  birthLock: 0.45,
}

const TAU = Math.PI * 2

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

export function createSimulation(params: Params): { world: World; rng: Rng } {
  const rng = new Rng(params.seed)
  const radius = params.worldSize
  const trees = placeTrees(params, rng, radius)
  const decor = placeDecor(rng, radius)
  const blobs: Blob[] = []
  let nextId = 1
  for (let i = 0; i < params.blueStart; i++) {
    const spot = rng.inDisc(radius * 0.9)
    blobs.push(makeBlob(nextId++, 'blue', spot.x, spot.y, rng.range(0.45, 0.8) * CONST.maxEnergy, makeTraits(rng), rng, 1, -1))
  }
  for (let i = 0; i < params.redStart; i++) {
    const spot = rng.inDisc(radius * 0.9)
    blobs.push(makeBlob(nextId++, 'red', spot.x, spot.y, rng.range(0.45, 0.8) * CONST.maxEnergy, makeTraits(rng), rng, 1, -1))
  }
  const world: World = {
    t: 0,
    steps: 0,
    radius,
    trees,
    blobs,
    nextId,
    sparks: [],
    decor,
    counts: { fruit: 0, blue: 0, red: 0 },
    totals: {
      births: { blue: 0, red: 0 },
      deaths: { blue: 0, red: 0 },
      starved: { blue: 0, red: 0 },
      aged: { blue: 0, red: 0 },
      fruitEaten: 0,
      contacts: 0,
    },
    capReached: false,
  }
  recount(world)
  return { world, rng }
}

function placeTrees(params: Params, rng: Rng, radius: number): Tree[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const trees: Tree[] = []
  for (let i = 0; i < params.trees; i++) {
    const t = (i + 0.5) / params.trees
    const r = Math.sqrt(t) * radius * 0.84
    const angle = i * golden + rng.range(-0.12, 0.12)
    trees.push(makeTree(i, Math.cos(angle) * r, Math.sin(angle) * r, rng, params))
  }
  return trees
}

function placeDecor(rng: Rng, radius: number): Decor[] {
  const kinds: Decor['kind'][] = ['tuft', 'pebble', 'flower', 'moss']
  const decor: Decor[] = []
  for (let i = 0; i < 90; i++) {
    const spot = rng.inDisc(radius * 0.9)
    decor.push({
      x: spot.x,
      y: spot.y,
      kind: kinds[i % kinds.length],
      rot: rng.next() * TAU,
      scale: rng.range(0.7, 1.3),
      tint: rng.next(),
    })
  }
  return decor
}

function makeTraits(rng: Rng): Traits {
  return {
    speed: clamp(1 + rng.normal() * 0.05, CONST.traitMin, CONST.traitMax),
    vision: clamp(1 + rng.normal() * 0.05, CONST.traitMin, CONST.traitMax),
    thrift: clamp(1 + rng.normal() * 0.05, CONST.traitMin, CONST.traitMax),
  }
}

function mutate(value: number, rng: Rng): number {
  return clamp(value * (1 + rng.normal() * CONST.mutation), CONST.traitMin, CONST.traitMax)
}

function makeBlob(
  id: number,
  group: Group,
  x: number,
  y: number,
  energy: number,
  traits: Traits,
  rng: Rng,
  generation: number,
  parentId: number,
): Blob {
  const base = group === 'blue' ? CONST.blueLifespan : CONST.redLifespan
  const heading = rng.next() * TAU
  return {
    id,
    group,
    x,
    y,
    vx: Math.cos(heading) * 4,
    vy: Math.sin(heading) * 4,
    energy,
    age: 0,
    lifespan: Math.max(40, base * (1 + rng.normal() * CONST.lifespanSpread)),
    action: 'wander',
    actionTimer: 0,
    actionTotal: 0,
    copyCooldown: CONST.copyCooldown * rng.range(0.3, 1),
    immunity: 0,
    panic: 0,
    sheltered: false,
    crowding: 0,
    traits,
    generation,
    parentId,
    children: 0,
    meals: 0,
    phase: rng.next() * TAU,
    blinkTimer: rng.range(1.2, 5),
    blinkFor: 0,
    squash: 0,
    glow: 0,
    face: Math.floor(rng.next() * 3),
    targetTree: -1,
    targetBlob: -1,
  }
}

function makeTree(id: number, x: number, y: number, rng: Rng, params: Params): Tree {
  const scale = rng.range(0.86, 1.18)
  const slots = []
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * TAU + rng.range(-0.2, 0.2)
    const rad = rng.range(0.55, 1) * 16 * scale
    slots.push({
      x: Math.cos(angle) * rad,
      y: Math.sin(angle) * rad * 0.82,
      z: 28 * scale + rng.range(-8, 8) * scale,
      r: rng.range(3.2, 4.4) * scale,
      pop: 0,
    })
  }
  const startFruit = Math.min(params.fruitLimit, Math.round(rng.range(0, CONST.startRipeness) * params.fruitLimit))
  for (let i = 0; i < startFruit; i++) slots[i].pop = 1
  return {
    id,
    x,
    y,
    scale,
    fruit: startFruit,
    growth: rng.next(),
    delay: 0,
    slots,
    leanSeed: rng.next() * TAU,
  }
}

function recount(world: World) {
  let fruit = 0
  let blue = 0
  let red = 0
  for (const tree of world.trees) fruit += tree.fruit
  for (const blob of world.blobs) {
    if (blob.group === 'blue') blue++
    else red++
  }
  world.counts = { fruit, blue, red }
}

class Grid {
  private cell: number
  private map = new Map<number, Blob[]>()

  constructor(cell: number) {
    this.cell = Math.max(24, cell)
  }

  private key(cx: number, cy: number) {
    return (cx + 4096) * 8192 + (cy + 4096)
  }

  insert(blob: Blob) {
    const cx = Math.floor(blob.x / this.cell)
    const cy = Math.floor(blob.y / this.cell)
    const key = this.key(cx, cy)
    const bucket = this.map.get(key)
    if (bucket) bucket.push(blob)
    else this.map.set(key, [blob])
  }

  query(x: number, y: number, radius: number, fn: (blob: Blob) => void) {
    const span = Math.ceil(radius / this.cell)
    const cx = Math.floor(x / this.cell)
    const cy = Math.floor(y / this.cell)
    for (let ix = cx - span; ix <= cx + span; ix++) {
      for (let iy = cy - span; iy <= cy + span; iy++) {
        const bucket = this.map.get(this.key(ix, iy))
        if (!bucket) continue
        for (const blob of bucket) fn(blob)
      }
    }
  }
}

function addSpark(world: World, spark: Omit<Spark, 'max'> & { max?: number }) {
  if (world.sparks.length > 220) world.sparks.shift()
  world.sparks.push({ ...spark, max: spark.max ?? spark.life })
}

export function stepSimulation(world: World, params: Params, rng: Rng) {
  const dt = DT
  world.t += dt
  world.steps++
  growFruit(world, params, dt)

  const grid = new Grid(Math.max(params.blueVision, params.redVision, 40) / 1.5)
  const shelter2 = CONST.shelterRadius * CONST.shelterRadius
  for (const blob of world.blobs) {
    grid.insert(blob)
    blob.sheltered = false
    if (blob.group !== 'blue') continue
    for (const tree of world.trees) {
      const dx = tree.x - blob.x
      const dy = tree.y - blob.y
      if (dx * dx + dy * dy < shelter2) {
        blob.sheltered = true
        break
      }
    }
  }

  const born: Blob[] = []
  for (const blob of world.blobs) {
    blob.age += dt
    if (blob.copyCooldown > 0) blob.copyCooldown -= dt
    if (blob.immunity > 0) blob.immunity -= dt
    if (blob.panic > 0) blob.panic -= dt
    if (blob.glow > 0) blob.glow = Math.max(0, blob.glow - dt * 1.6)
    if (blob.squash > 0) blob.squash = Math.max(0, blob.squash - dt * 3)
    blob.blinkTimer -= dt
    if (blob.blinkTimer <= 0) {
      blob.blinkFor = 0.12
      blob.blinkTimer = rng.range(1.6, 5.2)
    }
    if (blob.blinkFor > 0) blob.blinkFor -= dt

    if (blob.actionTimer > 0) {
      blob.actionTimer -= dt
      if (blob.actionTimer <= 0) finishLocked(params, blob, rng)
    }

    if (blob.group === 'blue') stepBlue(world, params, blob, grid, rng, dt)
    else stepRed(world, params, blob, grid, rng, dt)

    const base = blob.group === 'blue' ? params.blueSpeed : params.redSpeed
    const effort = base > 0 ? Math.hypot(blob.vx, blob.vy) / base : 0
    const jostle = blob.group === 'red' ? 1 + CONST.interferenceCost * blob.crowding : 1
    const senses = 1 + CONST.visionCost * (blob.traits.vision - 1)
    const upkeep = ((blob.group === 'blue' ? params.blueUpkeep : params.redUpkeep) * jostle * senses) / blob.traits.thrift
    const moving = CONST.idleUpkeep + (1 - CONST.idleUpkeep) * effort * effort
    blob.energy -= upkeep * moving * dt

    if (blob.actionTimer <= 0 && blob.copyCooldown <= 0) tryCopy(world, params, blob, born, rng)
  }

  if (born.length) world.blobs.push(...born)

  const survivors: Blob[] = []
  for (const blob of world.blobs) {
    const starved = blob.energy <= 0
    const old = blob.age >= blob.lifespan
    if (starved || old) {
      world.totals.deaths[blob.group]++
      if (starved) world.totals.starved[blob.group]++
      else world.totals.aged[blob.group]++
      addSpark(world, { kind: 'death', x: blob.x, y: blob.y, z: 8, life: 0.7, tint: blob.group })
    } else {
      survivors.push(blob)
    }
  }
  world.blobs = survivors

  for (let i = world.sparks.length - 1; i >= 0; i--) {
    world.sparks[i].life -= dt
    if (world.sparks[i].life <= 0) world.sparks.splice(i, 1)
  }

  recount(world)
}

function growFruit(world: World, params: Params, dt: number) {
  for (const tree of world.trees) {
    if (tree.fruit > params.fruitLimit) tree.fruit = params.fruitLimit
    for (let i = 0; i < tree.slots.length; i++) {
      let target = 0
      if (i < tree.fruit) target = 1
      else if (i === tree.fruit && i < params.fruitLimit && tree.delay <= 0) target = clamp01(tree.growth)
      const slot = tree.slots[i]
      if (slot.pop < target) slot.pop = Math.min(target, slot.pop + dt * 3.2)
      else if (slot.pop > target) slot.pop = Math.max(target, slot.pop - dt * 5)
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
      addSpark(world, { kind: 'ripen', x: tree.x, y: tree.y, z: 30 * tree.scale, life: 0.45, tint: 'fruit' })
    }
  }
}

function finishLocked(params: Params, blob: Blob, rng: Rng) {
  if (blob.action === 'eat') {
    blob.glow = 0.4
    blob.squash = 0.35
    blob.action = 'digest'
    blob.actionTimer = CONST.digestTime
    blob.actionTotal = CONST.digestTime
    blob.targetTree = -1
  } else if (blob.action === 'digest' || blob.action === 'birth') {
    blob.action = 'wander'
    blob.actionTimer = 0
    blob.actionTotal = 0
  } else if (blob.action === 'contact') {
    blob.action = 'rest'
    blob.actionTimer = params.redPause
    blob.actionTotal = params.redPause
  } else if (blob.action === 'rest') {
    blob.action = 'wander'
    blob.actionTimer = 0
    blob.actionTotal = 0
    blob.targetBlob = -1
    const angle = rng.next() * TAU
    blob.vx = Math.cos(angle) * 3
    blob.vy = Math.sin(angle) * 3
  }
}

function groupSpeed(params: Params, blob: Blob) {
  return (blob.group === 'blue' ? params.blueSpeed : params.redSpeed) * blob.traits.speed
}

function groupVision(params: Params, blob: Blob) {
  return (blob.group === 'blue' ? params.blueVision : params.redVision) * blob.traits.vision
}

function steer(blob: Blob, dx: number, dy: number, maxSpeed: number, dt: number, agility = 1) {
  const len = Math.hypot(dx, dy)
  let tx = 0
  let ty = 0
  if (len > 1e-6) {
    tx = (dx / len) * maxSpeed
    ty = (dy / len) * maxSpeed
  }
  const k = Math.min(1, CONST.turnRate * agility * dt)
  blob.vx += (tx - blob.vx) * k
  blob.vy += (ty - blob.vy) * k
  const speed = Math.hypot(blob.vx, blob.vy)
  if (speed > maxSpeed) {
    blob.vx = (blob.vx / speed) * maxSpeed
    blob.vy = (blob.vy / speed) * maxSpeed
  }
}

function applyMotion(world: World, blob: Blob, dt: number) {
  blob.x += blob.vx * dt
  blob.y += blob.vy * dt
  const r = Math.hypot(blob.x, blob.y)
  const edge = world.radius - CONST.blobRadius - 2
  if (r > edge) {
    const nx = blob.x / r
    const ny = blob.y / r
    blob.x = nx * edge
    blob.y = ny * edge
    const dot = blob.vx * nx + blob.vy * ny
    blob.vx -= nx * dot * 1.6
    blob.vy -= ny * dot * 1.6
  }
}

function wanderVector(blob: Blob, world: World, rng: Rng) {
  if (rng.next() < 0.035) blob.phase += rng.range(-0.9, 0.9)
  const drift = blob.phase + Math.sin(world.t * 0.35 + blob.id * 1.7) * 0.5
  let dx = Math.cos(drift)
  let dy = Math.sin(drift)
  const r = Math.hypot(blob.x, blob.y)
  const margin = world.radius * 0.82
  if (r > margin) {
    const push = (r - margin) / (world.radius - margin)
    dx -= (blob.x / r) * push * 2.2
    dy -= (blob.y / r) * push * 2.2
  }
  return { x: dx, y: dy }
}

function holdStill(world: World, blob: Blob, dt: number, drag: number) {
  blob.vx *= drag
  blob.vy *= drag
  applyMotion(world, blob, dt)
}

function stepBlue(world: World, params: Params, blob: Blob, grid: Grid, rng: Rng, dt: number) {
  if (blob.actionTimer > 0) {
    holdStill(world, blob, dt, 0.82)
    return
  }

  const vision = groupVision(params, blob)
  const startled = blob.panic > 0
  const hunger = 1 - clamp01(blob.energy / (CONST.maxEnergy * 0.7))
  const nerve = 1 - CONST.hungerNerve * hunger
  const threatRange = vision * CONST.threatFactor * nerve * (startled ? CONST.panicRange : 1)
  const maxSpeed = groupSpeed(params, blob) * (startled ? CONST.panicSpeed : 1)
  let fleeX = 0
  let fleeY = 0
  let threatWeight = 0
  let sepX = 0
  let sepY = 0
  let crowd = 0
  grid.query(blob.x, blob.y, Math.max(vision, CONST.separationRange), (other) => {
    if (other === blob) return
    const dx = blob.x - other.x
    const dy = blob.y - other.y
    const d2 = dx * dx + dy * dy
    if (other.group === 'red') {
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
    const wander = wanderVector(blob, world, rng)
    dx += wander.x * 0.35
    dy += wander.y * 0.35
  } else {
    let best = -1
    let bestScore = -Infinity
    let bestDist = 0
    let nearestTree = -1
    let nearestDist = Infinity
    for (const tree of world.trees) {
      const d = Math.hypot(tree.x - blob.x, tree.y - blob.y)
      if (d > vision) continue
      if (d < nearestDist) {
        nearestDist = d
        nearestTree = tree.id
      }
      if (tree.fruit <= 0) continue
      let score = tree.fruit / (d + 34)
      if (tree.id === blob.targetTree) score *= 1.28
      if (score > bestScore) {
        bestScore = score
        best = tree.id
        bestDist = d
      }
    }

    if (best >= 0) {
      const tree = world.trees[best]
      blob.targetTree = best
      const reach = CONST.eatReach + 8 * tree.scale
      if (bestDist <= reach && tree.fruit > 0) {
        tree.fruit--
        tree.delay = params.fruitDelay
        blob.energy = Math.min(CONST.maxEnergy, blob.energy + CONST.fruitEnergy)
        blob.meals++
        blob.glow = 0.7
        world.totals.fruitEaten++
        addSpark(world, { kind: 'eat', x: blob.x, y: blob.y, z: 12, life: 0.55, tint: 'fruit' })
        blob.action = 'eat'
        blob.actionTimer = params.blueEatTime
        blob.actionTotal = params.blueEatTime
        blob.squash = 0.5
        blob.vx *= 0.3
        blob.vy *= 0.3
        applyMotion(world, blob, dt)
        return
      }
      action = 'seek'
      dx = tree.x - blob.x
      dy = tree.y - blob.y
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
      const wander = wanderVector(blob, world, rng)
      dx += wander.x * 0.5
      dy += wander.y * 0.5
    } else if (nearestTree >= 0) {
      const tree = world.trees[nearestTree]
      const toTree = Math.hypot(tree.x - blob.x, tree.y - blob.y)
      action = 'gather'
      blob.targetTree = nearestTree
      const wander = wanderVector(blob, world, rng)
      const pull = toTree > 46 ? 1.1 : -0.25
      dx = ((tree.x - blob.x) / (toTree || 1)) * pull + wander.x * 0.9 + sepX * 0.6
      dy = ((tree.y - blob.y) / (toTree || 1)) * pull + wander.y * 0.9 + sepY * 0.6
    } else {
      action = 'wander'
      blob.targetTree = -1
      const wander = wanderVector(blob, world, rng)
      dx = wander.x + sepX * 0.5
      dy = wander.y + sepY * 0.5
    }
  }

  blob.action = action
  const cruise = action === 'gather' ? maxSpeed * 0.55 : maxSpeed
  steer(blob, dx, dy, cruise, dt, agility)
  applyMotion(world, blob, dt)
}

function countCrowding(blob: Blob, grid: Grid) {
  let n = 0
  const range2 = CONST.interferenceRange * CONST.interferenceRange
  grid.query(blob.x, blob.y, CONST.interferenceRange, (other) => {
    if (other === blob || other.group !== 'red') return
    const dx = other.x - blob.x
    const dy = other.y - blob.y
    if (dx * dx + dy * dy < range2) n++
  })
  blob.crowding = n
}

function stepRed(world: World, params: Params, blob: Blob, grid: Grid, rng: Rng, dt: number) {
  countCrowding(blob, grid)
  if (blob.actionTimer > 0) {
    holdStill(world, blob, dt, blob.action === 'contact' ? 0.75 : 0.88)
    return
  }

  const vision = groupVision(params, blob)
  const maxSpeed = groupSpeed(params, blob)
  const hunt: { prey: Blob | null } = { prey: null }
  let bestScore = -Infinity
  let sepX = 0
  let sepY = 0
  grid.query(blob.x, blob.y, Math.max(vision, CONST.separationRange), (other) => {
    if (other === blob) return
    const dx = other.x - blob.x
    const dy = other.y - blob.y
    const d2 = dx * dx + dy * dy
    if (other.group === 'blue') {
      const hidden = other.sheltered && other.action !== 'eat' && other.action !== 'digest'
      const reach = hidden ? vision * CONST.shelterFactor : vision
      if (d2 > reach * reach) return
      if (other.immunity > 0) return
      const d = Math.sqrt(d2)
      let score = 1 - d / vision
      if (other.action === 'eat' || other.action === 'digest') score += 1.2
      else if (other.action === 'gather' || other.action === 'seek') score += 0.2
      if (other.id === blob.targetBlob) score += 0.18
      if (score > bestScore) {
        bestScore = score
        hunt.prey = other
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
  const prey = hunt.prey
  if (prey) {
    const d = Math.hypot(prey.x - blob.x, prey.y - blob.y)
    blob.targetBlob = prey.id
    if (d <= CONST.contactReach) {
      const taken = Math.min(params.redStrength, Math.max(0, prey.energy))
      prey.energy -= params.redStrength
      prey.squash = 0.85
      prey.glow = 0.45
      prey.immunity = CONST.contactImmunity
      prey.panic = CONST.panicTime
      if (prey.action === 'eat' || prey.action === 'digest') {
        prey.action = 'flee'
        prey.actionTimer = 0
        prey.actionTotal = 0
      }
      blob.energy = Math.min(CONST.maxEnergy, blob.energy + taken * CONST.contactEfficiency)
      blob.glow = 0.9
      blob.squash = 0.6
      blob.action = 'contact'
      blob.actionTimer = CONST.contactTime
      blob.actionTotal = CONST.contactTime + params.redPause
      world.totals.contacts++
      addSpark(world, {
        kind: 'contact',
        x: (blob.x + prey.x) / 2,
        y: (blob.y + prey.y) / 2,
        z: 10,
        life: 0.65,
        tint: 'red',
      })
      blob.vx *= 0.2
      blob.vy *= 0.2
      applyMotion(world, blob, dt)
      return
    }
    action = 'hunt'
    dx = (prey.x - blob.x) / (d || 1) + sepX * 0.35
    dy = (prey.y - blob.y) / (d || 1) + sepY * 0.35
  } else {
    blob.targetBlob = -1
    action = 'wander'
    const wander = wanderVector(blob, world, rng)
    dx = wander.x + sepX * 0.6
    dy = wander.y + sepY * 0.6
  }

  blob.action = action
  const thin = 1 - clamp01(blob.energy / (CONST.maxEnergy * 0.5))
  const cruise = action === 'hunt' ? maxSpeed : maxSpeed * (0.72 - 0.34 * thin)
  steer(blob, dx, dy, cruise, dt, action === 'hunt' ? 1.2 : 1)
  applyMotion(world, blob, dt)
}

function tryCopy(world: World, params: Params, blob: Blob, born: Blob[], rng: Rng) {
  const threshold = blob.group === 'blue' ? params.blueCopy : params.redCopy
  if (blob.energy < threshold) return
  if (world.blobs.length + born.length >= CONST.populationCap) {
    world.capReached = true
    return
  }
  const share = (blob.energy * (1 - CONST.birthCost)) / 2
  blob.energy = share
  blob.copyCooldown = CONST.copyCooldown
  blob.children++
  blob.action = 'birth'
  blob.actionTimer = CONST.birthLock
  blob.actionTotal = CONST.birthLock
  blob.squash = 0.7
  const angle = rng.next() * TAU
  const offset = CONST.blobRadius * 1.8
  const child = makeBlob(
    world.nextId++,
    blob.group,
    blob.x + Math.cos(angle) * offset,
    blob.y + Math.sin(angle) * offset,
    share,
    {
      speed: mutate(blob.traits.speed, rng),
      vision: mutate(blob.traits.vision, rng),
      thrift: mutate(blob.traits.thrift, rng),
    },
    rng,
    blob.generation + 1,
    blob.id,
  )
  child.copyCooldown = CONST.copyCooldown
  child.squash = 1
  const r = Math.hypot(child.x, child.y)
  const edge = world.radius - CONST.blobRadius - 2
  if (r > edge) {
    child.x *= edge / r
    child.y *= edge / r
  }
  born.push(child)
  world.totals.births[blob.group]++
  addSpark(world, { kind: 'birth', x: blob.x, y: blob.y, z: 10, life: 0.55, tint: blob.group })
}

export function meanTrait(world: World, group: Group, trait: keyof Traits): number | null {
  let sum = 0
  let n = 0
  for (const blob of world.blobs) {
    if (blob.group !== group) continue
    sum += blob.traits[trait]
    n++
  }
  return n ? sum / n : null
}
