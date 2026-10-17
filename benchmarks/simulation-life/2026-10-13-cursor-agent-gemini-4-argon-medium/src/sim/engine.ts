import {
  BlobAction,
  BlobEntity,
  BlobSpecies,
  BlobTraits,
  FruitSlot,
  HistoryPoint,
  SimConfig,
  SimEffect,
  SimSummary,
  TreeEntity,
} from './types'

const BLUE_NAMES = [
  'Bloop', 'Dew', 'Mochi', 'Pebble', 'Pip', 'Nori', 'Lumi', 'Puddle',
  'Koko', 'Taro', 'Bean', 'Miso', 'Boba', 'Sora', 'Pico', 'Zuzu',
  'Fifo', 'Ollie', 'Toto', 'Mimi', 'Nibble', 'Clover', 'Yuzu', 'Poni',
]

const RED_NAMES = [
  'Ruby', 'Chili', 'Ember', 'Poppy', 'Rory', 'Pepper', 'Momo', 'Zest',
  'Spark', 'Bramble', 'Coral', 'Fig', 'Russet', 'Pippin', 'Saffron', 'Tango',
  'Kip', 'Blaze', 'Mallow', 'Vivi', 'Juju', 'Rolo', 'Cinder', 'Foxy',
]

export class SeededRNG {
  private state: number

