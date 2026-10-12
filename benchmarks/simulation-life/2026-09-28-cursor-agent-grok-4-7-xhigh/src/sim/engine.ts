import { clamp, mulberry32 } from './rng'
import type { Agent, Fruit, Kind, Params, Sample, Tree, World } from './types'

const TUNING = {
  fruitEnergy: 20,
  blueIdle: 0.036,
  blueMove: 0.082,
  redIdle: 0.048,
  redMove: 0.1,
  speed: 0.066,
  eatRange: 0.95,
  contactRange: 1.18,
  blueFleeBoost: 1.42,
  redPounceBoost: 1.18,
  birthCooldown: 68,
  giftRatio: 0.33,
  wasteRatio: 0.2,
  contactLossRatio: 0.5,
  contactCooldown: 44,
  blueStart: 64,
  redStart: 46,
  crowdRadius: 1.5,
  maxBlue: 140,
  maxRed: 160,
  sampleStride: 4,
  historyCap: 3000,
  closeDanger: 1.12,
  scareRadius: 1.72,
  hungryEnergy: 38,
}

let epochSeq = 1

export function createWorld(input: Params): World {
  const params = { ...input }
  const world: World = {
    epoch: epochSeq++,
    params,
    baked: {
      startTrees: Math.round(params.startTrees),
      startBlue: Math.round(params.startBlue),
      startRed: Math.round(params.startRed),
      worldSize: params.worldSize,
      seed: Math.round(params.seed),
    },
    radius: params.worldSize,
    tick: 0,
    rng: mulberry32(Math.round(params.seed) || 1),
    trees: [],
    agents: [],
    nextId: 1,
    nextFruitId: 1,
    history: [],
    sampleStride: TUNING.sampleStride,
    events: [],
    bornBlue: 0,
    bornRed: 0,
    diedBlue: 0,
    diedRed: 0,
    hitCap: false,
  }
  placeTrees(world)
  placeAgents(world)
  record(world)
  return world
}

export function stepWorld(world: World) {
  world.events = []
  world.tick += 1
  for (const agent of world.agents) {
    if (agent.contactCd > 0) agent.contactCd -= 1
    if (agent.birthCd > 0) agent.birthCd -= 1
    agent.age += 1
  }
  syncFruitLimit(world)
  growFruits(world)
  for (const agent of world.agents) updateAgent(world, agent)
  const alive: Agent[] = []
  for (const agent of world.agents) {
    if (agent.energy > 0 && Number.isFinite(agent.energy)) {
      alive.push(agent)
      continue
    }
    releaseFruit(world, agent.id)
    world.events.push({ kind: 'fade', x: agent.x, z: agent.z, group: agent.kind })
    if (agent.kind === 'blue') world.diedBlue += 1
    else world.diedRed += 1
  }
  world.agents = alive
  const parents = alive.slice()
  for (const agent of parents) tryBirth(world, agent)
  if (world.tick % world.sampleStride === 0) record(world)
  if (world.history.length > TUNING.historyCap) {
    world.history = world.history.filter((_, index) => index % 2 === 0)
    world.sampleStride *= 2
  }
}

export function setupMismatch(world: World, params: Params) {
  const baked = world.baked
  return (
    baked.startTrees !== Math.round(params.startTrees) ||
    baked.startBlue !== Math.round(params.startBlue) ||
    baked.startRed !== Math.round(params.startRed) ||
    baked.worldSize !== params.worldSize ||
    baked.seed !== Math.round(params.seed)
  )
}

export function tally(world: World) {
  let fruit = 0
  let ripe = 0
  for (const tree of world.trees) {
    for (const item of tree.fruits) {
      fruit += item.growth
      if (item.growth >= 1 && item.reservedBy == null) ripe += 1
    }
  }
  const actions: Record<string, number> = {}
  let blue = 0
  let red = 0
  for (const agent of world.agents) {
    if (agent.kind === 'blue') blue += 1
    else red += 1
    const key = `${agent.kind}:${agent.action}`
    actions[key] = (actions[key] ?? 0) + 1
  }
  return { tick: world.tick, fruit, ripe, blue, red, actions }
}

function record(world: World) {
  world.history.push(takeSample(world))
}

