import { Rng } from "./rng";
import type {
  Behavior,
  Creature,
  HistorySample,
  Plant,
  SimParams,
  Traits,
} from "./types";

const TAU = Math.PI * 2;
const MAX_HISTORY = 900;
const SAMPLE_EVERY = 0.25;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function mutateTrait(
  base: number,
  rng: Rng,
  rate: number,
  scale: number,
  lo: number,
  hi: number,
): number {
  if (!rng.chance(rate)) return clamp(base, lo, hi);
  return clamp(base * (1 + rng.normal(0, scale)), lo, hi);
}

export class World {
  params: SimParams;
  rng: Rng;
  plants: Plant[] = [];
  creatures: Creature[] = [];
  history: HistorySample[] = [];
  time = 0;
  tick = 0;
  nextId = 1;
  sampleAcc = 0;
  captures = 0;
  births = 0;
  starvations = 0;
  peakPrey = 0;
  peakPredators = 0;

  constructor(params: SimParams) {
    this.params = { ...params };
    this.rng = new Rng(params.seed);
    this.reset();
  }

  reset(params?: Partial<SimParams>): void {
    if (params) Object.assign(this.params, params);
    this.rng = new Rng(this.params.seed);
    this.plants = [];
    this.creatures = [];
    this.history = [];
    this.time = 0;
    this.tick = 0;
    this.nextId = 1;
    this.sampleAcc = 0;
    this.captures = 0;
    this.births = 0;
    this.starvations = 0;
    this.peakPrey = 0;
    this.peakPredators = 0;
    this.spawnPlants();
    this.spawnCreatures();
    this.recordSample();
  }

  private spawnPlants(): void {
    const { worldRadius, plantCount, foodCarryingCapacity } = this.params;
    for (let i = 0; i < plantCount; i++) {
      const a = this.rng.next() * TAU;
      const r = Math.sqrt(this.rng.next()) * worldRadius * 0.92;
      const kindRoll = this.rng.next();
      const kind: Plant["kind"] =
        kindRoll < 0.35 ? "tree" : kindRoll < 0.75 ? "bush" : "sprout";
      const maxFood =
        foodCarryingCapacity *
        (kind === "tree" ? 1.4 : kind === "bush" ? 1 : 0.65) *
        this.rng.range(0.75, 1.2);
      this.plants.push({
        id: this.nextId++,
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        food: this.rng.range(0.3, 1) * maxFood,
        maxFood,
        regrowTimer: 0,
        sway: this.rng.next() * TAU,
        size: kind === "tree" ? this.rng.range(1.1, 1.45) : kind === "bush" ? this.rng.range(0.85, 1.15) : this.rng.range(0.55, 0.8),
        kind,
      });
    }
  }

  private baseTraits(species: "prey" | "predator"): Traits {
    const p = this.params;
    if (species === "prey") {
      return {
        speed: p.preyBaseSpeed * this.rng.range(0.9, 1.1),
        vision: p.preyBaseVision * this.rng.range(0.9, 1.1),
        metabolism: p.preyBaseMetabolism * this.rng.range(0.9, 1.1),
        size: this.rng.range(0.9, 1.1),
      };
    }
    return {
      speed: p.predatorBaseSpeed * this.rng.range(0.9, 1.1),
      vision: p.predatorBaseVision * this.rng.range(0.9, 1.1),
      metabolism: p.predatorBaseMetabolism * this.rng.range(0.9, 1.1),
      size: this.rng.range(0.95, 1.2),
    };
  }

  private inheritTraits(parent: Creature): Traits {
    const p = this.params;
    if (!p.evolutionEnabled) {
      return { ...this.baseTraits(parent.species) };
    }
    const t = parent.traits;
    return {
      speed: mutateTrait(t.speed, this.rng, p.mutationRate, p.mutationScale, 20, 120),
      vision: mutateTrait(t.vision, this.rng, p.mutationRate, p.mutationScale, 30, 160),
      metabolism: mutateTrait(
        t.metabolism,
        this.rng,
        p.mutationRate,
        p.mutationScale,
        1.5,
        9,
      ),
      size: mutateTrait(t.size, this.rng, p.mutationRate, p.mutationScale, 0.6, 1.6),
    };
  }

  private makeCreature(
    species: "prey" | "predator",
    x: number,
    y: number,
    traits?: Traits,
    parentId: number | null = null,
    generation = 0,
  ): Creature {
    const p = this.params;
    const t = traits ?? this.baseTraits(species);
    return {
      id: this.nextId++,
      species,
      x,
      y,
      vx: 0,
      vy: 0,
      energy: species === "prey" ? p.preyStartEnergy : p.predatorStartEnergy,
      age: 0,
      traits: t,
      behavior: "wandering",
      actionTimer: 0,
      facing: this.rng.next() * TAU,
      bounce: this.rng.next() * TAU,
      blink: this.rng.range(1, 4),
      fear: 0,
      glow: 0,
      squash: 1,
      generation,
      parentId,
      targetId: null,
      targetPlant: null,
    };
  }