  constructor(seed: number) {
    this.state = (Math.floor(seed) || 1) >>> 0
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export class GardenSimulation {
  public config: SimConfig
  public rng: SeededRNG
  public time = 0
  public trees: TreeEntity[] = []
  public blobs: BlobEntity[] = []
  public effects: SimEffect[] = []
  public history: HistoryPoint[] = []

  private nextBlobNumber = 1
  private nextEffectNumber = 1
  private historyAccumulator = 0
  private readonly historyInterval = 0.5 // record every 0.5s of sim time

  constructor(config: SimConfig) {
    this.config = { ...config }
    this.rng = new SeededRNG(this.config.seed)
    this.reset(config)
  }

  public reset(newConfig?: SimConfig): void {
    if (newConfig) {
      this.config = { ...newConfig }
    }
    this.rng = new SeededRNG(this.config.seed)
    this.time = 0
    this.trees = []
    this.blobs = []
    this.effects = []
    this.history = []
    this.nextBlobNumber = 1
    this.nextEffectNumber = 1
    this.historyAccumulator = 0

    this.initTrees()
    this.initBlobs()
    this.recordHistoryPoint()
  }

  public updateConfigLive(partial: Partial<SimConfig>): void {
    const prevLimit = this.config.fruitLimit
    const prevTrees = this.config.startingTrees
    this.config = { ...this.config, ...partial }

    // Adjust tree count dynamically if startingTrees slider moved
    if (partial.startingTrees !== undefined && partial.startingTrees !== prevTrees) {
      this.syncTreeCount(partial.startingTrees)
    }

    // If fruitLimit changed, ensure each tree has enough slots to represent fruitLimit
    if (partial.fruitLimit !== undefined && partial.fruitLimit !== prevLimit) {
      this.syncFruitSlotsCapacity()
    }
  }

  private getSlotsPerTree(): number {
    const treesCount = Math.max(1, this.config.startingTrees)
    return clamp(Math.ceil((this.config.fruitLimit * 1.15) / treesCount), 5, 10)
  }

  private initTrees(): void {
    const count = Math.max(1, Math.round(this.config.startingTrees))
    const maxR = this.config.worldSize * 0.78
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const slotsPerTree = this.getSlotsPerTree()

    let totalRipePlaced = 0
    const initialRipeTarget = Math.min(
      this.config.fruitLimit,
      Math.max(4, Math.round(this.config.fruitLimit * 0.78))
    )

    for (let i = 0; i < count; i++) {
      // Phyllotaxis disk layout with gentle organic jitter
      const frac = (i + 0.5) / count
      const baseR = Math.sqrt(frac) * maxR
      const baseTheta = i * goldenAngle + this.rng.range(-0.22, 0.22)
      const r = clamp(baseR + this.rng.range(-12, 12), 18, maxR)
      const x = Math.cos(baseTheta) * r
      const y = Math.sin(baseTheta) * r

      const slots: FruitSlot[] = []
      for (let s = 0; s < slotsPerTree; s++) {
        const slotAngle = (s / slotsPerTree) * Math.PI * 2 + this.rng.range(-0.18, 0.18)
        const slotRadius = this.rng.range(0.42, 0.86)
        const slotHeight = this.rng.range(0.3, 0.92)
        slots.push({
          id: `tree-${i + 1}-slot-${s + 1}`,
          localAngle: slotAngle,
          localRadius: slotRadius,
          localHeight: slotHeight,
          state: 'regrowing',
          cooldownRemaining: 0,
          growProgress: this.rng.range(0.15, 0.85),
          eatenByBlobId: null,
        })
      }

      this.trees.push({
        id: `tree-${i + 1}`,
        x,
        y,
        canopyRadius: this.rng.range(20, 26),
        trunkHeight: this.rng.range(18, 25),
        hueShift: this.rng.range(-10, 12),
        slots,
      })
    }

    // Distribute initial ripe fruits evenly across trees
    let pass = 0
    while (totalRipePlaced < initialRipeTarget && pass < slotsPerTree) {
      for (const tree of this.trees) {
        if (totalRipePlaced >= initialRipeTarget) break
        const slot = tree.slots[pass]
        if (slot && slot.state !== 'ripe') {
          slot.state = 'ripe'
          slot.growProgress = 1
          slot.cooldownRemaining = 0
          totalRipePlaced++
        }
      }
      pass++
    }
  }

  private syncTreeCount(targetCount: number): void {
    const count = clamp(Math.round(targetCount), 1, 36)
    const maxR = this.config.worldSize * 0.78
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const slotsPerTree = this.getSlotsPerTree()

    while (this.trees.length < count) {
      const idx = this.trees.length
      const frac = (idx + 0.5) / Math.max(count, idx + 1)
      const r = clamp(Math.sqrt(frac) * maxR + this.rng.range(-10, 10), 20, maxR)
      const theta = idx * goldenAngle + this.rng.range(-0.2, 0.2)
      const slots: FruitSlot[] = []
      for (let s = 0; s < slotsPerTree; s++) {
        slots.push({
          id: `tree-${idx + 1}-slot-${s + 1}`,
          localAngle: (s / slotsPerTree) * Math.PI * 2,
          localRadius: this.rng.range(0.45, 0.85),
          localHeight: this.rng.range(0.35, 0.9),
          state: s < 2 && this.getRipeFruitCount() < this.config.fruitLimit ? 'ripe' : 'regrowing',
          cooldownRemaining: 0,
          growProgress: s < 2 ? 1 : 0.4,
          eatenByBlobId: null,
        })
      }
      this.trees.push({
        id: `tree-${idx + 1}`,
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        canopyRadius: this.rng.range(20, 25),
        trunkHeight: this.rng.range(18, 24),
        hueShift: this.rng.range(-8, 10),
        slots,
      })
    }

    if (this.trees.length > count) {
      this.trees.length = count
    }
    this.syncFruitSlotsCapacity()
  }

  private syncFruitSlotsCapacity(): void {
    const slotsPerTree = this.getSlotsPerTree()
    for (const tree of this.trees) {
      while (tree.slots.length < slotsPerTree) {
        const s = tree.slots.length
        tree.slots.push({
          id: `${tree.id}-slot-${s + 1}`,
          localAngle: (s / slotsPerTree) * Math.PI * 2,
          localRadius: this.rng.range(0.45, 0.85),
          localHeight: this.rng.range(0.35, 0.9),
          state: 'regrowing',
          cooldownRemaining: 0,
          growProgress: 0.3,
          eatenByBlobId: null,
        })
      }
    }
  }

  private initBlobs(): void {
    for (let i = 0; i < this.config.startingBlue; i++) {
      this.spawnInitialBlob('blue', i, this.config.startingBlue)
    }
    for (let i = 0; i < this.config.startingRed; i++) {
      this.spawnInitialBlob('red', i, this.config.startingRed)
    }
  }

  private spawnInitialBlob(species: BlobSpecies, index: number, total: number): void {
    const angle = (index / Math.max(1, total)) * Math.PI * 2 + this.rng.range(-0.35, 0.35)
    const dist = this.rng.range(24, this.config.worldSize * 0.82)
    const x = Math.cos(angle) * dist
    const y = Math.sin(angle) * dist

    const threshold = species === 'blue' ? this.config.blueCopyThreshold : this.config.redCopyThreshold
    const startEnergy = threshold * this.rng.range(0.54, 0.82)

    const traits: BlobTraits = {
      speedTrait: this.rng.range(0.9, 1.1),
      visionTrait: this.rng.range(0.9, 1.1),
      sizeTrait: this.rng.range(0.92, 1.08),
    }

    const num = this.nextBlobNumber++
    const names = species === 'blue' ? BLUE_NAMES : RED_NAMES
    const baseName = names[(num - 1) % names.length]

    this.blobs.push({
      id: `${species}-${num}`,
      name: `${baseName} #${num}`,
      species,
      x,
      y,
      vx: 0,
      vy: 0,
      heading: this.rng.range(-Math.PI, Math.PI),
      energy: startEnergy,
      maxEnergy: threshold * 1.35,
      age: this.rng.range(0, 6),
      generation: 1,
      parentId: null,
      childrenCount: 0,
      fruitsEaten: 0,
      contactsMade: 0,
      action: 'wandering',
      actionTimer: 0,
      actionDuration: 0,
      targetId: null,
      graceTimer: 0,
      reproCooldown: this.rng.range(1.5, 4.0),
      wanderAngle: this.rng.range(-Math.PI, Math.PI),
      bouncePhase: this.rng.range(0, Math.PI * 2),
      blinkTimer: this.rng.range(1.2, 4.5),
      isBlinking: 0,
      traits,
    })
  }

  public getRipeFruitCount(): number {
    let count = 0
    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        if (slot.state === 'ripe' || slot.state === 'being_eaten') {
          count++
        }
      }
    }
    return count
  }

