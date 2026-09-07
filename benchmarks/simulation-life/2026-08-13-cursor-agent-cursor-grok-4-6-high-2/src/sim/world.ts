import type { Params } from './params'
import { Rng } from './rng'
import type { Action, Berry, Blob, Kind, Spark, Traits, Tree, World } from './types'

export const DT = 1 / 24

export const C = {
  maxEnergy: 110,
  fruitEnergy: 32,
  contactKeep: 1.42,
  copyTax: 0.22,
  copyShare: 0.46,
  copyCool: 7.5,
  eatReach: 16,
  contactReach: 12,
  idleFrac: 0.28,
  turn: 6.5,
  sepRange: 24,
  crowdRange: 48,
  edge: 0.84,
  blobR: 6.5,
  contactTime: 0.5,
  immunity: 2.6,
  mutation: 0.06,
  traitLo: 0.55,
  traitHi: 1.7,
  popCap: 320,
  wander: 0.42,
  fleePow: 2.2,
  huntPow: 1.45,
  hunger: 0.72,
  shelter: 28,
  scramble: 0.09,
}

const TAU = Math.PI * 2

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function hypot2(dx: number, dy: number) {
  return dx * dx + dy * dy
}

function mutate(v: number, rng: Rng) {
  return clamp(v * (1 + rng.normal() * C.mutation), C.traitLo, C.traitHi)
}

function traits(rng: Rng): Traits {
  return {
    speed: 1 + rng.normal() * 0.04,
    vision: 1 + rng.normal() * 0.04,
    nerve: 1 + rng.normal() * 0.04,
  }
}

function inherit(parent: Traits, rng: Rng): Traits {
  return {
    speed: mutate(parent.speed, rng),
    vision: mutate(parent.vision, rng),
    nerve: mutate(parent.nerve, rng),
  }
}

function spark(kind: Spark['kind'], x: number, y: number, hue: Spark['hue'], rng: Rng): Spark {
  return { kind, x, y, z: rng.range(8, 18), life: 0.55, max: 0.55, hue, seed: rng.next() }
}

function makeBerry(rng: Rng): Berry {
  return {
    angle: rng.next() * TAU,
    lift: rng.range(10, 18),
    spread: rng.range(6, 14),
    ripe: false,
    cool: 0,
    grow: 0,
    size: rng.range(0.78, 1.15),
  }
}

function makeTree(id: number, x: number, y: number, rng: Rng, params: Params): Tree {
  const scale = rng.range(0.78, 1.22)
  const n = Math.max(3, params.fruitLimit)
  const berries: Berry[] = []
  for (let i = 0; i < n; i++) berries.push(makeBerry(rng))
  const startRipe = Math.max(1, Math.round(n * rng.range(0.35, 0.7)))
  for (let i = 0; i < berries.length; i++) {
    if (i < startRipe) {
      berries[i]!.ripe = true
      berries[i]!.grow = 1
    } else {
      berries[i]!.cool = rng.range(0, params.fruitDelay * 0.6)
      berries[i]!.grow = rng.range(0, 0.5)
    }
  }
  return { id, x, y, scale, lean: rng.range(-0.18, 0.18), berries, canopy: 16 * scale }
}

function makeBlob(
  id: number,
  kind: Kind,
  x: number,
  y: number,
  energy: number,
  t: Traits,
  rng: Rng,
  generation: number,
  parentId: number,
  family: number,
): Blob {
  const heading = rng.next() * TAU
  return {
    id,
    kind,
    x,
    y,
    vx: Math.cos(heading) * 3,
    vy: Math.sin(heading) * 3,
    heading,
    energy,
    age: 0,
    action: 'wander',
    actionTimer: 0,
    actionTotal: 0,
    copyCool: rng.range(1, C.copyCool),
    targetTree: -1,
    targetBlob: -1,
    targetBerry: -1,
    immunity: 0,
    traits: t,
    generation,
    parentId,
    family,
    meals: 0,
    children: 0,
    phase: rng.next() * TAU,
    blink: rng.range(1.2, 5.5),
    blinkFor: 0,
    squash: 0,
    glow: 0,
    hop: 0,
  }
}