  private spawnCreatures(): void {
    const R = this.params.worldRadius * 0.85;
    for (let i = 0; i < this.params.startPrey; i++) {
      const a = this.rng.next() * TAU;
      const r = Math.sqrt(this.rng.next()) * R;
      this.creatures.push(
        this.makeCreature("prey", Math.cos(a) * r, Math.sin(a) * r),
      );
    }
    for (let i = 0; i < this.params.startPredators; i++) {
      const a = this.rng.next() * TAU;
      const r = Math.sqrt(this.rng.next()) * R;
      this.creatures.push(
        this.makeCreature("predator", Math.cos(a) * r, Math.sin(a) * r),
      );
    }
  }

  counts() {
    let prey = 0;
    let predators = 0;
    let food = 0;
    for (const c of this.creatures) {
      if (c.species === "prey") prey++;
      else predators++;
    }
    for (const pl of this.plants) food += pl.food;
    return { prey, predators, food };
  }

  private recordSample(): void {
    const { prey, predators, food } = this.counts();
    this.peakPrey = Math.max(this.peakPrey, prey);
    this.peakPredators = Math.max(this.peakPredators, predators);

    let ps = 0,
      pv = 0,
      pm = 0,
      ds = 0,
      dv = 0,
      dm = 0;
    for (const c of this.creatures) {
      if (c.species === "prey") {
        ps += c.traits.speed;
        pv += c.traits.vision;
        pm += c.traits.metabolism;
      } else {
        ds += c.traits.speed;
        dv += c.traits.vision;
        dm += c.traits.metabolism;
      }
    }

    this.history.push({
      t: this.time,
      food,
      prey,
      predators,
      avgPreySpeed: prey ? ps / prey : 0,
      avgPreyVision: prey ? pv / prey : 0,
      avgPreyMetabolism: prey ? pm / prey : 0,
      avgPredSpeed: predators ? ds / predators : 0,
      avgPredVision: predators ? dv / predators : 0,
      avgPredMetabolism: predators ? dm / predators : 0,
    });
    if (this.history.length > MAX_HISTORY) this.history.shift();
  }

  step(dt: number): void {
    const steps = Math.max(1, Math.ceil(dt / 0.05));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.substep(h);
  }

  private substep(dt: number): void {
    this.time += dt;
    this.tick++;
    this.updatePlants(dt);
    this.updateCreatures(dt);
    this.sampleAcc += dt;
    if (this.sampleAcc >= SAMPLE_EVERY) {
      this.sampleAcc = 0;
      this.recordSample();
    }
  }

  private updatePlants(dt: number): void {
    const { foodGrowthRate, foodRegrowDelay } = this.params;
    for (const pl of this.plants) {
      pl.sway += dt * (0.6 + pl.size * 0.2);
      if (pl.food <= 0.05) {
        pl.regrowTimer += dt;
        if (pl.regrowTimer >= foodRegrowDelay) {
          pl.food = Math.min(pl.maxFood, pl.food + foodGrowthRate * dt * 0.4);
          if (pl.food > 0.15) pl.regrowTimer = foodRegrowDelay;
        }
      } else {
        pl.regrowTimer = 0;
        const room = pl.maxFood - pl.food;
        if (room > 0) {
          pl.food = Math.min(
            pl.maxFood,
            pl.food + foodGrowthRate * dt * (0.35 + room / pl.maxFood),
          );
        }
      }
    }
  }

  private nearestPlant(c: Creature, needFood = true): Plant | null {
    let best: Plant | null = null;
    let bestD = c.traits.vision;
    for (const pl of this.plants) {
      if (needFood && pl.food < 0.25) continue;
      const d = dist(c.x, c.y, pl.x, pl.y);
      if (d < bestD) {
        bestD = d;
        best = pl;
      }
    }
    return best;
  }

