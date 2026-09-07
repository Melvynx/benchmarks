import {
  BlobAction,
  BlobEntity,
  EntityId,
  FruitSlot,
  FruitTree,
  GeneticTraits,
  HistoryPoint,
  InteractiveTool,
  SimulationConfig,
  SimulationEvent,
  Species,
} from '../types/simulation';
import { DEFAULT_CONFIG } from './presets';

// Names generator for cute character personalities
const BLUE_NAMES = [
  'Pip', 'Mochi', 'Pebble', 'Sprout', 'Bluey', 'Dew', 'Plum', 'Bramble',
  'Twig', 'Button', 'Clover', 'Nori', 'Bean', 'Fig', 'Berry', 'Fern',
  'Pico', 'Bubbles', 'Boba', 'Moss', 'Tadpole', 'Lumi', 'Wisp', 'Kumo',
  'Sorrel', 'Periwinkle', 'Sky', 'Echo', 'Zippy', 'Glint'
];

const RED_NAMES = [
  'Ruby', 'Crimson', 'Chili', 'Spark', 'Blaze', 'Pepper', 'Rust', 'Fox',
  'Rory', 'Pecan', 'Garnet', 'Copper', 'Ember', 'Tango', 'Cinder', 'Kitsune',
  'Flame', 'Fierce', 'Bandit', 'Scarlet', 'Rusty', 'Roar', 'Pyro', 'Dash',
  'Cinnabar', 'Vulcan', 'Blitz', 'Salsa', 'Claw', 'Fang'
];

export class SimulationEngine {
  public config: SimulationConfig;
  public time: number = 0;
  public ticks: number = 0;
  public isRunning: boolean = true;
  public simSpeed: number = 1.0;

  public blobs: Map<EntityId, BlobEntity> = new Map();
  public trees: FruitTree[] = [];
  public events: SimulationEvent[] = [];
  public history: HistoryPoint[] = [];

  public selectedBlobId: EntityId | null = null;
  public trackedBlobId: EntityId | null = null;
  public activeTool: InteractiveTool = 'inspect';

