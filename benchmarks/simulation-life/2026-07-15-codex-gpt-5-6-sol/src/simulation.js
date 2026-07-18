export const DEFAULT_CONFIG = {
  fruitGrowth: 0.36,
  fruitLimit: 54,
  fruitDelay: 8,
  blueUse: 0.72,
  blueSpeed: 17,
  blueVision: 86,
  blueCopy: 76,
  blueEatTime: 1.1,
  redUse: 0.78,
  redSpeed: 18,
  redVision: 96,
  redContact: 22,
  redCopy: 90,
  redPause: 1.8,
  trees: 8,
  blueStart: 14,
  redStart: 5,
  worldSize: 210,
  seed: 3729,
  simSpeed: 1,
}

export const PRESETS = {
  balanced: { label: 'Balanced garden', note: 'A gentle, repeating chase', values: {} },
  fruit: {
    label: 'Fruit-rich garden',
    note: 'Blue blooms before red follows',
    values: { fruitGrowth: 0.66, fruitLimit: 78, trees: 10, blueStart: 12, redStart: 4, redUse: 0.86, redCopy: 96, redContact: 20, redPause: 2.2 },
  },
  red: {
    label: 'Red-heavy garden',
    note: 'A sharp blue dip, then a red fade',
    values: { redStart: 14, blueStart: 18, fruitLimit: 58, redContact: 40, redUse: 0.76 },
  },
  fragile: {
    label: 'Fragile balance',
    note: 'Small changes have big effects',
    values: { fruitGrowth: 0.25, fruitLimit: 38, blueStart: 10, redStart: 7, blueUse: 0.82 },
  },
  low: {
    label: 'Low-fruit garden',
    note: 'A tiny world living carefully',
    values: { fruitGrowth: 0.14, fruitLimit: 20, trees: 5, blueStart: 8, redStart: 3, fruitDelay: 13 },
  },
}