function takeSample(world: World): Sample {
  let fruit = 0
  let ripe = 0
  for (const tree of world.trees) {
    for (const item of tree.fruits) {
      fruit += item.growth
      if (item.growth >= 1) ripe += 1
    }
  }
  const mean = (kind: Kind, pick: (agent: Agent) => number) => {
    let sum = 0
    let count = 0
    for (const agent of world.agents) {
      if (agent.kind !== kind) continue
      sum += pick(agent)
      count += 1
    }
    return count ? sum / count : null
  }
  let blue = 0
  let red = 0
  for (const agent of world.agents) {
    if (agent.kind === 'blue') blue += 1
    else red += 1
  }
  return {
    tick: world.tick,
    fruit,
    ripe,
    blue,
    red,
    blueSpeed: mean('blue', (agent) => agent.traitSpeed),
    redSpeed: mean('red', (agent) => agent.traitSpeed),
    blueVision: mean('blue', (agent) => agent.traitVision),
    redVision: mean('red', (agent) => agent.traitVision),
    blueMetabolism: mean('blue', (agent) => agent.traitMetabolism),
    redMetabolism: mean('red', (agent) => agent.traitMetabolism),
  }
}

function placeTrees(world: World) {
  const count = clamp(world.baked.startTrees, 1, 14)
  const inner = world.radius * 0.7
  const gap = Math.max(1.7, world.radius * 0.18)
  const spots: { x: number; z: number }[] = []
  let guard = 0
  while (spots.length < count && guard < 4000) {
    guard += 1
    const angle = world.rng() * Math.PI * 2
    const radius = Math.sqrt(world.rng()) * inner
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    if (spots.every((spot) => Math.hypot(spot.x - x, spot.z - z) >= gap)) spots.push({ x, z })
  }
  let extra = 0
  while (spots.length < count) {
    const angle = extra * 2.399963
    const radius = inner * (0.28 + (extra % 5) * 0.13)
    spots.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius })
    extra += 1
  }
  spots.forEach((spot, index) => {
    const tree: Tree = {
      id: index + 1,
      x: spot.x,
      z: spot.z,
      yaw: world.rng() * Math.PI * 2,
      scale: 0.86 + world.rng() * 0.28,
      fruits: [],
    }
    const limit = clamp(Math.round(world.params.fruitLimit), 1, 12)
    for (let i = 0; i < limit; i += 1) addFruit(world, tree, true)
    world.trees.push(tree)
  })
}

function addFruit(world: World, tree: Tree, ripe: boolean) {
  const index = tree.fruits.length
  const angle = tree.yaw + index * 2.399963
  const radius = (0.98 + (index % 4) * 0.11) * tree.scale
  const fruit: Fruit = {
    id: world.nextFruitId++,
    treeId: tree.id,
    index,
    lx: Math.cos(angle) * radius,
    lz: Math.sin(angle) * radius,
    ly: 0.46 + (index % 3) * 0.14,
    x: 0,
    z: 0,
    growth: ripe ? 1 : 0,
    delay: ripe ? 0 : Math.round(world.params.fruitDelay * (0.35 + world.rng() * 0.4)),
    reservedBy: null,
  }
  fruit.x = tree.x + fruit.lx
  fruit.z = tree.z + fruit.lz
  tree.fruits.push(fruit)
}

function syncFruitLimit(world: World) {
  const limit = clamp(Math.round(world.params.fruitLimit), 1, 12)
  for (const tree of world.trees) {
    while (tree.fruits.length < limit) addFruit(world, tree, false)
    while (tree.fruits.length > limit) {
      let drop = -1
      let best = Infinity
      for (let i = 0; i < tree.fruits.length; i += 1) {
        const fruit = tree.fruits[i]
        if (fruit.reservedBy != null) continue
        if (fruit.growth < best) {
          best = fruit.growth
          drop = i
        }
      }
      if (drop < 0) break
      tree.fruits.splice(drop, 1)
    }
  }
}

function growFruits(world: World) {
  const rate = Math.max(0, world.params.fruitGrowth)
  const delayMax = Math.max(0, world.params.fruitDelay)
  for (const tree of world.trees) {
    for (const fruit of tree.fruits) {
      if (fruit.delay > delayMax) fruit.delay = delayMax
      if (fruit.reservedBy != null || fruit.growth >= 1) continue
      if (fruit.delay > 0) {
        fruit.delay -= 1
        continue
      }
      fruit.growth = Math.min(1, fruit.growth + rate)
    }
  }
}