  private idCounter = 1;
  private historyTimer = 0;
  private readonly HISTORY_INTERVAL = 0.25; // record every 250ms
  private readonly MAX_HISTORY_POINTS = 400;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reset();
  }

  public reset(newConfig?: Partial<SimulationConfig>) {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    this.time = 0;
    this.ticks = 0;
    this.blobs.clear();
    this.trees = [];
    this.events = [];
    this.history = [];
    this.idCounter = 1;
    this.selectedBlobId = null;
    this.trackedBlobId = null;

    this.initTrees();
    this.initBlobs();
    this.recordHistoryPoint();
  }

  private pseudoRandom(seedOffset: number = 0): number {
    const x = Math.sin(this.config.randomSeed + this.idCounter * 997 + seedOffset * 17) * 10000;
    return x - Math.floor(x);
  }

  private initTrees() {
    this.trees = [];
    const count = this.config.treeCount;
    const rMax = this.config.worldRadius * 0.78;

    // Use sunflower / phyllotaxis layout with jitter for natural look
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const theta = i * goldenAngle + (Math.random() - 0.5) * 0.3;
      const r = Math.sqrt((i + 0.6) / count) * rMax + (Math.random() - 0.5) * 3;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      const fruitCount = this.config.fruitPerTree;
      const fruits: FruitSlot[] = [];
      const foliageR = 2.8 + Math.random() * 0.8;

      for (let f = 0; f < fruitCount; f++) {
        const fruitAngle = (f / fruitCount) * Math.PI * 2 + Math.random() * 0.4;
        const fruitDist = foliageR * (0.65 + Math.random() * 0.25);
        const fruitH = 2.2 + Math.random() * 1.2;

        fruits.push({
          id: `tree_${i}_fruit_${f}`,
          localX: Math.cos(fruitAngle) * fruitDist,
          localY: fruitH,
          localZ: Math.sin(fruitAngle) * fruitDist,
          isRipe: Math.random() > 0.15, // Most start ripe
          growthProgress: 1.0,
        });
      }

      this.trees.push({
        id: `tree_${i}`,
        x,
        z,
        scale: 0.9 + Math.random() * 0.25,
        foliageRadius: foliageR,
        fruits,
        jiggle: 0,
      });
    }
  }

  private initBlobs() {
    this.blobs.clear();

    // Spawn Blue blobs
    for (let i = 0; i < this.config.blueCount; i++) {
      this.spawnBlob('blue', undefined, undefined, 1);
    }

    // Spawn Red blobs
    for (let i = 0; i < this.config.redCount; i++) {
      this.spawnBlob('red', undefined, undefined, 1);
    }
  }

  public spawnBlob(
    species: Species,
    x?: number,
    z?: number,
    generation = 1,
    parentTraits?: GeneticTraits,
    initialEnergy?: number
  ): BlobEntity {
    const id = `${species}_${this.idCounter++}`;
    const nameList = species === 'blue' ? BLUE_NAMES : RED_NAMES;
    const name = `${nameList[Math.floor(Math.random() * nameList.length)]} #${this.idCounter % 1000}`;

    // Random position within world dish if not specified
    if (x === undefined || z === undefined) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (this.config.worldRadius * 0.75);
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
    }

    // Traits with mutation
    const traits: GeneticTraits = parentTraits
      ? this.mutateTraits(parentTraits)
      : {
          speed: 0.9 + Math.random() * 0.2,
          vision: 0.9 + Math.random() * 0.2,
          efficiency: 0.95 + Math.random() * 0.1,
          size: 0.9 + Math.random() * 0.2,
        };

    const maxEnergy = species === 'blue' ? this.config.blueCopyThreshold * 1.3 : this.config.redCopyThreshold * 1.3;
    const startEnergy = initialEnergy !== undefined
      ? initialEnergy
      : (species === 'blue' ? this.config.blueCopyThreshold * 0.65 : this.config.redCopyThreshold * 0.65);

    const blob: BlobEntity = {
      id,
      species,
      x,
      z,
      vx: (Math.random() - 0.5) * 4,
      vz: (Math.random() - 0.5) * 4,
      angle: Math.random() * Math.PI * 2,
      energy: startEnergy,
      maxEnergy,
      age: 0,
      generation,
      name,
      action: 'wandering',
      actionTimer: 0,
      targetId: null,
      targetPos: null,
      traits,
      stats: {
        fruitEaten: 0,
        contactsMade: 0,
        offspringCount: 0,
        distanceTraveled: 0,
      },
      hopPhase: Math.random() * Math.PI * 2,
      blinkTimer: 1.5 + Math.random() * 3,
      isBlinking: false,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    };

    this.blobs.set(id, blob);

    this.events.push({
      id: `birth_${id}_${this.ticks}`,
      type: 'birth',
      x,
      y: 1.0,
      z,
      species,
      message: `${blob.name} was born (Gen ${generation})`,
    });

    return blob;
  }

  private mutateTraits(parent: GeneticTraits): GeneticTraits {
    const rate = this.config.mutationRate;
    const strength = this.config.mutationStrength;

    const mutate = (val: number) => {
      if (Math.random() < rate) {
        const delta = (Math.random() * 2 - 1) * strength;
        return Math.max(0.65, Math.min(1.55, val + delta));
      }
      return val;
    };

    return {
      speed: mutate(parent.speed),
      vision: mutate(parent.vision),
      efficiency: mutate(parent.efficiency),
      size: mutate(parent.size),
    };
  }

  public update(dt: number) {
    if (!this.isRunning || dt <= 0) return;

    // Clamp dt to avoid physics blowups on background tabs
    const clampedDt = Math.min(dt, 0.1) * this.simSpeed;

    this.time += clampedDt;
    this.ticks++;

    // 1. Update fruit trees regrowth
    this.updateTrees(clampedDt);

    // 2. Update blobs AI, movement, interactions, energy
    this.updateBlobs(clampedDt);

    // 3. Tree jiggle decay
    for (const tree of this.trees) {
      if (tree.jiggle > 0) {
        tree.jiggle = Math.max(0, tree.jiggle - clampedDt * 3.5);
      }
    }

    // 4. Record history
    this.historyTimer += clampedDt;
    if (this.historyTimer >= this.HISTORY_INTERVAL) {
      this.historyTimer = 0;
      this.recordHistoryPoint();
    }

    // Trim events
    if (this.events.length > 40) {
      this.events = this.events.slice(this.events.length - 40);
    }
  }

  private updateTrees(dt: number) {
    const returnDelay = this.config.fruitReturnDelay;
    const growthSpeed = this.config.fruitGrowthSpeed;

    for (const tree of this.trees) {
      for (const fruit of tree.fruits) {
        if (!fruit.isRipe) {
          fruit.growthProgress += (dt * growthSpeed) / returnDelay;
          if (fruit.growthProgress >= 1.0) {
            fruit.isRipe = true;
            fruit.growthProgress = 1.0;
          }
        }
      }
    }
  }

  private updateBlobs(dt: number) {
    const blobsList = Array.from(this.blobs.values());
    const deadBlobIds: EntityId[] = [];
    const births: BlobEntity[] = [];

    // Spatial lookup for fruits
    const ripeFruits: { treeId: string; fruitId: string; x: number; z: number }[] = [];
    for (const tree of this.trees) {
      for (const f of tree.fruits) {
        if (f.isRipe) {
          ripeFruits.push({
            treeId: tree.id,
            fruitId: f.id,
            x: tree.x + f.localX,
            z: tree.z + f.localZ,
          });
        }
      }
    }

    for (const blob of blobsList) {
      blob.age += dt;

      // Blinking animation
      blob.blinkTimer -= dt;
      if (blob.blinkTimer <= 0) {
        blob.isBlinking = !blob.isBlinking;
        blob.blinkTimer = blob.isBlinking ? 0.15 : (2.0 + Math.random() * 3.5);
      }

      // Hop animation phase
      const moveSpeed = Math.hypot(blob.vx, blob.vz);
      blob.hopPhase += dt * (4.0 + moveSpeed * 0.8);

      // Energy burn
      let energyBurn = 0;
      if (blob.species === 'blue') {
        const basalCost = this.config.blueEnergyUse * (1.0 / blob.traits.efficiency);
        const moveCost = this.config.blueMoveEnergyCost * (moveSpeed * moveSpeed) * blob.traits.size;
        // Basal cost is lower when resting/eating
        const stateMultiplier = (blob.action === 'eating' || blob.action === 'paused') ? 0.4 : 1.0;
        energyBurn = (basalCost * stateMultiplier + moveCost) * dt;
      } else {
        const basalCost = this.config.redEnergyUse * (1.0 / blob.traits.efficiency);
        const moveCost = this.config.redMoveEnergyCost * (moveSpeed * moveSpeed) * blob.traits.size;
        const stateMultiplier = (blob.action === 'paused') ? 0.35 : 1.0;
        energyBurn = (basalCost * stateMultiplier + moveCost) * dt;
      }

      blob.energy -= energyBurn;

      // Check starvation
      if (blob.energy <= 0) {
        deadBlobIds.push(blob.id);
        this.events.push({
          id: `death_${blob.id}_${this.ticks}`,
          type: 'death',
          x: blob.x,
          y: 0.8,
          z: blob.z,
          species: blob.species,
          message: `${blob.name} ran out of energy`,
        });
        continue;
      }

      // Action State Machine
      if (blob.action === 'eating') {
        blob.actionTimer -= dt;
        blob.vx *= 0.75;
        blob.vz *= 0.75;
        // Chewing squash & stretch
        blob.scaleY = 1.0 + Math.sin(blob.age * 16) * 0.2;
        blob.scaleX = 1.0 - Math.sin(blob.age * 16) * 0.1;
        blob.scaleZ = blob.scaleX;

        if (blob.actionTimer <= 0) {
          // Finished eating fruit!
          blob.action = 'wandering';
          blob.energy = Math.min(blob.maxEnergy, blob.energy + this.config.fruitEnergyValue);
          blob.stats.fruitEaten++;
          blob.scaleX = 1;
          blob.scaleY = 1;
          blob.scaleZ = 1;

          // Find the fruit and mark as consumed
          if (blob.targetId) {
            for (const tree of this.trees) {
              const f = tree.fruits.find(fr => fr.id === blob.targetId);
              if (f && f.isRipe) {
                f.isRipe = false;
                f.growthProgress = 0;
                tree.jiggle = 1.0;
                this.events.push({
                  id: `eat_${blob.id}_${this.ticks}`,
                  type: 'eat_fruit',
                  x: blob.x,
                  y: 1.5,
                  z: blob.z,
                  species: 'blue',
                  value: this.config.fruitEnergyValue,
                });
                break;
              }
            }
          }
          blob.targetId = null;
        }
      } else if (blob.action === 'paused') {
        blob.actionTimer -= dt;
        blob.vx *= 0.8;
        blob.vz *= 0.8;
        // Satisfied gentle breathing
        blob.scaleY = 1.0 + Math.sin(blob.age * 5) * 0.08;
        blob.scaleX = 1.0 - Math.sin(blob.age * 5) * 0.04;
        blob.scaleZ = blob.scaleX;

        if (blob.actionTimer <= 0) {
          blob.action = 'wandering';
          blob.scaleX = 1;
          blob.scaleY = 1;
          blob.scaleZ = 1;
        }
      } else {
        // Active AI Behaviors
        if (blob.species === 'blue') {
          this.updateBlueAI(blob, dt, ripeFruits, blobsList);
        } else {
          this.updateRedAI(blob, dt, blobsList);
        }
      }

      // Check Reproduction
      const copyThreshold = blob.species === 'blue'
        ? this.config.blueCopyThreshold
        : this.config.redCopyThreshold;

      const maxPop = blob.species === 'blue' ? 120 : 60;
      const currentPop = Array.from(this.blobs.values()).filter(b => b.species === blob.species).length;

      if (blob.energy >= copyThreshold && currentPop < maxPop && blob.action !== 'eating' && blob.action !== 'paused') {
        // Split!
        const childEnergy = blob.energy * 0.44;
        blob.energy = blob.energy * 0.44;
        blob.stats.offspringCount++;

        const angleOffset = Math.random() * Math.PI * 2;
        const childX = blob.x + Math.cos(angleOffset) * 2.0;
        const childZ = blob.z + Math.sin(angleOffset) * 2.0;

        const child = this.spawnBlob(
          blob.species,
          childX,
          childZ,
          blob.generation + 1,
          blob.traits,
          childEnergy
        );
        births.push(child);
      }

      // Update position & boundary physics
      blob.x += blob.vx * dt;
      blob.z += blob.vz * dt;
      blob.stats.distanceTraveled += moveSpeed * dt;

      // Smooth orientation facing movement direction
      if (moveSpeed > 0.3) {
        const targetAngle = Math.atan2(blob.vx, blob.vz);
        // Angle lerp
        let diff = targetAngle - blob.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        blob.angle += diff * Math.min(1.0, dt * 10);
      }

      // Dish circular boundary constraint
      const distFromCenter = Math.hypot(blob.x, blob.z);
      const maxR = this.config.worldRadius * 0.88;
      if (distFromCenter > maxR) {
        const angle = Math.atan2(blob.z, blob.x);
        blob.x = Math.cos(angle) * maxR;
        blob.z = Math.sin(angle) * maxR;
        // Bounce inward
        const normalX = -Math.cos(angle);
        const normalZ = -Math.sin(angle);
        const dot = blob.vx * normalX + blob.vz * normalZ;
        blob.vx = (blob.vx - 1.8 * dot * normalX) * 0.6;
        blob.vz = (blob.vz - 1.8 * dot * normalZ) * 0.6;
      }
    }

    // Remove dead blobs
    for (const id of deadBlobIds) {
      if (this.selectedBlobId === id) this.selectedBlobId = null;
      if (this.trackedBlobId === id) this.trackedBlobId = null;
      this.blobs.delete(id);
    }
  }

  private updateBlueAI(
    blob: BlobEntity,
    dt: number,
    ripeFruits: { treeId: string; fruitId: string; x: number; z: number }[],
    allBlobs: BlobEntity[]
  ) {
    const vision = this.config.blueBaseVision * blob.traits.vision;
    const maxSpeed = this.config.blueBaseSpeed * blob.traits.speed;
    const fleeDist = this.config.blueFleeDistance;

    let steerX = 0;
    let steerZ = 0;

    // 1. Check for nearest predator (Red blob)
    let nearestPredator: BlobEntity | null = null;
    let nearestPredatorDist = Infinity;

    for (const other of allBlobs) {
      if (other.species === 'red') {
        const d = Math.hypot(other.x - blob.x, other.z - blob.z);
        if (d < fleeDist && d < nearestPredatorDist) {
          nearestPredatorDist = d;
          nearestPredator = other;
        }
      }
    }

    if (nearestPredator) {
      // PANIC & FLEE!
      blob.action = 'fleeing';
      blob.targetId = nearestPredator.id;
      const dx = blob.x - nearestPredator.x;
      const dz = blob.z - nearestPredator.z;
      const len = Math.hypot(dx, dz) || 1;
      const fleeForce = (fleeDist - nearestPredatorDist) / fleeDist * 2.5;
      steerX += (dx / len) * fleeForce * 18;
      steerZ += (dz / len) * fleeForce * 18;
    } else {
      // 2. Look for nearest ripe fruit
      let nearestFruit: { treeId: string; fruitId: string; x: number; z: number } | null = null;
      let nearestFruitDist = Infinity;

      for (const f of ripeFruits) {
        const d = Math.hypot(f.x - blob.x, f.z - blob.z);
        if (d < vision && d < nearestFruitDist) {
          nearestFruitDist = d;
          nearestFruit = f;
        }
      }

      if (nearestFruit) {
        blob.action = 'foraging';
        blob.targetId = nearestFruit.fruitId;
        blob.targetPos = { x: nearestFruit.x, z: nearestFruit.z };

        const dx = nearestFruit.x - blob.x;
        const dz = nearestFruit.z - blob.z;
        const d = nearestFruitDist;

        if (d < 3.2) {
          // Reached fruit! Enter eating state
          blob.action = 'eating';
          blob.actionTimer = this.config.blueEatingTime;
          blob.vx = 0;
          blob.vz = 0;
          return;
        } else {
          // Move towards fruit
          steerX += (dx / d) * 12;
          steerZ += (dz / d) * 12;
        }
      } else {
        // 3. Wander casually
        blob.action = 'wandering';
        blob.targetId = null;
        blob.targetPos = null;

        const wanderAngle = blob.angle + (Math.random() - 0.5) * 1.5;
        steerX += Math.sin(wanderAngle) * 5;
        steerZ += Math.cos(wanderAngle) * 5;
      }
    }

    // 4. Separation from fellow blues
    let sepX = 0;
    let sepZ = 0;
    let sepCount = 0;
    for (const other of allBlobs) {
      if (other !== blob && other.species === 'blue') {
        const d = Math.hypot(other.x - blob.x, other.z - blob.z);
        if (d < 3.8 && d > 0.01) {
          sepX += (blob.x - other.x) / d;
          sepZ += (blob.z - other.z) / d;
          sepCount++;
        }
      }
    }
    if (sepCount > 0) {
      steerX += (sepX / sepCount) * this.config.blueSeparationForce * 7;
      steerZ += (sepZ / sepCount) * this.config.blueSeparationForce * 7;
    }

    // Apply steering
    blob.vx += steerX * dt * 4.5;
    blob.vz += steerZ * dt * 4.5;

    // Apply friction and speed clamp
    blob.vx *= 0.94;
    blob.vz *= 0.94;
    const currentSpeed = Math.hypot(blob.vx, blob.vz);
    const speedLimit = blob.action === 'fleeing' ? maxSpeed * 1.35 : maxSpeed;
    if (currentSpeed > speedLimit) {
      blob.vx = (blob.vx / currentSpeed) * speedLimit;
      blob.vz = (blob.vz / currentSpeed) * speedLimit;
    }
  }

  private updateRedAI(blob: BlobEntity, dt: number, allBlobs: BlobEntity[]) {
    const vision = this.config.redBaseVision * blob.traits.vision;
    const maxSpeed = this.config.redBaseSpeed * blob.traits.speed;

    let steerX = 0;
    let steerZ = 0;

    // Search for nearest Blue blob (prey)
    let nearestPrey: BlobEntity | null = null;
    let nearestPreyDist = Infinity;

    for (const other of allBlobs) {
      if (other.species === 'blue') {
        const d = Math.hypot(other.x - blob.x, other.z - blob.z);
        if (d < vision && d < nearestPreyDist) {
          nearestPreyDist = d;
          nearestPrey = other;
        }
      }
    }

    if (nearestPrey) {
      // HUNTING!
      blob.action = 'hunting';
      blob.targetId = nearestPrey.id;
      blob.targetPos = { x: nearestPrey.x, z: nearestPrey.z };

      const dx = nearestPrey.x - blob.x;
      const dz = nearestPrey.z - blob.z;
      const d = nearestPreyDist;

      if (d < 3.4) {
        // CONTACT INTERACTION!
        blob.action = 'paused';
        blob.actionTimer = this.config.redPauseTime;
        blob.stats.contactsMade++;
        blob.vx *= 0.2;
        blob.vz *= 0.2;

        const energyTransferred = Math.min(
          nearestPrey.energy,
          this.config.redContactStrength
        );

        nearestPrey.energy -= this.config.redContactStrength;
        blob.energy = Math.min(blob.maxEnergy, blob.energy + energyTransferred * 0.9);

        this.events.push({
          id: `predation_${blob.id}_${nearestPrey.id}_${this.ticks}`,
          type: 'predation',
          x: (blob.x + nearestPrey.x) / 2,
          y: 1.2,
          z: (blob.z + nearestPrey.z) / 2,
          species: 'red',
          value: energyTransferred,
          message: `${blob.name} tagged ${nearestPrey.name}!`,
        });

        return;
      } else {
        // Pursue with high urgency
        steerX += (dx / d) * 16;
        steerZ += (dz / d) * 16;
      }
    } else {
      // Wander searching for blue blobs
      blob.action = 'wandering';
      blob.targetId = null;
      blob.targetPos = null;

      const wanderAngle = blob.angle + (Math.random() - 0.5) * 1.8;
      steerX += Math.sin(wanderAngle) * 6;
      steerZ += Math.cos(wanderAngle) * 6;
    }

    // Separation from other red predators to avoid packing on same prey
    let sepX = 0;
    let sepZ = 0;
    let sepCount = 0;
    for (const other of allBlobs) {
      if (other !== blob && other.species === 'red') {
        const d = Math.hypot(other.x - blob.x, other.z - blob.z);
        if (d < 5.0 && d > 0.01) {
          sepX += (blob.x - other.x) / d;
          sepZ += (blob.z - other.z) / d;
          sepCount++;
        }
      }
    }
    if (sepCount > 0) {
      steerX += (sepX / sepCount) * this.config.redSeparationForce * 9;
      steerZ += (sepZ / sepCount) * this.config.redSeparationForce * 9;
    }

    // Apply steering
    blob.vx += steerX * dt * 5.0;
    blob.vz += steerZ * dt * 5.0;

    // Apply friction and speed clamp
    blob.vx *= 0.93;
    blob.vz *= 0.93;
    const currentSpeed = Math.hypot(blob.vx, blob.vz);
    if (currentSpeed > maxSpeed) {
      blob.vx = (blob.vx / currentSpeed) * maxSpeed;
      blob.vz = (blob.vz / currentSpeed) * maxSpeed;
    }
  }

  public plantTreeAt(x: number, z: number) {
    const dist = Math.hypot(x, z);
    if (dist > this.config.worldRadius * 0.85) return;

    const treeId = `tree_${this.trees.length}_${Date.now()}`;
    const fruitCount = this.config.fruitPerTree;
    const fruits: FruitSlot[] = [];
    const foliageR = 3.0;

    for (let f = 0; f < fruitCount; f++) {
      const fruitAngle = (f / fruitCount) * Math.PI * 2;
      const fruitDist = foliageR * 0.75;
      fruits.push({
        id: `${treeId}_fruit_${f}`,
        localX: Math.cos(fruitAngle) * fruitDist,
        localY: 2.4,
        localZ: Math.sin(fruitAngle) * fruitDist,
        isRipe: true,
        growthProgress: 1.0,
      });
    }

    this.trees.push({
      id: treeId,
      x,
      z,
      scale: 1.0,
      foliageRadius: foliageR,
      fruits,
      jiggle: 1.0,
    });

    this.events.push({
      id: `planted_${treeId}`,
      type: 'tree_planted',
      x,
      y: 1.0,
      z,
      message: 'New fruit tree planted!',
    });
  }

  public pokeBlob(id: EntityId) {
    const blob = this.blobs.get(id);
    if (!blob) return;
    // Fling blob slightly and startle
    const angle = Math.random() * Math.PI * 2;
    blob.vx += Math.cos(angle) * 15;
    blob.vz += Math.sin(angle) * 15;
    blob.action = blob.species === 'blue' ? 'fleeing' : 'wandering';
    blob.actionTimer = 0.8;
  }

  public feedBlob(id: EntityId) {
    const blob = this.blobs.get(id);
    if (!blob) return;
    blob.energy = Math.min(blob.maxEnergy, blob.energy + 40);
    this.events.push({
      id: `fed_${blob.id}_${this.ticks}`,
      type: 'eat_fruit',
      x: blob.x,
      y: 1.5,
      z: blob.z,
      species: blob.species,
      value: 40,
      message: `${blob.name} was fed!`,
    });
  }

  public getRipeFruitCount(): number {
    let count = 0;
    for (const t of this.trees) {
      for (const f of t.fruits) {
        if (f.isRipe) count++;
      }
    }
    return count;
  }

  public getTotalFruitCapacity(): number {
    let count = 0;
    for (const t of this.trees) {
      count += t.fruits.length;
    }
    return count;
  }

  public getStats() {
    let blueCount = 0;
    let redCount = 0;
    let blueEnergySum = 0;
    let redEnergySum = 0;
    let blueSpeedSum = 0;
    let redSpeedSum = 0;
    let blueVisionSum = 0;
    let redVisionSum = 0;

    for (const b of this.blobs.values()) {
      if (b.species === 'blue') {
        blueCount++;
        blueEnergySum += b.energy;
        blueSpeedSum += b.traits.speed;
        blueVisionSum += b.traits.vision;
      } else {
        redCount++;
        redEnergySum += b.energy;
        redSpeedSum += b.traits.speed;
        redVisionSum += b.traits.vision;
      }
    }

    return {
      fruitCount: this.getRipeFruitCount(),
      fruitCapacity: this.getTotalFruitCapacity(),
      blueCount,
      redCount,
      avgBlueEnergy: blueCount > 0 ? blueEnergySum / blueCount : 0,
      avgRedEnergy: redCount > 0 ? redEnergySum / redCount : 0,
      avgBlueSpeed: blueCount > 0 ? blueSpeedSum / blueCount : 0,
      avgRedSpeed: redCount > 0 ? redSpeedSum / redCount : 0,
      avgBlueVision: blueCount > 0 ? blueVisionSum / blueCount : 0,
      avgRedVision: redCount > 0 ? redVisionSum / redCount : 0,
    };
  }

  private recordHistoryPoint() {
    const stats = this.getStats();
    const point: HistoryPoint = {
      time: Math.round(this.time * 10) / 10,
      fruitCount: stats.fruitCount,
      blueCount: stats.blueCount,
      redCount: stats.redCount,
      avgBlueEnergy: stats.avgBlueEnergy,
      avgRedEnergy: stats.avgRedEnergy,
      avgBlueSpeed: stats.avgBlueSpeed,
      avgRedSpeed: stats.avgRedSpeed,
      avgBlueVision: stats.avgBlueVision,
      avgRedVision: stats.avgRedVision,
    };

    this.history.push(point);
    if (this.history.length > this.MAX_HISTORY_POINTS) {
      this.history.shift();
    }
  }
}