function placeApart(rng: Rng, radius: number, existing: { x: number; y: number }[], minDist: number, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const p = rng.inDisc(radius)
    if (existing.every((e) => hypot2(e.x - p.x, e.y - p.y) > minDist * minDist)) return p
  }
  return rng.inDisc(radius)
}

export function createWorld(params: Params): World {
  const rng = new Rng(params.seed)
  const radius = params.worldSize
  const trees: Tree[] = []
  const spots: { x: number; y: number }[] = []
  const minTree = Math.max(22, radius * 0.14)
  for (let i = 0; i < params.trees; i++) {
    const p = placeApart(rng, radius * 0.78, spots, minTree)
    spots.push(p)
    trees.push(makeTree(i, p.x, p.y, rng, params))
  }

  const blobs: Blob[] = []
  let nextId = 1
  const startEnergy = (kind: Kind) => (kind === 'blue' ? rng.range(46, 64) : rng.range(50, 70))

  const placeKind = (kind: Kind, n: number) => {
    for (let i = 0; i < n; i++) {
      let p: { x: number; y: number }
      if (kind === 'blue' && trees.length) {
        const tree = rng.pick(trees)
        const j = rng.inDisc(28)
        p = { x: tree.x + j.x, y: tree.y + j.y }
        const r = Math.hypot(p.x, p.y)
        if (r > radius * 0.86) {
          p.x *= (radius * 0.86) / r
          p.y *= (radius * 0.86) / r
        }
      } else {
        p = rng.inDisc(radius * 0.8)
      }
      const id = nextId++
      blobs.push(makeBlob(id, kind, p.x, p.y, startEnergy(kind), traits(rng), rng, 0, 0, id))
    }
  }
  placeKind('blue', params.blueStart)
  placeKind('red', params.redStart)

  const world: World = {
    t: 0,
    steps: 0,
    radius,
    trees,
    blobs,
    sparks: [],
    nextId,
    counts: { fruit: 0, blue: 0, red: 0 },
    totals: {
      births: { fruit: 0, blue: 0, red: 0 },
      deaths: { fruit: 0, blue: 0, red: 0 },
      eaten: 0,
      contacts: 0,
    },
    extinctAt: { blue: null, red: null },
    peaked: false,
  }
  recount(world)
  return world
}

export function ripeCount(tree: Tree): number {
  let n = 0
  for (const b of tree.berries) if (b.ripe) n++
  return n
}

export function fruitTotal(world: World): number {
  let n = 0
  for (const t of world.trees) n += ripeCount(t)
  return n
}

function recount(world: World) {
  let blue = 0
  let red = 0
  for (const b of world.blobs) {
    if (b.kind === 'blue') blue++
    else red++
  }
  world.counts.blue = blue
  world.counts.red = red
  world.counts.fruit = fruitTotal(world)
  if (blue === 0 && world.extinctAt.blue === null) world.extinctAt.blue = world.t
  if (red === 0 && world.extinctAt.red === null) world.extinctAt.red = world.t
  if (blue + red > 0) world.extinctAt = { blue: blue ? null : world.extinctAt.blue, red: red ? null : world.extinctAt.red }
}

export function meanEnergy(world: World, kind: Kind): number {
  let s = 0
  let n = 0
  for (const b of world.blobs) {
    if (b.kind !== kind) continue
    s += b.energy
    n++
  }
  return n ? s / n : 0
}

export function meanTrait(world: World, kind: Kind, key: keyof Traits): number {
  let s = 0
  let n = 0
  for (const b of world.blobs) {
    if (b.kind !== kind) continue
    s += b.traits[key]
    n++
  }
  return n ? s / n : 1
}