function placeAgents(world: World) {
  const trees = world.trees
  for (let i = 0; i < world.baked.startBlue; i += 1) {
    const tree = trees[i % trees.length]
    const angle = world.rng() * Math.PI * 2
    const dist = 1.25 + world.rng() * 1.7
    const point = clampInside(world, tree.x + Math.cos(angle) * dist, tree.z + Math.sin(angle) * dist)
    world.agents.push(makeAgent(world, 'blue', point.x, point.z, null))
  }
  for (let i = 0; i < world.baked.startRed; i += 1) {
    let x = 0
    let z = 0
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const angle = world.rng() * Math.PI * 2
      const radius = world.radius * (0.18 + world.rng() * 0.68)
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      const nearBlue = world.agents.some(
        (agent) => agent.kind === 'blue' && Math.hypot(agent.x - x, agent.z - z) < 2.4,
      )
      if (!nearBlue && !insideTrunk(world, x, z)) break
    }
    const point = clampInside(world, x, z)
    world.agents.push(makeAgent(world, 'red', point.x, point.z, null))
  }
}

function makeAgent(world: World, kind: Kind, x: number, z: number, parent: Agent | null): Agent {
  const rng = world.rng
  const mutate = (value: number) => clamp(value * (0.9 + rng() * 0.2), 0.62, 1.55)
  const founder = () => clamp(0.86 + rng() * 0.28, 0.62, 1.55)
  return {
    id: world.nextId++,
    kind,
    x,
    z,
    vx: 0,
    vz: 0,
    energy:
      (kind === 'blue' ? TUNING.blueStart : TUNING.redStart) * (0.86 + rng() * 0.28),
    age: 0,
    action: 'wander',
    detail: 'Wandering',
    timer: 0,
    timerMax: 0,
    targetFruit: null,
    targetAgent: null,
    contactCd: 0,
    birthCd: parent ? 40 : 0,
    wanderT: 8 + Math.floor(rng() * 20),
    wanderAngle: rng() * Math.PI * 2,
    chaseStall: 0,
    chaseDist: Infinity,
    ignoreId: null,
    ignoreUntil: 0,
    generation: parent ? parent.generation + 1 : 0,
    parentId: parent ? parent.id : null,
    bornTick: world.tick,
    traitSpeed: parent ? mutate(parent.traitSpeed) : founder(),
    traitVision: parent ? mutate(parent.traitVision) : founder(),
    traitMetabolism: parent ? mutate(parent.traitMetabolism) : founder(),
    phase: rng() * Math.PI * 2,
    hue: kind === 'blue' ? 0.575 + (rng() - 0.5) * 0.045 : 0.995 + (rng() - 0.5) * 0.03,
    scale: parent
      ? clamp(parent.scale * (0.94 + rng() * 0.12), 0.82, 1.22)
      : 0.9 + rng() * 0.2,
  }
}

function updateAgent(world: World, agent: Agent) {
  if (agent.action === 'eat') {
    tickEat(world, agent)
    return
  }
  if (agent.action === 'contact' || agent.action === 'pause') {
    tickHold(world, agent)
    return
  }
  if (agent.action === 'flee') {
    tickFlee(world, agent)
    return
  }
  if (agent.kind === 'blue') decideBlue(world, agent)
  else decideRed(world, agent)
}