export function seeded(seed) {
  let a = (Number(seed) || 1) >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export class GardenSimulation {
  constructor(config = DEFAULT_CONFIG) {
    this.config = { ...config }
    this.reset()
  }

  reset(config = this.config) {
    this.config = { ...config }
    this.random = seeded(this.config.seed)
    this.time = 0
    this.nextId = 1
    this.blobs = []
    this.trees = []
    this.particles = []
    this.history = []
    this.events = []
    this.nextHistory = 0
    this.lastFruitTotal = 0
    this.makeTrees(this.config.trees)
    for (let i = 0; i < this.config.blueStart; i++) this.addBlob('blue')
    for (let i = 0; i < this.config.redStart; i++) this.addBlob('red')
    this.record()
  }

  randomPoint(padding = 12) {
    const radius = Math.sqrt(this.random()) * (this.config.worldSize - padding)
    const angle = this.random() * Math.PI * 2
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  }

  makeTrees(count) {
    const perTree = Math.max(1, this.config.fruitLimit / count)
    for (let i = 0; i < count; i++) {
      let point = this.randomPoint(42)
      let tries = 0
      while (this.trees.some((tree) => distance(tree, point) < 48) && tries++ < 20) point = this.randomPoint(42)
      this.trees.push({
        id: `tree-${i}`,
        ...point,
        fruit: perTree * (0.62 + this.random() * 0.32),
        delay: this.random() * 2,
        phase: this.random() * Math.PI * 2,
        crown: 0.86 + this.random() * 0.25,
      })
    }
  }

  addBlob(type, parent = null) {
    const cfg = this.config
    const point = parent
      ? { x: parent.x + (this.random() - 0.5) * 16, y: parent.y + (this.random() - 0.5) * 16 }
      : this.randomPoint(18)
    const baseSpeed = type === 'blue' ? cfg.blueSpeed : cfg.redSpeed
    const baseVision = type === 'blue' ? cfg.blueVision : cfg.redVision
    const angle = this.random() * Math.PI * 2
    const blob = {
      id: this.nextId++,
      type,
      x: point.x,
      y: point.y,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      heading: angle,
      energy: parent ? 32 : 54 + this.random() * 28,
      age: 0,
      state: 'wandering',
      timer: 0,
      actionTotal: 0,
      cooldown: this.random() * 2,
      think: 0,
      target: null,
      generation: parent ? parent.generation + 1 : 1,
      parent: parent?.id ?? null,
      speedTrait: baseSpeed * (0.92 + this.random() * 0.16),
      visionTrait: baseVision * (0.92 + this.random() * 0.16),
      phase: this.random() * Math.PI * 2,
      blinkAt: 1.4 + this.random() * 4,
      blink: 0,
      pulse: 0,
    }
    this.keepInside(blob)
    this.blobs.push(blob)
    return blob
  }

  keepInside(blob) {
    const max = this.config.worldSize - 8
    const radius = Math.hypot(blob.x, blob.y)
    if (radius > max) {
      blob.x = (blob.x / radius) * max
      blob.y = (blob.y / radius) * max
      const nx = blob.x / max
      const ny = blob.y / max
      const dot = blob.vx * nx + blob.vy * ny
      if (dot > 0) {
        blob.vx -= 1.8 * dot * nx
        blob.vy -= 1.8 * dot * ny
      }
    }
  }

  setDirection(blob, x, y, blend = 0.16) {
    const mag = Math.hypot(x, y) || 1
    const nx = x / mag
    const ny = y / mag
    blob.vx = blob.vx * (1 - blend) + nx * blend
    blob.vy = blob.vy * (1 - blend) + ny * blend
    const vm = Math.hypot(blob.vx, blob.vy) || 1
    blob.vx /= vm
    blob.vy /= vm
    blob.heading = Math.atan2(blob.vy, blob.vx)
  }

  nearest(blob, collection, predicate = () => true) {
    let best = null
    let bestDistance = Infinity
    for (const item of collection) {
      if (item === blob || !predicate(item)) continue
      const d = distance(blob, item)
      if (d < bestDistance) {
        best = item
        bestDistance = d
      }
    }
    return { item: best, distance: bestDistance }
  }

  spawnParticles(x, y, color, count = 7) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2
      const speed = 10 + this.random() * 24
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + this.random() * 0.5,
        maxLife: 1.1,
        color,
        size: 1.4 + this.random() * 2.2,
      })
    }
  }

  beginEat(blob, tree) {
    if (tree.fruit < 1 || blob.cooldown > 0) return
    tree.fruit -= 1
    tree.delay = this.config.fruitDelay
    blob.state = 'munching'
    blob.timer = this.config.blueEatTime
    blob.actionTotal = blob.timer
    blob.target = tree.id
    blob.cooldown = this.config.blueEatTime + 1.2
    blob.pulse = 1
    blob.pendingEnergy = 35
    this.spawnParticles(tree.x, tree.y, '#b8d84b', 6)
  }

  beginContact(red, blue) {
    if (red.cooldown > 0 || blue.cooldown > 0) return
    red.state = 'sharing warmth'
    red.timer = this.config.redPause
    red.actionTotal = red.timer
    red.cooldown = this.config.redPause + 2.1
    red.target = blue.id
    red.energy = Math.min(110, red.energy + this.config.redContact)
    red.pulse = 1
    blue.energy -= this.config.redContact * 0.32
    blue.cooldown = 1.25
    blue.state = 'recovering'
    blue.timer = 0.45
    blue.actionTotal = 0.45
    blue.pulse = 1
    this.spawnParticles((red.x + blue.x) / 2, (red.y + blue.y) / 2, '#ffb7a4', 9)
  }

  updateBlob(blob, dt) {
    const cfg = this.config
    blob.age += dt
    blob.cooldown = Math.max(0, blob.cooldown - dt)
    blob.pulse = Math.max(0, blob.pulse - dt * 1.7)
    blob.blinkAt -= dt
    if (blob.blinkAt <= 0) {
      blob.blink = 0.14
      blob.blinkAt = 2.2 + this.random() * 5
    }
    blob.blink = Math.max(0, blob.blink - dt)

    const energyUse = blob.type === 'blue' ? cfg.blueUse : cfg.redUse
    if (blob.timer > 0) {
      blob.timer -= dt
      blob.energy -= energyUse * 0.23 * dt
      if (blob.timer <= 0) {
        if (blob.pendingEnergy) {
          blob.energy = Math.min(110, blob.energy + blob.pendingEnergy)
          blob.pendingEnergy = 0
        }
        blob.state = 'looking around'
      }
      return
    }

    blob.think -= dt
    if (blob.think <= 0) {
      blob.think = 0.26 + this.random() * 0.34
      if (blob.type === 'blue') {
        const threat = this.nearest(blob, this.blobs, (b) => b.type === 'red')
        if (threat.item && threat.distance < Math.min(60, blob.visionTrait * 0.7)) {
          blob.state = 'dodging red'
          blob.target = threat.item.id
          this.setDirection(blob, blob.x - threat.item.x, blob.y - threat.item.y, 0.5)
        } else {
          const food = this.nearest(blob, this.trees, (tree) => tree.fruit >= 1)
          if (food.item && food.distance < blob.visionTrait) {
            blob.state = 'seeking fruit'
            blob.target = food.item.id
            this.setDirection(blob, food.item.x - blob.x, food.item.y - blob.y, 0.38)
          } else {
            blob.state = 'wandering'
            blob.target = null
            this.setDirection(blob, this.random() - 0.5, this.random() - 0.5, 0.14)
          }
        }
      } else {
        const target = this.nearest(blob, this.blobs, (b) => b.type === 'blue' && b.cooldown <= 0)
        if (target.item && target.distance < blob.visionTrait) {
          blob.state = 'following blue'
          blob.target = target.item.id
          this.setDirection(blob, target.item.x - blob.x, target.item.y - blob.y, 0.42)
        } else {
          blob.state = 'wandering'
          blob.target = null
          this.setDirection(blob, this.random() - 0.5, this.random() - 0.5, 0.18)
        }
      }

      const crowd = this.nearest(blob, this.blobs, (b) => b.type === blob.type)
      if (crowd.item && crowd.distance < 18) {
        this.setDirection(blob, blob.x - crowd.item.x, blob.y - crowd.item.y, 0.34)
      }
    }

    const speed = blob.speedTrait * (blob.energy < 20 ? 0.66 : 1) * (blob.state === 'dodging red' ? 1.18 : 1)
    blob.x += blob.vx * speed * dt
    blob.y += blob.vy * speed * dt
    blob.energy -= energyUse * dt * (0.85 + speed / 45)
    this.keepInside(blob)

    if (blob.type === 'blue') {
      const tree = this.nearest(blob, this.trees, (item) => item.fruit >= 1)
      if (tree.item && tree.distance < 18) this.beginEat(blob, tree.item)
    } else {
      const blue = this.nearest(blob, this.blobs, (item) => item.type === 'blue' && item.cooldown <= 0)
      if (blue.item && blue.distance < 13) this.beginContact(blob, blue.item)
    }
  }

  reproduce(dt) {
    const blueCount = this.blobs.filter((blob) => blob.type === 'blue').length
    const redCount = this.blobs.length - blueCount
    for (const blob of [...this.blobs]) {
      const threshold = blob.type === 'blue' ? this.config.blueCopy : this.config.redCopy
      const count = blob.type === 'blue' ? blueCount : redCount
      const cap = blob.type === 'blue' ? 72 : 48
      if (blob.energy > threshold && count < cap && blob.age > 5 && this.random() < dt * 0.12) {
        // A child receives only part of the parent's spent energy. The rest is
        // the metabolic cost of reproduction, so population growth is never free.
        const parentCost = threshold * (blob.type === 'blue' ? 0.60 : 0.58)
        const childShare = threshold * (blob.type === 'blue' ? 0.34 : 0.34)
        blob.energy -= parentCost
        const child = this.addBlob(blob.type, blob)
        child.energy = childShare
        blob.state = 'welcoming a sprout'
        blob.timer = 0.7
        blob.actionTotal = 0.7
        this.spawnParticles(blob.x, blob.y, blob.type === 'blue' ? '#84d8ff' : '#ff927c', 10)
      }
    }
  }

  update(dt) {
    dt = Math.min(dt, 0.12)
    this.time += dt
    const totalTreeCapacity = Math.max(1, this.config.fruitLimit / Math.max(1, this.trees.length))
    for (const tree of this.trees) {
      tree.delay = Math.max(0, tree.delay - dt)
      if (tree.delay <= 0 && tree.fruit < totalTreeCapacity) {
        tree.fruit = Math.min(totalTreeCapacity, tree.fruit + this.config.fruitGrowth * dt)
      }
    }

    for (const blob of this.blobs) this.updateBlob(blob, dt)
    this.reproduce(dt)
    this.blobs = this.blobs.filter((blob) => blob.energy > 0 && blob.age < 190)

    for (const particle of this.particles) {
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.vx *= 0.96
      particle.vy *= 0.96
      particle.life -= dt
    }
    this.particles = this.particles.filter((particle) => particle.life > 0)
    if (this.time >= this.nextHistory) {
      this.record()
      this.nextHistory = this.time + 1.25
    }
  }

  record() {
    const blue = this.blobs.filter((blob) => blob.type === 'blue').length
    const red = this.blobs.length - blue
    const fruit = Math.round(this.trees.reduce((sum, tree) => sum + tree.fruit, 0))
    this.history.push({ time: this.time, fruit, blue, red })
    if (this.history.length > 240) this.history.shift()
    this.lastFruitTotal = fruit
  }

  snapshot() {
    const blue = this.blobs.filter((blob) => blob.type === 'blue')
    const red = this.blobs.filter((blob) => blob.type === 'red')
    return {
      time: this.time,
      fruit: Math.round(this.trees.reduce((sum, tree) => sum + tree.fruit, 0)),
      blue: blue.length,
      red: red.length,
      avgBlueEnergy: blue.length ? blue.reduce((sum, blob) => sum + blob.energy, 0) / blue.length : 0,
      avgRedEnergy: red.length ? red.reduce((sum, blob) => sum + blob.energy, 0) / red.length : 0,
      history: [...this.history],
    }
  }
}