function growFruit(world: World, params: Params) {
  const limit = Math.max(1, Math.round(params.fruitLimit))
  for (const tree of world.trees) {
    while (tree.berries.length < limit) {
      tree.berries.push({
        angle: tree.berries.length * 1.7,
        lift: 12,
        spread: 9,
        ripe: false,
        cool: params.fruitDelay * 0.4,
        grow: 0,
        size: 1,
      })
    }
    for (let i = 0; i < tree.berries.length; i++) {
      const berry = tree.berries[i]!
      if (i >= limit) {
        if (berry.ripe) berry.ripe = false
        continue
      }
      if (berry.ripe) continue
      if (berry.cool > 0) {
        berry.cool -= DT
        continue
      }
      berry.grow += params.fruitGrowth * DT
      if (berry.grow >= 1) {
        berry.grow = 1
        berry.ripe = true
      }
    }
  }
}

function nearestRipe(blob: Blob, trees: Tree[], vision: number): { tree: Tree; berry: number; d2: number } | null {
  const v2 = vision * vision
  let best: { tree: Tree; berry: number; d2: number } | null = null
  for (const tree of trees) {
    const td2 = hypot2(tree.x - blob.x, tree.y - blob.y)
    if (td2 > (vision + tree.canopy) * (vision + tree.canopy)) continue
    for (let i = 0; i < tree.berries.length; i++) {
      const berry = tree.berries[i]!
      if (!berry.ripe) continue
      const d2 = hypot2(tree.x - blob.x, tree.y - blob.y)
      if (d2 < v2 && (!best || d2 < best.d2)) best = { tree, berry: i, d2 }
    }
  }
  return best
}

function nearestBlob(blob: Blob, blobs: Blob[], kind: Kind, vision: number, pred?: (b: Blob) => boolean): Blob | null {
  const v2 = vision * vision
  let best: Blob | null = null
  let bestD = v2
  for (const other of blobs) {
    if (other === blob || other.kind !== kind) continue
    if (pred && !pred(other)) continue
    const d2 = hypot2(other.x - blob.x, other.y - blob.y)
    if (d2 < bestD) {
      bestD = d2
      best = other
    }
  }
  return best
}

function busy(blob: Blob) {
  return blob.action === 'eat' || blob.action === 'rest' || blob.action === 'contact'
}

function setAction(blob: Blob, action: Action, time = 0) {
  blob.action = action
  blob.actionTimer = time
  blob.actionTotal = time
}

function steerBlue(blob: Blob, world: World, params: Params, rng: Rng) {
  const vision = params.blueVision * blob.traits.vision
  let wx = 0
  let wy = 0
  let crowded = 0

  for (const other of world.blobs) {
    if (other === blob) continue
    const dx = blob.x - other.x
    const dy = blob.y - other.y
    const d2 = hypot2(dx, dy)
    if (d2 < C.sepRange * C.sepRange && d2 > 0.01) {
      const d = Math.sqrt(d2)
      const w = (C.sepRange - d) / C.sepRange
      wx += (dx / d) * w
      wy += (dy / d) * w
      crowded++
    }
    if (other.kind === 'red' && d2 < vision * vision * 1.15) {
      const d = Math.sqrt(d2) || 0.01
      const fear = Math.pow(1 - d / (vision * 1.07), 1.4) * C.fleePow * blob.traits.nerve
      wx += (dx / d) * fear * 3.2
      wy += (dy / d) * fear * 3.2
      if (d < vision * 0.72) setAction(blob, 'flee')
    }
  }

  const hungry = blob.energy < params.blueCopy * C.hunger
  if (world.counts.blue <= 24 && world.trees.length) {
    let best = world.trees[0]!
    let bestD = hypot2(best.x - blob.x, best.y - blob.y)
    for (const tree of world.trees) {
      const d2 = hypot2(tree.x - blob.x, tree.y - blob.y)
      if (d2 < bestD) {
        best = tree
        bestD = d2
      }
    }
    const d = Math.sqrt(bestD) || 0.01
    wx += ((best.x - blob.x) / d) * 3.6
    wy += ((best.y - blob.y) / d) * 3.6
    blob.targetTree = best.id
    setAction(blob, 'gather')
  }
  const fruit = nearestRipe(blob, world.trees, vision * (hungry ? 1.15 : 0.7))
  if (fruit && blob.action !== 'flee' && (hungry || fruit.d2 < 38 * 38)) {
    const dx = fruit.tree.x - blob.x
    const dy = fruit.tree.y - blob.y
    const d = Math.sqrt(fruit.d2) || 0.01
    wx += (dx / d) * (hungry ? 2.3 : 0.9)
    wy += (dy / d) * (hungry ? 2.3 : 0.9)
    blob.targetTree = fruit.tree.id
    blob.targetBerry = fruit.berry
    setAction(blob, hungry ? 'seek-fruit' : 'gather')
  } else if (blob.action !== 'flee' && world.counts.blue > 24) {
    blob.targetTree = -1
    blob.targetBerry = -1
    blob.heading += rng.normal() * 1.4 * DT
    wx += Math.cos(blob.heading) * C.wander
    wy += Math.sin(blob.heading) * C.wander
    if (crowded > 3) setAction(blob, 'avoid')
    else setAction(blob, 'wander')
  }

  return { wx, wy }
}