function decideBlue(world: World, agent: Agent) {
  const vision = sense(world, agent)
  const threat = nearestRed(world, agent, vision)
  const food = nearestFruit(world, agent, vision)
  const hungry = agent.energy < TUNING.hungryEnergy
  const tooClose = !!threat && threat.d < TUNING.closeDanger
  const scared =
    !hungry && !!threat && threat.d < TUNING.scareRadius && (!food || threat.d + 0.15 < food.d)
  if ((tooClose || scared) && threat) {
    agent.action = 'flee'
    agent.timer = 8
    agent.timerMax = 8
    agent.targetAgent = threat.agent.id
    agent.detail = 'Moving away from red blobs'
    const moving = moveAgent(
      world,
      agent,
      agent.x - threat.agent.x,
      agent.z - threat.agent.z,
      TUNING.blueFleeBoost,
    )
    spend(world, agent, moving)
    return
  }
  if (food) {
    if (food.d <= TUNING.eatRange && food.fruit.reservedBy == null) {
      startEat(world, agent, food.fruit)
      spend(world, agent, false)
      return
    }
    agent.action = 'seek-fruit'
    agent.detail = `Heading to fruit on tree ${food.fruit.treeId}`
    agent.targetFruit = food.fruit.id
    const moving = moveAgent(world, agent, food.fruit.x - agent.x, food.fruit.z - agent.z, 1)
    spend(world, agent, moving)
    return
  }
  const crowd = neighborCount(world, agent)
  if (crowd >= 4 && !hungry) {
    let cx = 0
    let cz = 0
    let n = 0
    for (const other of world.agents) {
      if (other.kind !== 'blue' || other.id === agent.id) continue
      if (Math.hypot(other.x - agent.x, other.z - agent.z) < TUNING.crowdRadius) {
        cx += other.x
        cz += other.z
        n += 1
      }
    }
    agent.action = 'avoid'
    agent.detail = 'Avoiding the crowd'
    const moving = moveAgent(world, agent, agent.x - cx / Math.max(1, n), agent.z - cz / Math.max(1, n), 1)
    spend(world, agent, moving)
    return
  }
  const tree = nearestTree(world, agent.x, agent.z, vision + 1.4)
  steerWander(world, agent, tree, 'Wandering')
}

function decideRed(world: World, agent: Agent) {
  const vision = sense(world, agent)
  const prey = nearestBlue(world, agent, vision)
  if (prey && prey.agent.energy > 0) {
    if (prey.d <= TUNING.contactRange) {
      agent.chaseStall = 0
      beginContact(world, agent, prey.agent)
      spend(world, agent, false)
      return
    }
    if (agent.targetAgent === prey.agent.id && prey.d >= agent.chaseDist - 0.03) agent.chaseStall += 1
    else agent.chaseStall = 0
    agent.chaseDist = prey.d
    if (agent.chaseStall > 32) {
      agent.ignoreId = prey.agent.id
      agent.ignoreUntil = world.tick + 36
      agent.chaseStall = 0
      agent.targetAgent = null
      agent.action = 'wander'
      agent.detail = 'Lost the trail'
      steerWander(world, agent, nearestTree(world, agent.x, agent.z, Infinity), 'Lost the trail')
      return
    }
    agent.action = 'seek-blue'
    agent.detail = `Looking for blue blob ${prey.agent.id}`
    agent.targetAgent = prey.agent.id
    const boost = prey.d < 1.8 ? TUNING.redPounceBoost : 1
    const moving = moveAgent(world, agent, prey.agent.x - agent.x, prey.agent.z - agent.z, boost)
    spend(world, agent, moving)
    return
  }
  const tree = nearestTree(world, agent.x, agent.z, Infinity)
  steerWander(world, agent, tree, tree ? 'Searching near the trees' : 'Wandering')
}

function steerWander(world: World, agent: Agent, tree: Tree | null, detail: string) {
  agent.wanderT -= 1
  if (agent.wanderT <= 0) {
    agent.wanderAngle += (world.rng() - 0.5) * 1.35
    agent.wanderT = 14 + Math.floor(world.rng() * 28)
  }
  let dx = Math.cos(agent.wanderAngle)
  let dz = Math.sin(agent.wanderAngle)
  if (tree) {
    const tx = tree.x + Math.cos(agent.wanderAngle) * 1.35 - agent.x
    const tz = tree.z + Math.sin(agent.wanderAngle) * 1.35 - agent.z
    dx += tx * (agent.kind === 'red' ? 0.85 : 0.4)
    dz += tz * (agent.kind === 'red' ? 0.85 : 0.4)
  }
  if (Math.hypot(agent.x, agent.z) > world.radius * 0.78) {
    dx -= agent.x
    dz -= agent.z
  }
  agent.action = 'wander'
  agent.detail = detail
  if (agent.kind === 'red') agent.targetAgent = null
  const moving = moveAgent(world, agent, dx, dz, 1)
  spend(world, agent, moving)
}