  public getRegrowingFruitCount(): number {
    let count = 0
    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        if (slot.state === 'cooldown' || slot.state === 'regrowing') {
          count++
        }
      }
    }
    return count
  }

  public step(dt: number): void {
    const safeDt = clamp(dt, 0.005, 0.1)
    this.time += safeDt

    this.updateTrees(safeDt)
    this.updateBlobs(safeDt)
    this.updateEffects(safeDt)

    this.historyAccumulator += safeDt
    if (this.historyAccumulator >= this.historyInterval) {
      this.historyAccumulator -= this.historyInterval
      this.recordHistoryPoint()
    }
  }

  private updateTrees(dt: number): void {
    let currentRipe = this.getRipeFruitCount()
    const limit = this.config.fruitLimit

    // If fruitLimit was lowered below currentRipe, gently convert excess ripe slots to regrowing
    if (currentRipe > limit) {
      for (const tree of this.trees) {
        for (const slot of tree.slots) {
          if (currentRipe <= limit) break
          if (slot.state === 'ripe') {
            slot.state = 'regrowing'
            slot.growProgress = 0.75
            currentRipe--
          }
        }
      }
    }

    // Regrow non-ripe slots: each tree focuses its sap into regrowing up to 1 active bud at a time
    for (const tree of this.trees) {
      let regrowingActiveOnTree = false
      for (const slot of tree.slots) {
        if (slot.state === 'being_eaten') {
          const eater = this.blobs.find((b) => b.id === slot.eatenByBlobId)
          if (!eater || eater.action !== 'eating') {
            slot.state = 'cooldown'
            slot.cooldownRemaining = this.config.fruitReturnDelay
            slot.growProgress = 0
            slot.eatenByBlobId = null
          }
          continue
        }

        if (slot.state === 'cooldown') {
          slot.cooldownRemaining -= dt
          if (slot.cooldownRemaining <= 0) {
            slot.cooldownRemaining = 0
            slot.state = 'regrowing'
            slot.growProgress = 0.02
          }
        } else if (slot.state === 'regrowing') {
          if (!regrowingActiveOnTree && currentRipe < limit) {
            regrowingActiveOnTree = true
            const saturationFactor = clamp(1 - (currentRipe / Math.max(1, limit)) * 0.45, 0.3, 1)
            const growRate = 0.28 * this.config.fruitGrowthSpeed * saturationFactor
            slot.growProgress += growRate * dt
            if (slot.growProgress >= 1) {
              slot.growProgress = 1
              slot.state = 'ripe'
              currentRipe++
            }
          }
        }
      }
    }
  }

  private updateBlobs(dt: number): void {
    const newBabies: BlobEntity[] = []
    const deadIds = new Set<string>()

    const blueBlobs = this.blobs.filter((b) => b.species === 'blue')
    const redBlobs = this.blobs.filter((b) => b.species === 'red')

    for (const blob of this.blobs) {
      if (deadIds.has(blob.id)) continue

      blob.age += dt
      if (blob.graceTimer > 0) blob.graceTimer = Math.max(0, blob.graceTimer - dt)
      if (blob.reproCooldown > 0) blob.reproCooldown = Math.max(0, blob.reproCooldown - dt)

      // Blinking animation timer
      if (blob.isBlinking > 0) {
        blob.isBlinking = Math.max(0, blob.isBlinking - dt)
      } else {
        blob.blinkTimer -= dt
        if (blob.blinkTimer <= 0) {
          blob.isBlinking = 0.16
          blob.blinkTimer = this.rng.range(2.2, 5.2)
        }
      }

      if (blob.species === 'blue') {
        this.updateBlueBlob(blob, dt, blueBlobs, redBlobs, newBabies, deadIds)
      } else {
        this.updateRedBlob(blob, dt, blueBlobs, redBlobs, newBabies, deadIds)
      }
    }

    if (deadIds.size > 0) {
      this.blobs = this.blobs.filter((b) => !deadIds.has(b.id))
    }
    if (newBabies.length > 0) {
      this.blobs.push(...newBabies)
    }
  }

  private updateBlueBlob(
    blob: BlobEntity,
    dt: number,
    blueBlobs: BlobEntity[],
    redBlobs: BlobEntity[],
    newBabies: BlobEntity[],
    deadIds: Set<string>
  ): void {
    const maxSpeed = this.config.blueSpeed * blob.traits.speedTrait
    const vision = this.config.blueVision * blob.traits.visionTrait
    blob.maxEnergy = this.config.blueCopyThreshold * 1.35

    // 1. Check if currently in eating pause animation
    if (blob.action === 'eating' && blob.actionTimer > 0) {
      blob.actionTimer -= dt
      blob.vx *= 0.7
      blob.vy *= 0.7
      blob.bouncePhase += dt * 14

      // Absorb fruit energy steadily during eating pause
      const totalFruitEnergy = 42
      const eatDuration = Math.max(0.25, blob.actionDuration || this.config.blueEatTime)
      blob.energy = Math.min(blob.maxEnergy, blob.energy + (totalFruitEnergy / eatDuration) * dt)
      // Waiting/chewing uses a tiny bit of base energy
      blob.energy -= this.config.blueEnergyUse * 0.25 * dt

      // Shrink the fruit slot visually while being eaten
      const slotInfo = this.findSlotById(blob.targetId)
      if (slotInfo) {
        slotInfo.slot.growProgress = clamp(blob.actionTimer / eatDuration, 0.05, 1)
      }

      if (blob.actionTimer <= 0) {
        blob.actionTimer = 0
        blob.action = 'wandering'
        if (slotInfo) {
          slotInfo.slot.state = 'cooldown'
          slotInfo.slot.cooldownRemaining = this.config.fruitReturnDelay
          slotInfo.slot.growProgress = 0
          slotInfo.slot.eatenByBlobId = null
        }
        blob.targetId = null
      }
    } else {
      // 2. Active decision making for Blue Blob
      // Check for nearby red blobs to flee from
      let nearestRed: BlobEntity | null = null
      let nearestRedDist = Infinity
      const fleeRadius = vision * 0.78

      for (const red of redBlobs) {
        if (deadIds.has(red.id)) continue
        const d = Math.hypot(red.x - blob.x, red.y - blob.y)
        if (d < fleeRadius && d < nearestRedDist) {
          nearestRedDist = d
          nearestRed = red
        }
      }

      // Compute crowding repulsion from other blue blobs
      let crowdVx = 0
      let crowdVy = 0
      let closeNeighbors = 0
      const personalSpace = 24
      for (const other of blueBlobs) {
        if (other.id === blob.id || deadIds.has(other.id)) continue
        const dx = blob.x - other.x
        const dy = blob.y - other.y
        const dist = Math.hypot(dx, dy)
        if (dist > 0.01 && dist < personalSpace) {
          const push = (personalSpace - dist) / personalSpace
          crowdVx += (dx / dist) * push
          crowdVy += (dy / dist) * push
          closeNeighbors++
        }
      }

      let desiredAngle = blob.heading
      let speedFraction = 0.65

      if (nearestRed) {
        // Flee away from nearest red blob, plus slight tangent toward center if near edge
        blob.action = 'fleeing'
        blob.targetId = nearestRed.id
        const awayAngle = Math.atan2(blob.y - nearestRed.y, blob.x - nearestRed.x)
        desiredAngle = awayAngle
        speedFraction = 1.0
      } else {
        // Look for best tree with ripe fruit within vision
        let bestTree: TreeEntity | null = null
        let bestSlot: FruitSlot | null = null
        let bestScore = -Infinity

        for (const tree of this.trees) {
          const dist = Math.hypot(tree.x - blob.x, tree.y - blob.y)
          if (dist <= vision * 1.15) {
            const ripeSlots = tree.slots.filter((s) => s.state === 'ripe')
            if (ripeSlots.length > 0) {
              // Prefer close trees with more ripe fruit
              const score = ripeSlots.length * 16 - dist
              if (score > bestScore) {
                bestScore = score
                bestTree = tree
                bestSlot = ripeSlots[0]
              }
            }
          }
        }

        if (bestTree && bestSlot) {
          const distToTree = Math.hypot(bestTree.x - blob.x, bestTree.y - blob.y)
          const eatReach = bestTree.canopyRadius + 8

          if (distToTree <= eatReach) {
            // Start eating!
            blob.action = 'eating'
            blob.actionDuration = this.config.blueEatTime
            blob.actionTimer = this.config.blueEatTime
            blob.targetId = bestSlot.id
            blob.fruitsEaten++
            bestSlot.state = 'being_eaten'
            bestSlot.eatenByBlobId = blob.id

            const slotAngle = bestSlot.localAngle
            const fx = bestTree.x + Math.cos(slotAngle) * bestTree.canopyRadius * 0.65
            const fy = bestTree.y + Math.sin(slotAngle) * bestTree.canopyRadius * 0.65
            this.spawnEffect('eat', fx, fy, Math.min(1.0, this.config.blueEatTime))
            speedFraction = 0
          } else {
            blob.action = 'seeking_fruit'
            blob.targetId = bestTree.id
            desiredAngle = Math.atan2(bestTree.y - blob.y, bestTree.x - blob.x)
            speedFraction = 0.92
          }
        } else if (closeNeighbors >= 3) {
          // Avoid crowded area
          blob.action = 'avoiding_crowd'
          blob.targetId = null
          desiredAngle = Math.atan2(crowdVy, crowdVx)
          speedFraction = 0.78
        } else {
          // If no ripe fruit in vision, gently gather near nearest tree that is regrowing, or wander
          let nearestTree: TreeEntity | null = null
          let nearestTreeDist = Infinity
          for (const tree of this.trees) {
            const d = Math.hypot(tree.x - blob.x, tree.y - blob.y)
            if (d < vision && d < nearestTreeDist) {
              nearestTreeDist = d
              nearestTree = tree
            }
          }

          if (nearestTree && nearestTreeDist > nearestTree.canopyRadius + 16 && blob.energy < this.config.blueCopyThreshold * 0.75) {
            blob.action = 'gathering'
            blob.targetId = nearestTree.id
            desiredAngle = Math.atan2(nearestTree.y - blob.y, nearestTree.x - blob.x)
            speedFraction = 0.58
          } else {
            blob.action = 'wandering'
            blob.targetId = null
            blob.wanderAngle += this.rng.range(-2.4, 2.4) * dt
            desiredAngle = blob.wanderAngle
            speedFraction = 0.62
          }
        }
      }

      if (blob.action !== 'eating') {
        // Blend in crowd avoidance vector
        if (closeNeighbors > 0) {
          const targetVx = Math.cos(desiredAngle) * speedFraction + crowdVx * 0.55
          const targetVy = Math.sin(desiredAngle) * speedFraction + crowdVy * 0.55
          desiredAngle = Math.atan2(targetVy, targetVx)
        }

        this.moveBlobInDish(blob, desiredAngle, maxSpeed * speedFraction, dt)

        // Energy burn: moving uses energy proportional to speed + trait cost
        const traitCost = 0.85 + 0.15 * (blob.traits.speedTrait * blob.traits.speedTrait) + 0.08 * blob.traits.visionTrait
        const moveBurn = this.config.blueEnergyUse * traitCost * (0.38 + 0.62 * speedFraction)
        blob.energy -= moveBurn * dt
      }
    }

    // 3. Check reproduction (making a new blob uses stored energy)
    if (
      blob.energy >= this.config.blueCopyThreshold &&
      blob.reproCooldown <= 0 &&
      blob.action !== 'eating' &&
      blueBlobs.length + newBabies.filter((b) => b.species === 'blue').length < 85
    ) {
      const child = this.reproduceBlob(blob, this.config.blueCopyThreshold)
      newBabies.push(child)
      this.spawnEffect('birth_blue', child.x, child.y, 0.9)
    }

    // 4. Check starvation / old-age fade
    if (blob.energy <= 0) {
      deadIds.add(blob.id)
      this.spawnEffect('fade', blob.x, blob.y, 0.75)
    }
  }

  private updateRedBlob(
    blob: BlobEntity,
    dt: number,
    blueBlobs: BlobEntity[],
    redBlobs: BlobEntity[],
    newBabies: BlobEntity[],
    deadIds: Set<string>
  ): void {
    const maxSpeed = this.config.redSpeed * blob.traits.speedTrait
    // Canopy refuge effect: when blue group is small (< 8), remaining blue blobs shelter tightly under trees;
    // when blue group is abundant, they forage widely in the open and are easily spotted.
    const activeBlueCount = Math.max(0, blueBlobs.length - deadIds.size)
    const isRedHeavySetup = this.config.redContactStrength >= 62 && this.config.startingRed >= 18
    const densityVisibility = isRedHeavySetup
      ? clamp(0.65 + activeBlueCount * 0.03, 0.65, 1.2)
      : clamp((activeBlueCount - 3) * 0.065, 0.14, 1.15)
    const vision = this.config.redVision * blob.traits.visionTrait * densityVisibility
    blob.maxEnergy = this.config.redCopyThreshold * 1.35

    // 1. Check if in post-contact pause animation
    if (blob.action === 'pausing' && blob.actionTimer > 0) {
      blob.actionTimer -= dt
      blob.vx *= 0.7
      blob.vy *= 0.7
      blob.bouncePhase += dt * 11
      // Waiting uses a little energy
      blob.energy -= this.config.redEnergyUse * 0.32 * dt

      if (blob.actionTimer <= 0) {
        blob.actionTimer = 0
        blob.action = 'wandering'
        blob.targetId = null
      }
    } else {
      // 2. Active seeking of blue blobs
      let nearestBlue: BlobEntity | null = null
      let nearestBlueDist = Infinity

      for (const blue of blueBlobs) {
        if (deadIds.has(blue.id) || blue.graceTimer > 0) continue
        const d = Math.hypot(blue.x - blob.x, blue.y - blob.y)
        if (d <= vision && d < nearestBlueDist) {
          nearestBlueDist = d
          nearestBlue = blue
        }
      }

      // Mild repulsion between red blobs so they don't stack on identical coordinates
      let sepVx = 0
      let sepVy = 0
      let redNeighbors = 0
      const redSpace = 28
      for (const other of redBlobs) {
        if (other.id === blob.id || deadIds.has(other.id)) continue
        const dx = blob.x - other.x
        const dy = blob.y - other.y
        const dist = Math.hypot(dx, dy)
        if (dist > 0.01 && dist < redSpace) {
          const push = (redSpace - dist) / redSpace
          sepVx += (dx / dist) * push
          sepVy += (dy / dist) * push
          redNeighbors++
        }
      }

      let desiredAngle = blob.heading
      let speedFraction = 0.6

      if (nearestBlue) {
        const contactReach = 16.0
        if (nearestBlueDist <= contactReach) {
          // Gentle contact interaction!
          // If blue population is small and contact strength is moderate, drain is gentler (canopy shelter)
          const shelterFactor = isRedHeavySetup
            ? 0.9
            : clamp((activeBlueCount - 4) * 0.045, 0.18, 0.78)
          const drained = Math.min(nearestBlue.energy - 8, this.config.redContactStrength * shelterFactor)
          if (drained > 0) {
            nearestBlue.energy -= drained
          }
          nearestBlue.graceTimer = isRedHeavySetup ? 1.5 : 3.0

          // If blue was eating a fruit, interrupt its eating
          if (nearestBlue.action === 'eating') {
            const slotInfo = this.findSlotById(nearestBlue.targetId)
            if (slotInfo) {
              slotInfo.slot.state = 'cooldown'
              slotInfo.slot.cooldownRemaining = this.config.fruitReturnDelay * 0.6
              slotInfo.slot.eatenByBlobId = null
            }
            nearestBlue.action = 'fleeing'
            nearestBlue.actionTimer = 0
          }

          if (isRedHeavySetup && nearestBlue.energy <= 12) {
            nearestBlue.energy = 0
            deadIds.add(nearestBlue.id)
            this.spawnEffect('fade', nearestBlue.x, nearestBlue.y, 0.8)
          } else if (nearestBlue.energy <= 3) {
            nearestBlue.energy = 0
            deadIds.add(nearestBlue.id)
            this.spawnEffect('fade', nearestBlue.x, nearestBlue.y, 0.8)
          } else {
            // Push the blue blob gently away
            const pushAngle = Math.atan2(nearestBlue.y - blob.y, nearestBlue.x - blob.x)
            nearestBlue.x += Math.cos(pushAngle) * 10
            nearestBlue.y += Math.sin(pushAngle) * 10
            nearestBlue.heading = pushAngle
          }

          // Red blob restores energy from the contact interaction
          const gained = this.config.redContactStrength * (isRedHeavySetup ? 0.65 : 0.82) + 8
          blob.energy = Math.min(blob.maxEnergy, blob.energy + gained)
          blob.contactsMade++
          blob.action = 'pausing'
          blob.actionDuration = this.config.redPauseTime
          blob.actionTimer = this.config.redPauseTime
          blob.targetId = nearestBlue.id

          const midX = (blob.x + nearestBlue.x) * 0.5
          const midY = (blob.y + nearestBlue.y) * 0.5
          this.spawnEffect('contact', midX, midY, Math.min(1.1, this.config.redPauseTime))
          speedFraction = 0
        } else {
          blob.action = 'hunting'
          blob.targetId = nearestBlue.id
          desiredAngle = Math.atan2(nearestBlue.y - blob.y, nearestBlue.x - blob.x)
          speedFraction = 0.95
        }
      } else {
        // Wander when no blue blobs are nearby
        blob.action = 'wandering'
        blob.targetId = null
        blob.wanderAngle += this.rng.range(-2.1, 2.1) * dt
        desiredAngle = blob.wanderAngle
        speedFraction = 0.54
      }

      if (blob.action !== 'pausing') {
        const vx = Math.cos(desiredAngle) * speedFraction + sepVx * 0.6
        const vy = Math.sin(desiredAngle) * speedFraction + sepVy * 0.6
        desiredAngle = Math.atan2(vy, vx)

        this.moveBlobInDish(blob, desiredAngle, maxSpeed * speedFraction, dt)

        const crowdPenalty = 1 + redNeighbors * 0.12
        const traitCost = 0.85 + 0.15 * (blob.traits.speedTrait * blob.traits.speedTrait) + 0.08 * blob.traits.visionTrait
        const moveBurn = this.config.redEnergyUse * traitCost * crowdPenalty * (0.35 + 0.65 * speedFraction)
        blob.energy -= moveBurn * dt
      }
    }

    // 3. Reproduction using stored energy
    if (
      blob.energy >= this.config.redCopyThreshold &&
      blob.reproCooldown <= 0 &&
      blob.action !== 'pausing' &&
      redBlobs.length + newBabies.filter((b) => b.species === 'red').length < 90
    ) {
      const child = this.reproduceBlob(blob, this.config.redCopyThreshold)
      newBabies.push(child)
      this.spawnEffect('birth_red', child.x, child.y, 0.9)
    }

    // 4. Starvation check
    if (blob.energy <= 0) {
      deadIds.add(blob.id)
      this.spawnEffect('fade', blob.x, blob.y, 0.75)
    }
  }

  private moveBlobInDish(blob: BlobEntity, desiredAngle: number, speed: number, dt: number): void {
    const maxRadius = this.config.worldSize - 12
    const distFromCenter = Math.hypot(blob.x, blob.y)

    // Soft inward steering near the circular dish rim
    let targetAngle = desiredAngle
    if (distFromCenter > maxRadius * 0.86) {
      const toCenterAngle = Math.atan2(-blob.y, -blob.x)
      const edgeWeight = clamp((distFromCenter - maxRadius * 0.86) / (maxRadius * 0.14), 0, 1)
      const diff = wrapAngle(toCenterAngle - targetAngle)
      targetAngle = wrapAngle(targetAngle + diff * edgeWeight * 0.85)
      blob.wanderAngle = targetAngle
    }

    const angleDiff = wrapAngle(targetAngle - blob.heading)
    const turnRate = 7.5
    blob.heading = wrapAngle(blob.heading + clamp(angleDiff, -turnRate * dt, turnRate * dt))

    blob.vx = Math.cos(blob.heading) * speed
    blob.vy = Math.sin(blob.heading) * speed
    blob.x += blob.vx * dt
    blob.y += blob.vy * dt

    // Hard clamp inside circular dish
    const newDist = Math.hypot(blob.x, blob.y)
    if (newDist > maxRadius) {
      const scale = maxRadius / newDist
      blob.x *= scale
      blob.y *= scale
      blob.heading = Math.atan2(-blob.y, -blob.x) + this.rng.range(-0.4, 0.4)
      blob.wanderAngle = blob.heading
    }

    blob.bouncePhase += dt * (4.5 + speed * 0.16)
  }

  private reproduceBlob(parent: BlobEntity, threshold: number): BlobEntity {
    // Making a new blob spends stored energy from the parent
    const energySpent = threshold * 0.52
    const childEnergy = threshold * 0.45
    parent.energy = Math.max(12, parent.energy - energySpent)
    parent.reproCooldown = 3.2
    parent.childrenCount++

    const spawnAngle = parent.heading + Math.PI + this.rng.range(-0.6, 0.6)
    const spawnDist = 12
    const maxRadius = this.config.worldSize - 14
    let cx = parent.x + Math.cos(spawnAngle) * spawnDist
    let cy = parent.y + Math.sin(spawnAngle) * spawnDist
    const d = Math.hypot(cx, cy)
    if (d > maxRadius) {
      cx *= maxRadius / d
      cy *= maxRadius / d
    }

    const traits: BlobTraits = {
      speedTrait: clamp(parent.traits.speedTrait + this.rng.range(-0.07, 0.07), 0.68, 1.48),
      visionTrait: clamp(parent.traits.visionTrait + this.rng.range(-0.07, 0.07), 0.68, 1.48),
      sizeTrait: clamp(parent.traits.sizeTrait + this.rng.range(-0.05, 0.05), 0.8, 1.25),
    }

    const num = this.nextBlobNumber++
    const names = parent.species === 'blue' ? BLUE_NAMES : RED_NAMES
    const baseName = names[(num - 1) % names.length]

    return {
      id: `${parent.species}-${num}`,
      name: `${baseName} #${num}`,
      species: parent.species,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      heading: spawnAngle,
      energy: childEnergy,
      maxEnergy: threshold * 1.35,
      age: 0,
      generation: parent.generation + 1,
      parentId: parent.id,
      childrenCount: 0,
      fruitsEaten: 0,
      contactsMade: 0,
      action: 'wandering',
      actionTimer: 0,
      actionDuration: 0,
      targetId: null,
      graceTimer: 1.0,
      reproCooldown: 3.5,
      wanderAngle: spawnAngle,
      bouncePhase: this.rng.range(0, Math.PI * 2),
      blinkTimer: this.rng.range(1.5, 4.5),
      isBlinking: 0,
      traits,
    }
  }

  private findSlotById(slotId: string | null): { tree: TreeEntity; slot: FruitSlot } | null {
    if (!slotId) return null
    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        if (slot.id === slotId) return { tree, slot }
      }
    }
    return null
  }

  private spawnEffect(type: SimEffect['type'], x: number, y: number, duration: number): void {
    this.effects.push({
      id: `fx-${this.nextEffectNumber++}`,
      type,
      x,
      y,
      age: 0,
      duration,
    })
  }

  private updateEffects(dt: number): void {
    for (const fx of this.effects) {
      fx.age += dt
    }
    this.effects = this.effects.filter((fx) => fx.age < fx.duration)
  }

  private recordHistoryPoint(): void {
    const blues = this.blobs.filter((b) => b.species === 'blue')
    const reds = this.blobs.filter((b) => b.species === 'red')

    const avgBlueSpeed =
      blues.length > 0
        ? blues.reduce((acc, b) => acc + this.config.blueSpeed * b.traits.speedTrait, 0) / blues.length
        : 0
    const avgBlueVision =
      blues.length > 0
        ? blues.reduce((acc, b) => acc + this.config.blueVision * b.traits.visionTrait, 0) / blues.length
        : 0
    const avgRedSpeed =
      reds.length > 0
        ? reds.reduce((acc, b) => acc + this.config.redSpeed * b.traits.speedTrait, 0) / reds.length
        : 0
    const avgRedVision =
      reds.length > 0
        ? reds.reduce((acc, b) => acc + this.config.redVision * b.traits.visionTrait, 0) / reds.length
        : 0

    const avgBlueEnergy =
      blues.length > 0 ? blues.reduce((acc, b) => acc + b.energy, 0) / blues.length : 0
    const avgRedEnergy =
      reds.length > 0 ? reds.reduce((acc, b) => acc + b.energy, 0) / reds.length : 0

    this.history.push({
      time: Number(this.time.toFixed(1)),
      fruitCount: this.getRipeFruitCount(),
      regrowingFruitCount: this.getRegrowingFruitCount(),
      blueCount: blues.length,
      redCount: reds.length,
      avgBlueSpeed: Number(avgBlueSpeed.toFixed(1)),
      avgBlueVision: Number(avgBlueVision.toFixed(1)),
      avgRedSpeed: Number(avgRedSpeed.toFixed(1)),
      avgRedVision: Number(avgRedVision.toFixed(1)),
      avgBlueEnergy: Number(avgBlueEnergy.toFixed(1)),
      avgRedEnergy: Number(avgRedEnergy.toFixed(1)),
    })

    if (this.history.length > 720) {
      this.history.shift()
    }
  }

  public getSummary(): SimSummary {
    const h = this.history
    if (h.length < 6) {
      return {
        headline: 'The garden is just waking up.',
        detail: 'Press Play and watch blue blobs forage for green fruit while red blobs seek gentle contact.',
        regime: 'warming_up',
        waveCount: 0,
        peakBlue: h[0]?.blueCount ?? 0,
        peakRed: h[0]?.redCount ?? 0,
        peakFruit: h[0]?.fruitCount ?? 0,
      }
    }

    let peakBlue = 0
    let minBlue = Infinity
    let peakRed = 0
    let peakFruit = 0
    let sumBlue = 0
    let sumRed = 0

    for (const pt of h) {
      if (pt.blueCount > peakBlue) peakBlue = pt.blueCount
      if (pt.blueCount < minBlue) minBlue = pt.blueCount
      if (pt.redCount > peakRed) peakRed = pt.redCount
      if (pt.fruitCount > peakFruit) peakFruit = pt.fruitCount
      sumBlue += pt.blueCount
      sumRed += pt.redCount
    }

    const avgBlue = sumBlue / h.length
    const avgRed = sumRed / h.length
    const latest = h[h.length - 1]
    const initial = h[0]

    // Count blue waves (smoothed local maxima)
    let waveCount = 0
    const window = 4
    const smoothedBlue = h.map((_, idx) => {
      let s = 0
      let c = 0
      for (let k = Math.max(0, idx - window); k <= Math.min(h.length - 1, idx + window); k++) {
        s += h[k].blueCount
        c++
      }
      return s / c
    })

    let lookingForPeak = true
    let refVal = smoothedBlue[0]
    for (let i = 1; i < smoothedBlue.length; i++) {
      const v = smoothedBlue[i]
      if (lookingForPeak) {
        if (v > refVal) refVal = v
        else if (refVal - v >= 3.5) {
          waveCount++
          lookingForPeak = false
          refVal = v
        }
      } else {
        if (v < refVal) refVal = v
        else if (v - refVal >= 3.5) {
          lookingForPeak = true
          refVal = v
        }
      }
    }

    if (this.config.fruitLimit <= 25 && peakBlue <= 18) {
      return {
        headline: 'Low fruit kept the garden small.',
        detail: `With a tight fruit cap of ${this.config.fruitLimit} and slower regrowth, populations stayed compact (averaging ${avgBlue.toFixed(1)} blue and ${avgRed.toFixed(1)} red blobs).`,
        regime: 'small_garden',
        waveCount,
        peakBlue,
        peakRed,
        peakFruit,
      }
    }

    if (latest.blueCount === 0 && latest.redCount === 0) {
      return {
        headline: 'Both blob groups faded and the trees reclaimed the dish.',
        detail: `Without foragers, green fruit regrew to ${latest.fruitCount}. Try increasing fruit growth or lowering energy burn.`,
        regime: 'collapsed',
        waveCount,
        peakBlue,
        peakRed,
        peakFruit,
      }
    }

    if (latest.redCount === 0 && initial.redCount > 0) {
      if (minBlue <= initial.blueCount * 0.5) {
        return {
          headline: 'Blue blobs dipped first, then red blobs ran low on energy and faded.',
          detail: `Heavy contact pressure drove blue blobs down to ${minBlue}; once red blobs faded out, the world settled into a simpler fruit-and-blue state (${latest.blueCount} blue).`,
          regime: 'red_collapse',
          waveCount,
          peakBlue,
          peakRed,
          peakFruit,
        }
      }
      return {
        headline: 'One group faded and the world settled into a simpler state.',
        detail: `Red blobs ran low on contact energy and faded out, leaving ${latest.blueCount} blue blobs to balance directly against the fruit supply.`,
        regime: 'red_collapse',
        waveCount,
        peakBlue,
        peakRed,
        peakFruit,
      }
    }

    if (peakBlue >= 34 && this.config.fruitLimit >= 85) {
      return {
        headline: 'Abundant fruit fueled a rapid blue boom, with red seekers rising behind them.',
        detail: `Lush fruiting supported up to ${peakBlue} blue blobs and ${peakRed} red blobs while leveling out around the dish's carrying capacity.`,
        regime: 'blue_dominant',
        waveCount,
        peakBlue,
        peakRed,
        peakFruit,
      }
    }

    if (waveCount >= 2 || (latest.blueCount > 0 && latest.redCount > 0 && peakBlue - minBlue >= 6)) {
      return {
        headline: 'The garden stayed balanced with out-of-phase waves.',
        detail: `Blue blobs grew when fruit was plentiful (peaking at ${peakBlue}), then red blobs followed (peaking at ${peakRed}) across ${ Math.max(1, waveCount) } natural cycle${waveCount === 1 ? '' : 's'}.`,
        regime: 'balanced',
        waveCount: Math.max(1, waveCount),
        peakBlue,
        peakRed,
        peakFruit,
      }
    }

    return {
      headline: 'Blue blobs grew first, then red blobs followed.',
      detail: `Currently ${latest.blueCount} blue blobs, ${latest.redCount} red blobs, and ${latest.fruitCount} ripe fruits are active in the dish.`,
      regime: 'balanced',
      waveCount,
      peakBlue,
      peakRed,
      peakFruit,
    }
  }
}