function steerRed(blob: Blob, world: World, params: Params, rng: Rng) {
  const vision = params.redVision * blob.traits.vision
  let wx = 0
  let wy = 0

  for (const other of world.blobs) {
    if (other === blob) continue
    const dx = blob.x - other.x
    const dy = blob.y - other.y
    const d2 = hypot2(dx, dy)
    if (other.kind === 'red' && d2 < C.sepRange * C.sepRange && d2 > 0.01) {
      const d = Math.sqrt(d2)
      const w = (C.sepRange - d) / C.sepRange
      wx += (dx / d) * w * 0.28
      wy += (dy / d) * w * 0.28
    }
  }

  const prey = nearestBlob(blob, world.blobs, 'blue', vision)
  if (prey) {
    const dx = prey.x - blob.x
    const dy = prey.y - blob.y
    const d = Math.hypot(dx, dy) || 0.01
    wx += (dx / d) * C.huntPow * 2.4
    wy += (dy / d) * C.huntPow * 2.4
    blob.targetBlob = prey.id
    setAction(blob, 'hunt')
  } else {
    blob.targetBlob = -1
    blob.heading += rng.normal() * 1.6 * DT
    wx += Math.cos(blob.heading) * C.wander
    wy += Math.sin(blob.heading) * C.wander
    setAction(blob, 'wander')
  }
  return { wx, wy }
}

function keepInDish(blob: Blob, radius: number, wx: number, wy: number) {
  const r = Math.hypot(blob.x, blob.y)
  const rim = radius * C.edge
  if (r > rim) {
    const over = (r - rim) / (radius - rim + 0.01)
    wx -= (blob.x / r) * over * 3.4
    wy -= (blob.y / r) * over * 3.4
  }
  return { wx, wy }
}

function integrate(blob: Blob, wx: number, wy: number, maxSpeed: number) {
  const mag = Math.hypot(wx, wy)
  let tx = 0
  let ty = 0
  if (mag > 0.001) {
    tx = (wx / mag) * maxSpeed
    ty = (wy / mag) * maxSpeed
    blob.heading = Math.atan2(ty, tx)
  }
  blob.vx += (tx - blob.vx) * C.turn * DT
  blob.vy += (ty - blob.vy) * C.turn * DT
  const sp = Math.hypot(blob.vx, blob.vy)
  if (sp > maxSpeed) {
    blob.vx *= maxSpeed / sp
    blob.vy *= maxSpeed / sp
  }
  blob.x += blob.vx * DT
  blob.y += blob.vy * DT
}