function startEat(world: World, agent: Agent, fruit: Fruit) {
  fruit.reservedBy = agent.id
  const time = Math.max(8, Math.round(world.params.blueEatTime))
  agent.action = 'eat'
  agent.detail = `Eating fruit on tree ${fruit.treeId}`
  agent.timer = time
  agent.timerMax = time
  agent.targetFruit = fruit.id
  agent.vx = 0
  agent.vz = 0
}

function tickEat(world: World, agent: Agent) {
  const fruit = findFruit(world, agent.targetFruit)
  if (!fruit || fruit.reservedBy !== agent.id) {
    agent.action = 'wander'
    agent.detail = 'Wandering'
    agent.timer = 0
    agent.targetFruit = null
    spend(world, agent, false)
    return
  }
  agent.vx = 0
  agent.vz = 0
  spend(world, agent, false)
  agent.timer -= 1
  if (agent.timer > 0) return
  fruit.growth = 0
  fruit.delay = Math.max(0, Math.round(world.params.fruitDelay))
  fruit.reservedBy = null
  agent.energy += TUNING.fruitEnergy
  agent.action = 'wander'
  agent.detail = 'Wandering'
  agent.targetFruit = null
  world.events.push({ kind: 'eat', x: fruit.x, z: fruit.z })
}

function tickHold(world: World, agent: Agent) {
  agent.timer -= 1
  const shown = Math.min(8, agent.timerMax)
  if (agent.action === 'contact' && agent.timerMax - agent.timer >= shown) {
    agent.action = 'pause'
    agent.detail = 'Pausing after contact'
  }
  if (agent.timer <= 0) {
    agent.action = 'wander'
    agent.detail = 'Wandering'
    agent.targetAgent = null
    agent.timer = 0
  }
  agent.vx *= 0.45
  agent.vz *= 0.45
  spend(world, agent, false)
}

function tickFlee(world: World, agent: Agent) {
  agent.timer -= 1
  const threat =
    world.agents.find((other) => other.id === agent.targetAgent && other.kind === 'red') ??
    nearestRed(world, agent, Infinity)?.agent ??
    null
  const moving = threat
    ? moveAgent(world, agent, agent.x - threat.x, agent.z - threat.z, TUNING.blueFleeBoost)
    : moveAgent(world, agent, Math.cos(agent.wanderAngle), Math.sin(agent.wanderAngle), TUNING.blueFleeBoost)
  agent.detail = 'Moving away from red blobs'
  spend(world, agent, moving)
  if (agent.timer <= 0) {
    agent.action = 'wander'
    agent.detail = 'Wandering'
  }
}

function beginContact(world: World, red: Agent, blue: Agent) {
  if (blue.energy <= 0 || blue.contactCd > 0) return
  const gain = Math.max(0, world.params.redContact)
  red.energy += gain
  blue.energy -= gain * TUNING.contactLossRatio
  blue.contactCd = TUNING.contactCooldown
  releaseFruit(world, blue.id)
  blue.action = 'flee'
  blue.timer = 14
  blue.timerMax = 14
  blue.targetAgent = red.id
  blue.detail = 'Startled after a visit'
  const pause = Math.max(4, Math.round(world.params.redPause))
  red.action = 'contact'
  red.timer = pause
  red.timerMax = pause
  red.targetAgent = blue.id
  red.detail = 'Gentle contact'
  red.vx = 0
  red.vz = 0
  const dx = blue.x - red.x
  const dz = blue.z - red.z
  const dist = Math.hypot(dx, dz) || 1
  const gap = 0.7
  red.x = blue.x - (dx / dist) * gap
  red.z = blue.z - (dz / dist) * gap
  const parked = clampInside(world, red.x, red.z)
  red.x = parked.x
  red.z = parked.z
  world.events.push({
    kind: 'contact',
    x: (red.x + blue.x) / 2,
    z: (red.z + blue.z) / 2,
  })
}

