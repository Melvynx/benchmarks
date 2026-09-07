import {
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

  public totalBirths: number = 0;
  public totalDeaths: number = 0;
  public blueBirths: number = 0;
  public redBirths: number = 0;
  public blueDeaths: number = 0;
  public redDeaths: number = 0;

  private idCounter = 1;
  private historyTimer = 0;
  private readonly HISTORY_INTERVAL = 0.25; // 250ms interval for smooth charts
  private readonly MAX_HISTORY_POINTS = 500;

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
    this.totalBirths = 0;
    this.totalDeaths = 0;
    this.blueBirths = 0;
    this.redBirths = 0;
    this.blueDeaths = 0;
    this.redDeaths = 0;

    this.initTrees();
    this.initBlobs();
    this.recordHistoryPoint();
  }

  private initTrees() {
    this.trees = [];
    const count = this.config.treeCount;
    const rMax = this.config.worldRadius * 0.76;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const theta = i * goldenAngle + (Math.random() - 0.5) * 0.25;
      const r = Math.sqrt((i + 0.6) / count) * rMax + (Math.random() - 0.5) * 2.5;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      const fruitCount = this.config.fruitPerTree;
      const fruits: FruitSlot[] = [];
      const foliageR = 3.0 + Math.random() * 0.8;

      for (let f = 0; f < fruitCount; f++) {
        const fruitAngle = (f / fruitCount) * Math.PI * 2 + Math.random() * 0.35;
        const fruitDist = foliageR * (0.68 + Math.random() * 0.22);
        const fruitH = 2.4 + Math.random() * 1.3;

        fruits.push({
          id: `tree_${i}_fruit_${f}`,
          localX: Math.cos(fruitAngle) * fruitDist,
          localY: fruitH,
          localZ: Math.sin(fruitAngle) * fruitDist,
          isRipe: Math.random() > 0.15,
          growthProgress: 1.0,
        });
      }

      this.trees.push({
        id: `tree_${i}`,
        x,
        z,
        scale: 0.95 + Math.random() * 0.25,
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
      const r = Math.random() * this.config.worldRadius * 0.65;
      const theta = Math.random() * Math.PI * 2;
      this.spawnBlob('blue', Math.cos(theta) * r, Math.sin(theta) * r, 1);
    }

    // Spawn Red blobs
    for (let i = 0; i < this.config.redCount; i++) {
      const r = (0.2 + Math.random() * 0.55) * this.config.worldRadius;
      const theta = Math.random() * Math.PI * 2;
      this.spawnBlob('red', Math.cos(theta) * r, Math.sin(theta) * r, 1);
    }
  }

  public spawnBlob(
    species: Species,
    x: number,
    z: number,
    generation: number = 1,
    parentTraits?: GeneticTraits,
    initialEnergy?: number
  ): BlobEntity {
    const id = `blob_${species}_${this.idCounter++}`;
    const namePool = species === 'blue' ? BLUE_NAMES : RED_NAMES;
    const name = namePool[Math.floor(Math.random() * namePool.length)];

    // Inherit or roll traits with mutation
    let traits: GeneticTraits;
    if (parentTraits) {
      const mutate = (val: number, min = 0.7, max = 1.45) => {
        if (Math.random() < this.config.mutationRate) {
          const shift = (Math.random() - 0.5) * 2 * this.config.mutationStrength;
          return Math.min(max, Math.max(min, val + shift));
        }
        return val;
      };
      traits = {
        speed: mutate(parentTraits.speed),
        vision: mutate(parentTraits.vision),
        efficiency: mutate(parentTraits.efficiency),
        size: mutate(parentTraits.size, 0.8, 1.25),
      };
    } else {
      traits = {
        speed: 0.9 + Math.random() * 0.2,
        vision: 0.9 + Math.random() * 0.2,
        efficiency: 0.92 + Math.random() * 0.16,
        size: 0.9 + Math.random() * 0.2,
      };
    }

    const maxEnergy = species === 'blue' ? 120 : 150;
    const defaultEnergy = species === 'blue' ? 55 : 75;
    const energy = Math.min(maxEnergy, initialEnergy ?? defaultEnergy);

    const blob: BlobEntity = {
      id,
      species,
      x,
      z,
      vx: (Math.random() - 0.5) * 3,
      vz: (Math.random() - 0.5) * 3,
      angle: Math.random() * Math.PI * 2,
      energy,
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
    this.totalBirths++;
    if (species === 'blue') this.blueBirths++;
    else this.redBirths++;

    return blob;
  }

  public step() {
    this.update(0.05);
  }

  public update(dt: number) {
    if (!this.isRunning && dt !== 0.05) return;

    const effectiveDt = dt * this.simSpeed;
    // Break into stable sub-steps to ensure high fidelity at fast sim speeds
    const maxSubStep = 0.04;
    let remainingDt = effectiveDt;

    while (remainingDt > 0) {
      const step = Math.min(remainingDt, maxSubStep);
      this.tickSubstep(step);
      remainingDt -= step;
    }
  }

  private tickSubstep(dt: number) {
    this.time += dt;
    this.ticks++;

    // 1. Regrow fruit on trees
    this.updateTrees(dt);

    // 2. Update blobs AI, movement, metabolism, interactions
    this.updateBlobs(dt);

    // 3. Tree jiggle decay
    for (const tree of this.trees) {
      if (tree.jiggle > 0) {
        tree.jiggle = Math.max(0, tree.jiggle - dt * 3.5);
      }
    }

    // 4. Record history periodic snapshot
    this.historyTimer += dt;
    if (this.historyTimer >= this.HISTORY_INTERVAL) {
      this.historyTimer = 0;
      this.recordHistoryPoint();
    }

    // 5. Clean up old events
    if (this.events.length > 50) {
      this.events = this.events.slice(this.events.length - 50);
    }
  }

  private updateTrees(dt: number) {
    const returnDelay = Math.max(0.5, this.config.fruitReturnDelay);
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

    // Spatial lookup for ripe fruits
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
      blob.hopPhase += dt * (4.5 + moveSpeed * 0.9);

      // Energy calculation
      let energyBurn = 0;
      if (blob.species === 'blue') {
        const basalCost = this.config.blueEnergyUse * (1.0 / blob.traits.efficiency);
        const moveCost = this.config.blueMoveEnergyCost * (moveSpeed * moveSpeed) * blob.traits.size;
        const stateMultiplier = (blob.action === 'eating' || blob.action === 'paused') ? 0.35 : 1.0;
        energyBurn = (basalCost * stateMultiplier + moveCost) * dt;
      } else {
        const basalCost = this.config.redEnergyUse * (1.0 / blob.traits.efficiency);
        const moveCost = this.config.redMoveEnergyCost * (moveSpeed * moveSpeed) * blob.traits.size;
        const stateMultiplier = (blob.action === 'paused') ? 0.35 : 1.0;
        energyBurn = (basalCost * stateMultiplier + moveCost) * dt;
      }

      blob.energy -= energyBurn;

      // Starvation check
      if (blob.energy <= 0) {
        deadBlobIds.push(blob.id);
        this.totalDeaths++;
        if (blob.species === 'blue') this.blueDeaths++;
        else this.redDeaths++;

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
        blob.vx *= 0.72;
        blob.vz *= 0.72;
        // Chewing squash & stretch animation
        blob.scaleY = 1.0 + Math.sin(blob.age * 16) * 0.18;
        blob.scaleX = 1.0 - Math.sin(blob.age * 16) * 0.09;
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
        blob.vx *= 0.78;
        blob.vz *= 0.78;
        // Satisfied gentle breathing
        blob.scaleY = 1.0 + Math.sin(blob.age * 6) * 0.08;
        blob.scaleX = 1.0 - Math.sin(blob.age * 6) * 0.04;
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

      const maxPop = blob.species === 'blue' ? 140 : 70;
      const currentSpeciesPop = blobsList.filter(b => b.species === blob.species).length;

      if (blob.energy >= copyThreshold && currentSpeciesPop < maxPop && blob.action !== 'eating' && blob.action !== 'paused') {
        // Reproduce / Split!
        const childEnergy = blob.energy * 0.44;
        blob.energy = blob.energy * 0.44;
        blob.stats.offspringCount++;

        const angleOffset = Math.random() * Math.PI * 2;
        const childX = blob.x + Math.cos(angleOffset) * 2.2;
        const childZ = blob.z + Math.sin(angleOffset) * 2.2;

        const child = this.spawnBlob(
          blob.species,
          childX,
          childZ,
          blob.generation + 1,
          blob.traits,
          childEnergy
        );
        births.push(child);

        this.events.push({
          id: `birth_${blob.id}_${child.id}`,
          type: 'birth',
          x: childX,
          y: 1.0,
          z: childZ,
          species: blob.species,
          message: `${blob.name} split into a new generation (${child.name})`,
        });
      }

      // Update position & boundary physics
      blob.x += blob.vx * dt;
      blob.z += blob.vz * dt;
      blob.stats.distanceTraveled += moveSpeed * dt;

      // Smooth orientation facing movement direction
      if (moveSpeed > 0.25) {
        const targetAngle = Math.atan2(blob.vx, blob.vz);
        let diff = targetAngle - blob.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        blob.angle += diff * Math.min(1.0, dt * 10);
      }

      // Tabletop circular boundary constraint
      const distFromCenter = Math.hypot(blob.x, blob.z);
      const maxR = this.config.worldRadius * 0.88;
      if (distFromCenter > maxR) {
        const angle = Math.atan2(blob.z, blob.x);
        blob.x = Math.cos(angle) * maxR;
        blob.z = Math.sin(angle) * maxR;
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

    // 1. Check for nearest Predator (Red blob)
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
      // FLEE FROM PREDATOR!
      blob.action = 'fleeing';
      blob.targetId = nearestPredator.id;
      const dx = blob.x - nearestPredator.x;
      const dz = blob.z - nearestPredator.z;
      const len = Math.hypot(dx, dz) || 1;
      const fleeForce = ((fleeDist - nearestPredatorDist) / fleeDist) * 2.8;
      steerX += (dx / len) * fleeForce * 20;
      steerZ += (dz / len) * fleeForce * 20;
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
          // Reached fruit! Enter cute eating state
          blob.action = 'eating';
          blob.actionTimer = this.config.blueEatingTime;
          blob.vx = 0;
          blob.vz = 0;
          return;
        } else {
          // Move towards fruit
          steerX += (dx / d) * 13;
          steerZ += (dz / d) * 13;
        }
      } else {
        // 3. Wander casually
        blob.action = 'wandering';
        blob.targetId = null;
        blob.targetPos = null;

        const wanderAngle = blob.angle + (Math.random() - 0.5) * 1.4;
        steerX += Math.sin(wanderAngle) * 5.5;
        steerZ += Math.cos(wanderAngle) * 5.5;
      }
    }

    // 4. Separation from other blue blobs (avoid crowding)
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
    blob.vx += steerX * dt * 4.8;
    blob.vz += steerZ * dt * 4.8;

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
        // GENTLE CONTACT INTERACTION!
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
        blob.energy = Math.min(blob.maxEnergy, blob.energy + energyTransferred * 0.92);

        this.events.push({
          id: `predation_${blob.id}_${nearestPrey.id}_${this.ticks}`,
          type: 'predation',
          x: (blob.x + nearestPrey.x) / 2,
          y: 1.2,
          z: (blob.z + nearestPrey.z) / 2,
          species: 'red',
          value: energyTransferred,
          message: `${blob.name} gently tagged ${nearestPrey.name}!`,
        });

        return;
      } else {
        // Pursue blue blob
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

    // Separation from other red predators to avoid excessive crowding
    let sepX = 0;
    let sepZ = 0;
    let sepCount = 0;
    for (const other of allBlobs) {
      if (other !== blob && other.species === 'red') {
        const d = Math.hypot(other.x - blob.x, other.z - blob.z);
        if (d < 5.2 && d > 0.01) {
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
    blob.vx += steerX * dt * 5.2;
    blob.vz += steerZ * dt * 5.2;

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
    const fruitCount = this.config.fruitPerTree;
    const fruits: FruitSlot[] = [];
    const foliageR = 3.0 + Math.random() * 0.7;

    for (let f = 0; f < fruitCount; f++) {
      const fruitAngle = (f / fruitCount) * Math.PI * 2 + Math.random() * 0.35;
      const fruitDist = foliageR * (0.68 + Math.random() * 0.22);
      const fruitH = 2.4 + Math.random() * 1.2;

      fruits.push({
        id: `tree_${this.trees.length}_fruit_${f}`,
        localX: Math.cos(fruitAngle) * fruitDist,
        localY: fruitH,
        localZ: Math.sin(fruitAngle) * fruitDist,
        isRipe: true,
        growthProgress: 1.0,
      });
    }

    const tree: FruitTree = {
      id: `tree_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x,
      z,
      scale: 1.0 + Math.random() * 0.2,
      foliageRadius: foliageR,
      fruits,
      jiggle: 0.5,
    };

    this.trees.push(tree);
    this.events.push({
      id: `plant_${tree.id}`,
      type: 'plant_tree',
      x,
      y: 0,
      z,
      message: 'New fruit tree planted!',
    });
  }

  public dropFruitSnackAt(x: number, z: number) {
    // Find nearest blue blob to snack or spawn a small wild fruit tree
    let nearestBlue: BlobEntity | null = null;
    let nearestDist = Infinity;

    for (const b of this.blobs.values()) {
      if (b.species === 'blue') {
        const d = Math.hypot(b.x - x, b.z - z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestBlue = b;
        }
      }
    }

    if (nearestBlue && nearestDist < 12) {
      nearestBlue.energy = Math.min(nearestBlue.maxEnergy, nearestBlue.energy + this.config.fruitEnergyValue);
      nearestBlue.action = 'eating';
      nearestBlue.actionTimer = 0.8;
      this.events.push({
        id: `snack_${nearestBlue.id}`,
        type: 'eat_fruit',
        x: nearestBlue.x,
        y: 1.5,
        z: nearestBlue.z,
        species: 'blue',
        value: this.config.fruitEnergyValue,
        message: `Fed sweet snack to ${nearestBlue.name}!`,
      });
    } else {
      this.plantTreeAt(x, z);
    }
  }

  public recordHistoryPoint() {
    let ripeFruitCount = 0;
    let totalFruitCapacity = 0;
    for (const t of this.trees) {
      totalFruitCapacity += t.fruits.length;
      for (const f of t.fruits) {
        if (f.isRipe) ripeFruitCount++;
      }
    }

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

    const point: HistoryPoint = {
      time: Math.round(this.time * 10) / 10,
      fruitCount: ripeFruitCount,
      fruitCapacity: totalFruitCapacity,
      blueCount,
      redCount,
      avgBlueEnergy: blueCount > 0 ? Math.round(blueEnergySum / blueCount) : 0,
      avgRedEnergy: redCount > 0 ? Math.round(redEnergySum / redCount) : 0,
      avgBlueSpeed: blueCount > 0 ? Math.round((blueSpeedSum / blueCount) * 100) / 100 : 1,
      avgRedSpeed: redCount > 0 ? Math.round((redSpeedSum / redCount) * 100) / 100 : 1,
      avgBlueVision: blueCount > 0 ? Math.round((blueVisionSum / blueCount) * 100) / 100 : 1,
      avgRedVision: redCount > 0 ? Math.round((redVisionSum / redCount) * 100) / 100 : 1,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
    };

    this.history.push(point);
    if (this.history.length > this.MAX_HISTORY_POINTS) {
      this.history.shift();
    }
  }

  public getStats() {
    let ripeFruitCount = 0;
    let totalFruitCapacity = 0;
    for (const t of this.trees) {
      totalFruitCapacity += t.fruits.length;
      for (const f of t.fruits) {
        if (f.isRipe) ripeFruitCount++;
      }
    }

    let blueCount = 0;
    let redCount = 0;
    for (const b of this.blobs.values()) {
      if (b.species === 'blue') blueCount++;
      else redCount++;
    }

    return {
      fruitCount: ripeFruitCount,
      fruitCapacity: totalFruitCapacity,
      blueCount,
      redCount,
      time: this.time,
      ticks: this.ticks,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      blueBirths: this.blueBirths,
      redBirths: this.redBirths,
      blueDeaths: this.blueDeaths,
      redDeaths: this.redDeaths,
      cycleCount: Math.floor(this.time / 18),
      gardenStatus: this.getGardenStatus(blueCount, redCount, ripeFruitCount),
    };
  }

  private getGardenStatus(blue: number, red: number, fruit: number): string {
    if (blue === 0 && red === 0) return 'Silent Garden';
    if (blue === 0) return 'Prey Extinct';
    if (red === 0) return 'Predator-Free';
    if (fruit < 10) return 'Resource Scarcity';
    if (red > 25) return 'Predator Surge';
    if (blue > 40) return 'Prey Bloom';
    return 'Dynamic Balance';
  }
}