function spend(blob: Blob, params: Params, world: World) {
  const upkeep = blob.kind === 'blue' ? params.blueUpkeep : params.redUpkeep
  const speed = Math.hypot(blob.vx, blob.vy)
  const cap = blob.kind === 'blue' ? params.blueSpeed : params.redSpeed
  const moving = cap > 0 ? Math.min(1, speed / cap) : 0
  let rate = upkeep * (C.idleFrac + (1 - C.idleFrac) * moving)
  if (blob.kind === 'red') {
    let near = 0
    for (const other of world.blobs) {
      if (other === blob || other.kind !== 'red') continue
      if (hypot2(other.x - blob.x, other.y - blob.y) < C.crowdRange * C.crowdRange) near++
    }
    rate += near * C.scramble * (1 + near * 0.12)
  } else {
    let near = 0
    for (const other of world.blobs) {
      if (other === blob || other.kind !== 'blue') continue
      if (hypot2(other.x - blob.x, other.y - blob.y) < C.sepRange * C.sepRange) near++
    }
    rate += near * 0.09
  }
  blob.energy -= rate * DT
}

function tryEat(blob: Blob, world: World, params: Params, rng: Rng) {
  if (blob.kind !== 'blue' || busy(blob)) return
  for (const tree of world.trees) {
    if (hypot2(tree.x - blob.x, tree.y - blob.y) > (C.eatReach + tree.canopy * 0.35) ** 2) continue
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < tree.berries.length; i++) {
      const berry = tree.berries[i]!
      if (!berry.ripe) continue
      const d2 = hypot2(tree.x - blob.x, tree.y - blob.y)
      if (d2 < bestD) {
        bestD = d2
        best = i
      }
    }
    if (best < 0) continue
    const berry = tree.berries[best]!
    berry.ripe = false
    berry.grow = 0
    berry.cool = params.fruitDelay
    blob.energy = Math.min(C.maxEnergy, blob.energy + C.fruitEnergy)
    blob.meals++
    world.totals.eaten++
    setAction(blob, 'eat', params.blueEatTime)
    blob.squash = 1
    blob.glow = 1
    blob.vx *= 0.15
    blob.vy *= 0.15
    world.sparks.push(spark('eat', blob.x, blob.y, 'fruit', rng))
    return
  }
}

function nearTree(blob: Blob, trees: Tree[], radius = C.shelter): boolean {
  const r2 = radius * radius
  for (const tree of trees) {
    if (hypot2(tree.x - blob.x, tree.y - blob.y) < r2) return true
  }
  return false
}

function tryContact(blob: Blob, world: World, params: Params, rng: Rng) {
  if (blob.kind !== 'red' || busy(blob)) return
  for (const other of world.blobs) {
    if (other.kind !== 'blue' || other.immunity > 0) continue
    const hiding = nearTree(other, world.trees)
    const cover = world.counts.blue <= 22 ? 0.28 : 0.58
    const reach = hiding ? C.contactReach * cover : C.contactReach
    if (hypot2(other.x - blob.x, other.y - blob.y) > reach * reach) continue
    const taken = Math.min(other.energy, params.redStrength)
    other.energy -= taken
    other.immunity = C.immunity
    other.squash = 0.7
    blob.energy = Math.min(C.maxEnergy, blob.energy + taken * C.contactKeep)
    blob.meals++
    world.totals.contacts++
    setAction(blob, 'contact', C.contactTime)
    blob.actionTimer = C.contactTime
    blob.glow = 1
    blob.squash = 1
    blob.vx *= 0.2
    blob.vy *= 0.2
    other.glow = 0.6
    world.sparks.push(spark('contact', (blob.x + other.x) / 2, (blob.y + other.y) / 2, 'red', rng))
    return
  }
}

function finishContact(blob: Blob, params: Params) {
  if (blob.kind === 'red' && blob.action === 'contact' && blob.actionTimer <= 0) {
    setAction(blob, 'rest', params.redPause)
  }
}