function tryBirth(world: World, agent: Agent) {
  if (agent.timer > 0 || agent.birthCd > 0 || agent.age < 28) return
  const threshold = agent.kind === 'blue' ? world.params.blueCopy : world.params.redCopy
  if (!Number.isFinite(threshold) || agent.energy < threshold) return
  if (agent.kind === 'blue' && blueLoad(world) > 1.05) return
  if (agent.kind === 'red' && redLoad(world) > 1.15) return
  const kindCount = world.agents.reduce((sum, other) => sum + (other.kind === agent.kind ? 1 : 0), 0)
  const cap = agent.kind === 'blue' ? TUNING.maxBlue : TUNING.maxRed
  if (kindCount >= cap) {
    world.hitCap = true
    return
  }
  if (neighborCount(world, agent) >= 5) return
  const gift = threshold * TUNING.giftRatio
  const removed = threshold * (TUNING.giftRatio + TUNING.wasteRatio)
  if (agent.energy - removed < 8) return
  agent.energy -= removed
  agent.birthCd = TUNING.birthCooldown
  const childPoint = birthPoint(world, agent)
  const child = makeAgent(world, agent.kind, childPoint.x, childPoint.z, agent)
  child.energy = gift
  world.agents.push(child)
  if (agent.kind === 'blue') world.bornBlue += 1
  else world.bornRed += 1
  world.events.push({ kind: 'born', x: child.x, z: child.z, group: child.kind })
}

function birthPoint(world: World, parent: Agent) {
  for (let i = 0; i < 8; i += 1) {
    const angle = world.rng() * Math.PI * 2
    const dist = 0.75 + world.rng() * 0.7
    const point = clampInside(world, parent.x + Math.cos(angle) * dist, parent.z + Math.sin(angle) * dist)
    if (!insideTrunk(world, point.x, point.z)) return point
  }
  return { x: parent.x, z: parent.z }
}

function spend(world: World, agent: Agent, moving: boolean) {
  const use = agent.kind === 'blue' ? world.params.blueEnergyUse : world.params.redEnergyUse
  const idle = agent.kind === 'blue' ? TUNING.blueIdle : TUNING.redIdle
  const move = agent.kind === 'blue' ? TUNING.blueMove : TUNING.redMove
  const paramSpeed = agent.kind === 'blue' ? world.params.blueSpeed : world.params.redSpeed
  let rate = (moving ? move : idle) * Math.max(0.05, use) * agent.traitMetabolism
  if (moving) rate *= 0.78 + 0.32 * paramSpeed * agent.traitSpeed
  const crowd = neighborCount(world, agent)
  if (crowd >= 3) rate *= 1 + (crowd - 2) * 0.16
  if (agent.kind === 'blue') {
    const load = blueLoad(world)
    if (load > 1) rate *= load
  }
  agent.energy -= rate
}

function blueLoad(world: World) {
  let slots = 0
  let blues = 0
  for (const tree of world.trees) slots += tree.fruits.length
  for (const agent of world.agents) if (agent.kind === 'blue') blues += 1
  const comfort = Math.max(6, slots * 0.72)
  return blues / comfort
}

function redLoad(world: World) {
  let blues = 0
  let reds = 0
  for (const agent of world.agents) {
    if (agent.kind === 'blue') blues += 1
    else reds += 1
  }
  const comfort = Math.max(2, blues * 0.95)
  return reds / comfort
}

function moveAgent(world: World, agent: Agent, dx: number, dz: number, scale: number) {
  const speed = baseSpeed(world, agent) * scale
  let sx = dx
  let sz = dz
  for (const other of world.agents) {
    if (other.id === agent.id) continue
    const ox = agent.x - other.x
    const oz = agent.z - other.z
    const dist = Math.hypot(ox, oz)
    if (dist > 0 && dist < 0.74) {
      const push = (0.74 - dist) / 0.74
      sx += (ox / dist) * push * 1.5
      sz += (oz / dist) * push * 1.5
    }
  }
  for (const tree of world.trees) {
    const ox = agent.x - tree.x
    const oz = agent.z - tree.z
    const dist = Math.hypot(ox, oz)
    if (dist > 0 && dist < 0.58) {
      sx += (ox / dist) * 2
      sz += (oz / dist) * 2
    }
  }
  const mag = Math.hypot(sx, sz) || 1
  sx /= mag
  sz /= mag
  agent.vx = agent.vx * 0.64 + sx * speed * 0.36
  agent.vz = agent.vz * 0.64 + sz * speed * 0.36
  const velocity = Math.hypot(agent.vx, agent.vz)
  if (velocity > speed) {
    agent.vx = (agent.vx / velocity) * speed
    agent.vz = (agent.vz / velocity) * speed
  }
  let nx = agent.x + agent.vx
  let nz = agent.z + agent.vz
  const limit = world.radius - 0.7
  const dist = Math.hypot(nx, nz)
  if (dist > limit) {
    nx = (nx / dist) * limit
    nz = (nz / dist) * limit
    agent.vx *= 0.35
    agent.vz *= 0.35
  }
  agent.x = nx
  agent.z = nz
  return Math.hypot(agent.vx, agent.vz) > speed * 0.28
}