  private nearestOf(
    c: Creature,
    species: "prey" | "predator",
    range: number,
  ): Creature | null {
    let best: Creature | null = null;
    let bestD = range;
    for (const o of this.creatures) {
      if (o.id === c.id || o.species !== species) continue;
      if (o.behavior === "digesting" && species === "prey") continue;
      const d = dist(c.x, c.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private steerToward(
    c: Creature,
    tx: number,
    ty: number,
    weight: number,
  ): void {
    const dx = tx - c.x;
    const dy = ty - c.y;
    const d = Math.hypot(dx, dy) || 1;
    c.vx += (dx / d) * weight;
    c.vy += (dy / d) * weight;
  }

  private steerAway(c: Creature, tx: number, ty: number, weight: number): void {
    this.steerToward(c, tx, ty, -weight);
  }

  private applyMove(c: Creature, dt: number, busy: boolean): void {
    const speedMul = busy ? 0.08 : 1;
    // Trait tradeoff: speed & vision cost extra metabolism
    const traitCost =
      (c.traits.speed / 60) * 0.22 + (c.traits.vision / 90) * 0.15 + c.traits.size * 0.12;
    const moveCost =
      c.traits.metabolism * dt * (0.35 + traitCost) +
      Math.hypot(c.vx, c.vy) * 0.006 * dt * c.traits.size;

    c.energy -= moveCost;

    const maxSp = c.traits.speed * speedMul;
    const sp = Math.hypot(c.vx, c.vy);
    if (sp > maxSp) {
      c.vx = (c.vx / sp) * maxSp;
      c.vy = (c.vy / sp) * maxSp;
    }

    c.x += c.vx * dt;
    c.y += c.vy * dt;

    // Soft boundary — bounce inside dish
    const R = this.params.worldRadius * 0.94;
    const d = Math.hypot(c.x, c.y);
    if (d > R) {
      const nx = c.x / d;
      const ny = c.y / d;
      c.x = nx * R;
      c.y = ny * R;
      const push = (c.vx * nx + c.vy * ny) * 1.4;
      c.vx -= nx * push;
      c.vy -= ny * push;
    }

    if (Math.hypot(c.vx, c.vy) > 2) {
      c.facing = Math.atan2(c.vy, c.vx);
    }

    c.bounce += dt * (6 + Math.hypot(c.vx, c.vy) * 0.08);
    c.blink -= dt;
    if (c.blink <= 0) c.blink = this.rng.range(1.2, 4.5);
    c.glow = Math.max(0, c.glow - dt * 2.2);
    c.fear = Math.max(0, c.fear - dt * 1.4);
    c.squash += (1 - c.squash) * Math.min(1, dt * 8);
    c.age += dt;

    // damping
    c.vx *= 1 - Math.min(0.9, 3.2 * dt);
    c.vy *= 1 - Math.min(0.9, 3.2 * dt);
  }

  private tryReproduce(
    c: Creature,
    census: { prey: number; predators: number; food: number },
  ): void {
    const p = this.params;
    const isPrey = c.species === "prey";
    const need = isPrey ? p.preyReproduceEnergy : p.predatorReproduceEnergy;
    const cost = isPrey ? p.preyReproduceCost : p.predatorReproduceCost;
    let chance = isPrey ? p.preyReproduceChance : p.predatorReproduceChance;
    if (c.energy < need) return;

    // Soft carrying capacity: crowded prey reproduce less when food is thin
    if (isPrey) {
      const pressure = census.prey / Math.max(8, census.food * 2.2 + 12);
      chance *= clamp(1.15 - pressure * 0.55, 0.25, 1);
    } else {
      // Predators struggle to recruit when prey are scarce or predators dense
      chance *= clamp(
        census.prey / (census.prey + census.predators * 2.5 + 8),
        0.15,
        1,
      );
    }

    // ~chance * 0.4 attempts/sec while above threshold (substep ~0.05s)
    if (!this.rng.chance(chance * 0.02)) return;

    c.energy -= cost;
    c.behavior = "reproducing";
    c.actionTimer = 0.35;
    c.glow = 1;
    c.squash = 1.25;

    const ang = this.rng.next() * TAU;
    const child = this.makeCreature(
      c.species,
      c.x + Math.cos(ang) * 10,
      c.y + Math.sin(ang) * 10,
      this.inheritTraits(c),
      c.id,
      c.generation + 1,
    );
    child.energy = cost * 0.85;
    this.creatures.push(child);
    this.births++;
  }

  private updateCreatures(dt: number): void {
    const dead = new Set<number>();
    const snapshot = this.creatures.slice();
    const census = this.counts();

    for (const c of snapshot) {
      if (dead.has(c.id)) continue;

      if (c.actionTimer > 0) {
        c.actionTimer -= dt;
        const busy =
          c.behavior === "eating" ||
          c.behavior === "digesting" ||
          c.behavior === "reproducing";
        if (busy) {
          c.vx *= 0.5;
          c.vy *= 0.5;
          this.applyMove(c, dt, true);
          if (c.actionTimer <= 0) c.behavior = "wandering";
          if (c.energy <= 0) {
            dead.add(c.id);
            this.starvations++;
          }
          continue;
        }
      }

      if (c.species === "prey") this.thinkPrey(c, dt);
      else this.thinkPredator(c, dt, dead);

      if (dead.has(c.id)) continue;

      this.tryReproduce(c, census);
      this.applyMove(c, dt, false);

      if (c.energy <= 0) {
        dead.add(c.id);
        this.starvations++;
      }
    }

    this.creatures = this.creatures.filter((c) => !dead.has(c.id));
  }

  private thinkPrey(c: Creature, dt: number): void {
    const p = this.params;
    const threat = this.nearestOf(c, "predator", c.traits.vision * 0.95);
    if (threat) {
      c.behavior = "fleeing";
      c.fear = 1;
      c.targetId = threat.id;
      this.steerAway(
        c,
        threat.x,
        threat.y,
        c.traits.speed * p.preyFleeWeight * 0.08,
      );
      // wander jitter
      c.vx += this.rng.range(-8, 8) * dt;
      c.vy += this.rng.range(-8, 8) * dt;
      return;
    }

    const plant = this.nearestPlant(c, true);
    if (plant) {
      c.targetPlant = plant.id;
      const d = dist(c.x, c.y, plant.x, plant.y);
      if (d < 12 + plant.size * 4) {
        // eat
        const bite = Math.min(plant.food, 1);
        if (bite > 0.2) {
          plant.food -= bite;
          if (plant.food < 0.05) {
            plant.food = 0;
            plant.regrowTimer = 0;
          }
          c.energy += p.foodEnergy * bite;
          c.behavior = "eating";
          c.actionTimer = p.preyEatTime;
          c.glow = 1;
          c.squash = 0.75;
          c.vx *= 0.2;
          c.vy *= 0.2;
          return;
        }
      }
      c.behavior = "seeking_food";
      this.steerToward(c, plant.x, plant.y, c.traits.speed * 0.06);
    } else {
      c.behavior = "wandering";
      c.vx += Math.cos(c.facing + this.rng.range(-0.4, 0.4)) * c.traits.speed * 0.03;
      c.vy += Math.sin(c.facing + this.rng.range(-0.4, 0.4)) * c.traits.speed * 0.03;
      if (this.rng.chance(0.02)) c.facing += this.rng.range(-1, 1);
    }
  }

  private thinkPredator(c: Creature, dt: number, dead: Set<number>): void {
    const p = this.params;
    const range = Math.max(c.traits.vision, p.predatorHuntRange * 3);
    const prey = this.nearestOf(c, "prey", range);
    if (!prey || dead.has(prey.id)) {
      c.behavior = "wandering";
      c.vx += Math.cos(c.facing) * c.traits.speed * 0.025;
      c.vy += Math.sin(c.facing) * c.traits.speed * 0.025;
      if (this.rng.chance(0.03)) c.facing += this.rng.range(-1.2, 1.2);
      return;
    }

    c.targetId = prey.id;
    c.behavior = "hunting";
    this.steerToward(c, prey.x, prey.y, c.traits.speed * 0.075);

    const d = dist(c.x, c.y, prey.x, prey.y);
    const catchR = p.predatorHuntRange * (0.7 + c.traits.size * 0.3);
    if (d < catchR) {
      const preyCount = this.creatures.reduce(
        (n, x) => n + (x.species === "prey" && !dead.has(x.id) ? 1 : 0),
        0,
      );
      // Refuge effect: scarce prey are harder to finish off → avoids instant extinction
      const refuge = clamp(preyCount / (preyCount + 10), 0.2, 1);
      const chance =
        p.predatorCaptureChance *
        refuge *
        clamp(1.05 - prey.traits.speed / (c.traits.speed + 25), 0.3, 1.15);
      if (this.rng.chance(chance * Math.min(1, dt * 10))) {
        // abstract capture — energy transfer, non-graphic
        dead.add(prey.id);
        this.captures++;
        c.energy += p.predatorEnergyGain;
        c.behavior = "digesting";
        c.actionTimer = p.predatorFeedTime;
        c.glow = 1.2;
        c.squash = 1.3;
        c.vx *= 0.15;
        c.vy *= 0.15;
      }
    }
  }

  creatureById(id: number | null): Creature | null {
    if (id == null) return null;
    return this.creatures.find((c) => c.id === id) ?? null;
  }

  pickAt(wx: number, wy: number, radius = 14): Creature | null {
    let best: Creature | null = null;
    let bestD = radius;
    for (const c of this.creatures) {
      const d = dist(wx, wy, c.x, c.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  behaviorLabel(b: Behavior): string {
    switch (b) {
      case "seeking_food":
        return "Seeking food";
      case "fleeing":
        return "Fleeing";
      case "eating":
        return "Eating";
      case "hunting":
        return "Hunting";
      case "digesting":
        return "Digesting";
      case "reproducing":
        return "Reproducing";
      case "resting":
        return "Resting";
      default:
        return "Wandering";
    }
  }
}