export function summarize(history) {
  if (history.length < 4) return { title: 'The garden is waking up', text: 'Let it run a little longer and its rhythm will appear here.' }
  const recent = history.slice(-28)
  const last = recent.at(-1)
  const maxBlue = Math.max(...recent.map((p) => p.blue))
  const maxRed = Math.max(...recent.map((p) => p.red))
  const minFruit = Math.min(...recent.map((p) => p.fruit))
  if (last.blue === 0 && last.red === 0) return { title: 'The garden went quiet', text: 'Both groups spent their last energy. More fruit or gentler energy use may revive the rhythm.' }
  if (last.blue === 0) return { title: 'Blue faded first', text: 'Without blue neighbors, the red group will soon run low too. Try more fruit or fewer starting reds.' }
  if (last.red === 0) return { title: 'A peaceful blue garden', text: 'Red faded away, leaving blue to follow the fruit cycle on its own.' }
  if (minFruit < 5 && maxBlue < 14) return { title: 'A careful, tiny garden', text: 'Low fruit is keeping every population small and each meal important.' }
  if (maxBlue > maxRed * 2.4) return { title: 'Blue found its stride', text: 'Fruit lifted blue first. Red now has more neighbors to follow, so watch for the delayed rise.' }
  return { title: 'The garden is breathing', text: 'Blue and red are trading momentum while fruit quietly rebuilds between meals.' }
}