function baseSpeed(world: World, agent: Agent) {
  const param = agent.kind === 'blue' ? world.params.blueSpeed : world.params.redSpeed
  return TUNING.speed * Math.max(0.15, param) * agent.traitSpeed
}

function sense(world: World, agent: Agent) {
  const base = agent.kind === 'blue' ? world.params.blueVision : world.params.redVision
  return Math.max(0.4, base) * agent.traitVision
}

function nearestFruit(world: World, agent: Agent, range: number) {
  let best: Fruit | null = null
  let bestD = range
  for (const tree of world.trees) {
    for (const fruit of tree.fruits) {
      if (fruit.growth < 1) continue
      if (fruit.reservedBy != null && fruit.reservedBy !== agent.id) continue
      const dist = Math.hypot(fruit.x - agent.x, fruit.z - agent.z)
      if (dist <= bestD) {
        best = fruit
        bestD = dist
      }
    }
  }
  return best ? { fruit: best, d: bestD } : null
}

function nearestRed(world: World, agent: Agent, range: number) {
  let best: Agent | null = null
  let bestD = range
  for (const other of world.agents) {
    if (other.kind !== 'red' || other.energy <= 0) continue
    const dist = Math.hypot(other.x - agent.x, other.z - agent.z)
    if (dist <= bestD) {
      best = other
      bestD = dist
    }
  }
  return best ? { agent: best, d: bestD } : null
}

function nearestBlue(world: World, agent: Agent, range: number) {
  let blueCount = 0
  for (const other of world.agents) if (other.kind === 'blue' && other.energy > 0) blueCount += 1
  const hunterCap = blueCount <= 3 ? 1 : 2
  let best: Agent | null = null
  let bestD = range
  for (const other of world.agents) {
    if (other.kind !== 'blue' || other.energy <= 0 || other.contactCd > 0) continue
    if (other.id === agent.ignoreId && world.tick < agent.ignoreUntil) continue
    const dist = Math.hypot(other.x - agent.x, other.z - agent.z)
    if (dist > range || dist > bestD) continue
    if (huntersOn(world, other.id, agent.id) >= hunterCap) continue
    best = other
    bestD = dist
  }
  return best ? { agent: best, d: bestD } : null
}

function huntersOn(world: World, blueId: number, exceptId: number) {
  let count = 0
  for (const agent of world.agents) {
    if (agent.kind !== 'red' || agent.id === exceptId || agent.targetAgent !== blueId) continue
    if (agent.action === 'seek-blue' || agent.action === 'contact' || agent.action === 'pause') count += 1
  }
  return count
}

function nearestTree(world: World, x: number, z: number, range: number) {
  let best: Tree | null = null
  let bestD = range
  for (const tree of world.trees) {
    const dist = Math.hypot(tree.x - x, tree.z - z)
    if (dist <= bestD) {
      best = tree
      bestD = dist
    }
  }
  return best
}

function neighborCount(world: World, agent: Agent) {
  let count = 0
  for (const other of world.agents) {
    if (other.id === agent.id || other.kind !== agent.kind) continue
    if (Math.hypot(other.x - agent.x, other.z - agent.z) < TUNING.crowdRadius) count += 1
  }
  return count
}

function findFruit(world: World, id: number | null) {
  if (id == null) return null
  for (const tree of world.trees) {
    for (const fruit of tree.fruits) if (fruit.id === id) return fruit
  }
  return null
}

function releaseFruit(world: World, agentId: number) {
  for (const tree of world.trees) {
    for (const fruit of tree.fruits) {
      if (fruit.reservedBy === agentId) fruit.reservedBy = null
    }
  }
}

function insideTrunk(world: World, x: number, z: number) {
  return world.trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 0.7)
}

function clampInside(world: World, x: number, z: number) {
  const limit = world.radius - 0.85
  const dist = Math.hypot(x, z)
  if (dist <= limit || dist === 0) return { x, z }
  return { x: (x / dist) * limit, z: (z / dist) * limit }
}