function tryCopy(blob: Blob, world: World, params: Params, rng: Rng) {
  if (busy(blob) || blob.copyCool > 0 || blob.age < 8 || blob.meals < 1) return
  if (world.blobs.length >= C.popCap) {
    world.peaked = true
    return
  }
  const need = blob.kind === 'blue' ? params.blueCopy : params.redCopy
  if (blob.energy < need) return
  const share = need * C.copyShare
  const tax = share * C.copyTax
  blob.energy -= share + tax
  blob.copyCool = C.copyCool
  blob.meals = 0
  blob.children++
  const jitter = rng.inDisc(10)
  const child = makeBlob(
    world.nextId++,
    blob.kind,
    blob.x + jitter.x,
    blob.y + jitter.y,
    share,
    inherit(blob.traits, rng),
    rng,
    blob.generation + 1,
    blob.id,
    blob.family,
  )
  child.copyCool = C.copyCool * 0.6
  world.blobs.push(child)
  world.totals.births[blob.kind]++
  world.sparks.push(spark('birth', blob.x, blob.y, blob.kind, rng))
}

function tickAnim(blob: Blob, rng: Rng) {
  blob.age += DT
  blob.copyCool = Math.max(0, blob.copyCool - DT)
  blob.immunity = Math.max(0, blob.immunity - DT)
  blob.glow = Math.max(0, blob.glow - DT * 1.8)
  blob.squash = Math.max(0, blob.squash - DT * 2.4)
  if (blob.actionTimer > 0) {
    blob.actionTimer = Math.max(0, blob.actionTimer - DT)
    if (blob.action === 'eat') blob.squash = 0.45 + Math.sin(worldless(blob) * 14) * 0.2
  }
  blob.blink -= DT
  if (blob.blinkFor > 0) {
    blob.blinkFor -= DT
  } else if (blob.blink <= 0) {
    blob.blinkFor = 0.12
    blob.blink = rng.range(1.4, 5.8)
  }
  const moving = Math.hypot(blob.vx, blob.vy)
  blob.hop = moving > 4 ? Math.abs(Math.sin(blob.age * 10 + blob.phase)) : blob.hop * 0.9
}

function worldless(blob: Blob) {
  return blob.age + blob.phase
}

function tickSparks(world: World) {
  for (const s of world.sparks) s.life -= DT
  world.sparks = world.sparks.filter((s) => s.life > 0)
}

export function step(world: World, params: Params, rng: Rng) {
  world.t += DT
  world.steps++
  growFruit(world, params)

  for (const blob of world.blobs) {
    tickAnim(blob, rng)

    if (busy(blob)) {
      blob.vx *= 0.55
      blob.vy *= 0.55
      blob.x += blob.vx * DT
      blob.y += blob.vy * DT
      if (blob.action === 'eat' && blob.actionTimer > 0) {
        blob.squash = 0.5 + Math.sin(blob.age * 16) * 0.22
      }
      finishContact(blob, params)
      if (blob.action === 'eat' && blob.actionTimer <= 0) setAction(blob, 'wander')
      if (blob.action === 'rest' && blob.actionTimer <= 0) setAction(blob, 'wander')
    } else {
      const steered = blob.kind === 'blue' ? steerBlue(blob, world, params, rng) : steerRed(blob, world, params, rng)
      const wall = keepInDish(blob, world.radius, steered.wx, steered.wy)
      const maxSpeed = (blob.kind === 'blue' ? params.blueSpeed : params.redSpeed) * blob.traits.speed
      integrate(blob, wall.wx, wall.wy, maxSpeed)
      tryEat(blob, world, params, rng)
      tryContact(blob, world, params, rng)
    }

    spend(blob, params, world)
    tryCopy(blob, world, params, rng)
  }

  const alive: Blob[] = []
  for (const blob of world.blobs) {
    if (blob.energy > 0) alive.push(blob)
    else {
      world.totals.deaths[blob.kind]++
      world.sparks.push(spark('pop', blob.x, blob.y, blob.kind, rng))
    }
  }
  world.blobs = alive
  tickSparks(world)
  recount(world)
}

export function pickBlob(world: World, x: number, y: number, reach = 14): Blob | null {
  let best: Blob | null = null
  let bestD = reach * reach
  for (const blob of world.blobs) {
    const d2 = hypot2(blob.x - x, blob.y - y)
    if (d2 < bestD) {
      bestD = d2
      best = blob
    }
  }
  return best
}
