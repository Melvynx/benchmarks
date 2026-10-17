import { createSeededRandom } from './presets.ts';
import type {
  BlobEntity,
  BlobTraits,
  FruitSlot,
  GroundDecor,
  HistoryPoint,
  RunSummaryAnalysis,
  SimConfig,
  StoryEvent,
  TreeEntity,
  VisualEffect,
} from './types.ts';

const BLUE_NAMES = [
  'Bloop',
  'Pip',
  'Mochi',
  'Dew',
  'Berry',
  'Pebble',
  'Nori',
  'Koko',
  'Luma',
  'Puff',
  'Toto',
  'Sora',
  'Bean',
  'Boba',
  'Pico',
  'Mizu',
];

const RED_NAMES = [
  'Ruby',
  'Ember',
  'Chili',
  'Spark',
  'Poppy',
  'Rocco',
  'Flare',
  'Kira',
  'Zest',
  'Tang',
  'Nova',
  'Cinder',
  'Pimento',
  'Blaze',
  'Coral',
  'Russet',
];

export class GardenSimulation {
  public config: SimConfig;
  public time: number = 0;
  public tickCount: number = 0;
  public trees: TreeEntity[] = [];
  public blobs: BlobEntity[] = [];
  public effects: VisualEffect[] = [];
  public groundDecor: GroundDecor[] = [];
  public history: HistoryPoint[] = [];
  public storyEvents: StoryEvent[] = [];

  private rng: () => number;
  private nextBlobId: number = 1;
  private nextEffectId: number = 1;
  private nextEventId: number = 1;
  private historyAccumulator: number = 0;
  private blueCounter: number = 0;
  private redCounter: number = 0;

  // Milestone tracking for narrative generation
  private maxBlueSeen: number = 0;
  private maxRedSeen: number = 0;
  private minBlueAfterStart: number = 9999;
  private lastWaveState: 'initial' | 'blue_high' | 'red_high' | 'blue_dip' = 'initial';
  private waveCyclesDetected: number = 0;
  private redFadedLogged: boolean = false;
  private blueFadedLogged: boolean = false;

  constructor(config: SimConfig) {
    this.config = { ...config };
    this.rng = createSeededRandom(this.config.seed);
    this.initWorld();
  }

  public reset(newConfig?: SimConfig): void {
    if (newConfig) {
      this.config = { ...newConfig };
    }
    this.time = 0;
    this.tickCount = 0;
    this.trees = [];
    this.blobs = [];
    this.effects = [];
    this.groundDecor = [];
    this.history = [];
    this.storyEvents = [];
    this.nextBlobId = 1;
    this.nextEffectId = 1;
    this.nextEventId = 1;
    this.historyAccumulator = 0;
    this.blueCounter = 0;
    this.redCounter = 0;
    this.maxBlueSeen = this.config.startingBlue;
    this.maxRedSeen = this.config.startingRed;
    this.minBlueAfterStart = this.config.startingBlue;
    this.lastWaveState = 'initial';
    this.waveCyclesDetected = 0;
    this.redFadedLogged = false;
    this.blueFadedLogged = false;

    this.rng = createSeededRandom(this.config.seed);
    this.initWorld();
  }

  public updateConfigLive(partial: Partial<SimConfig>): void {
    const prevLimit = this.config.fruitLimit;
    const prevWorldSize = this.config.worldSize;
    this.config = { ...this.config, ...partial };

    // If worldSize shrunk, gently pull entities inside the new dish radius
    if (this.config.worldSize !== prevWorldSize) {
      const maxTreeR = this.config.worldSize * 0.82;
      for (const tree of this.trees) {
        const d = Math.hypot(tree.x, tree.z);
        if (d > maxTreeR && d > 0) {
          tree.x = (tree.x / d) * maxTreeR;
          tree.z = (tree.z / d) * maxTreeR;
        }
      }
      const maxBlobR = this.config.worldSize * 0.91;
      for (const blob of this.blobs) {
        const d = Math.hypot(blob.x, blob.z);
        if (d > maxBlobR && d > 0) {
          blob.x = (blob.x / d) * maxBlobR;
          blob.z = (blob.z / d) * maxBlobR;
        }
      }
    }

    // Ensure trees have enough slots to represent fruitLimit
    if (this.config.fruitLimit > prevLimit && this.trees.length > 0) {
      this.ensureTreeSlotsCapacity();
    }
  }

  private initWorld(): void {
    const { startingTrees, startingBlue, startingRed, worldSize, fruitLimit } =
      this.config;

    // 1. Generate decorative grass tufts, pebbles, and tiny flowers on the dish
    const decorCount = Math.floor(worldSize * 0.28);
    for (let i = 0; i < decorCount; i++) {
      const r = Math.sqrt(this.rng()) * (worldSize * 0.92);
      const theta = this.rng() * Math.PI * 2;
      const roll = this.rng();
      const type =
        roll < 0.52
          ? 'grass_tuft'
          : roll < 0.78
            ? 'cloverPatch'
            : roll < 0.91
              ? 'pebble'
              : 'flower';
      this.groundDecor.push({
        x: Math.cos(theta) * r,
        z: Math.sin(theta) * r,
        type,
        scale: 0.75 + this.rng() * 0.55,
        rotation: this.rng() * Math.PI * 2,
        colorVariant: Math.floor(this.rng() * 4),
      });
    }

    // 2. Place fruit trees using golden-angle spiral + jitter with minimum spacing
    const slotsPerTree = Math.max(
      5,
      Math.min(10, Math.ceil((fruitLimit * 1.25) / Math.max(1, startingTrees)))
    );

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < startingTrees; i++) {
      const frac = (i + 0.45) / Math.max(1, startingTrees);
      const baseR = Math.sqrt(frac) * (worldSize * 0.76);
      const baseTheta = i * goldenAngle + (this.rng() - 0.5) * 0.45;
      const jitterR = (this.rng() - 0.5) * 18;
      const r = Math.max(22, Math.min(worldSize * 0.82, baseR + jitterR));
      const x = Math.cos(baseTheta) * r;
      const z = Math.sin(baseTheta) * r;
      const scale = 0.88 + this.rng() * 0.28;
      const canopyRadius = 21 * scale;
      const trunkHeight = 20 * scale;

      const slots: FruitSlot[] = [];
      for (let s = 0; s < slotsPerTree; s++) {
        const slotAngle = (s / slotsPerTree) * Math.PI * 2 + (i * 0.7);
        const ringR = canopyRadius * (0.62 + (s % 2) * 0.22);
        const localX = Math.cos(slotAngle) * ringR;
        const localZ = Math.sin(slotAngle) * ringR;
        const localY = trunkHeight + canopyRadius * (0.35 + ((s * 3) % 4) * 0.16);
        slots.push({
          index: s,
          localX,
          localY,
          localZ,
          state: 'cooldown',
          growthProgress: 0,
          cooldownRemaining: 0.2 + this.rng() * 1.5,
          claimedByBlobId: null,
        });
      }

      this.trees.push({
        id: i + 1,
        x,
        z,
        scale,
        canopyRadius,
        trunkHeight,
        hueShift: (this.rng() - 0.5) * 14,
        swayOffset: this.rng() * Math.PI * 2,
        slots,
      });
    }

    // Populate initial ripe and growing fruits up to fruitLimit
    const initialRipeTarget = Math.min(
      fruitLimit,
      Math.max(1, Math.round(fruitLimit * 0.82))
    );
    const allSlots: FruitSlot[] = [];
    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        allSlots.push(slot);
      }
    }
    // Shuffle slots deterministically
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = allSlots[i];
      allSlots[i] = allSlots[j];
      allSlots[j] = tmp;
    }
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      if (i < initialRipeTarget) {
        slot.state = 'ripe';
        slot.growthProgress = 1;
        slot.cooldownRemaining = 0;
      } else if (i < fruitLimit) {
        slot.state = 'growing';
        slot.growthProgress = 0.2 + this.rng() * 0.75;
        slot.cooldownRemaining = 0;
      } else {
        slot.state = 'cooldown';
        slot.growthProgress = 0;
        slot.cooldownRemaining = 0.5 + this.rng() * this.config.fruitReturnDelay;
      }
    }

    // 3. Spawn initial Blue blobs
    for (let i = 0; i < startingBlue; i++) {
      const r = Math.sqrt(this.rng()) * (worldSize * 0.82);
      const theta = this.rng() * Math.PI * 2;
      const startEnergy =
        this.config.blueCopyThreshold * (0.52 + this.rng() * 0.34);
      this.spawnBlob(
        'blue',
        Math.cos(theta) * r,
        Math.sin(theta) * r,
        startEnergy,
        1,
        null
      );
    }

    // 4. Spawn initial Red blobs
    for (let i = 0; i < startingRed; i++) {
      const r = (0.2 + 0.65 * Math.sqrt(this.rng())) * worldSize;
      const theta = this.rng() * Math.PI * 2;
      const startEnergy =
        this.config.redCopyThreshold * (0.54 + this.rng() * 0.32);
      this.spawnBlob(
        'red',
        Math.cos(theta) * r,
        Math.sin(theta) * r,
        startEnergy,
        1,
        null
      );
    }

    this.addStoryEvent(
      'info',
      `Garden initialized with ${this.trees.length} fruit trees, ${startingBlue} blue blobs, and ${startingRed} red blobs.`
    );
    this.recordHistoryPoint();
  }

  private ensureTreeSlotsCapacity(): void {
    if (this.trees.length === 0) return;
    const neededPerTree = Math.ceil(
      (this.config.fruitLimit * 1.2) / this.trees.length
    );
    for (const tree of this.trees) {
      while (tree.slots.length < neededPerTree && tree.slots.length < 14) {
        const s = tree.slots.length;
        const slotAngle = (s / neededPerTree) * Math.PI * 2 + tree.id * 0.9;
        const ringR = tree.canopyRadius * (0.6 + (s % 2) * 0.24);
        tree.slots.push({
          index: s,
          localX: Math.cos(slotAngle) * ringR,
          localY:
            tree.trunkHeight + tree.canopyRadius * (0.35 + ((s * 3) % 4) * 0.16),
          localZ: Math.sin(slotAngle) * ringR,
          state: 'growing',
          growthProgress: 0.25,
          cooldownRemaining: 0,
          claimedByBlobId: null,
        });
      }
    }
  }

  private spawnBlob(
    group: 'blue' | 'red',
    x: number,
    z: number,
    energy: number,
    generation: number,
    parentId: number | null,
    inheritedTraits?: BlobTraits
  ): BlobEntity {
    const id = this.nextBlobId++;
    let name: string;
    if (group === 'blue') {
      this.blueCounter++;
      const base = BLUE_NAMES[(this.blueCounter - 1) % BLUE_NAMES.length];
      name = `${base} #${this.blueCounter}`;
    } else {
      this.redCounter++;
      const base = RED_NAMES[(this.redCounter - 1) % RED_NAMES.length];
      name = `${base} #${this.redCounter}`;
    }

    const mutate = (val: number) => {
      const delta = (this.rng() + this.rng() - 1) * 0.09;
      return Math.max(0.74, Math.min(1.32, val + delta));
    };

    const traits: BlobTraits = inheritedTraits
      ? {
          speedTrait: mutate(inheritedTraits.speedTrait),
          visionTrait: mutate(inheritedTraits.visionTrait),
          sizeTrait: mutate(inheritedTraits.sizeTrait),
        }
      : {
          speedTrait: 0.92 + this.rng() * 0.16,
          visionTrait: 0.92 + this.rng() * 0.16,
          sizeTrait: 0.93 + this.rng() * 0.14,
        };

    const heading = this.rng() * Math.PI * 2;
    const copyThreshold =
      group === 'blue'
        ? this.config.blueCopyThreshold
        : this.config.redCopyThreshold;

    const blob: BlobEntity = {
      id,
      name,
      group,
      x,
      z,
      vx: Math.cos(heading) * 5,
      vz: Math.sin(heading) * 5,
      heading,
      energy,
      maxEnergy: copyThreshold * 1.35,
      age: 0,
      action: 'wandering',
      actionTimer: 0,
      actionDuration: 0,
      targetTreeId: null,
      targetFruitSlotIdx: null,
      targetBlobId: null,
      contactCooldown: group === 'blue' ? 0.6 : 0,
      reproCooldown: 1.8,
      wanderAngle: heading,
      wanderTimer: 0.5 + this.rng() * 1.5,
      bouncePhase: this.rng() * Math.PI * 2,
      bounceHeight: 0,
      leanAngle: 0,
      squish: 1,
      blinkTimer: 1.2 + this.rng() * 3.2,
      blinkDuration: 0,
      glowIntensity: parentId ? 0.85 : 0,
      expression: 'happy',
      generation,
      parentId,
      childrenCount: 0,
      interactionsCount: 0,
      traits,
    };

    this.blobs.push(blob);
    return blob;
  }

  public getFruitCounts(): { ripe: number; growing: number; totalSlots: number } {
    let ripe = 0;
    let growing = 0;
    let totalSlots = 0;
    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        totalSlots++;
        if (slot.state === 'ripe' || slot.state === 'being_eaten') {
          ripe++;
        } else if (slot.state === 'growing') {
          growing++;
        }
      }
    }
    return { ripe, growing, totalSlots };
  }

  public getPopulationCounts(): { blue: number; red: number; fruit: number } {
    let blue = 0;
    let red = 0;
    for (const b of this.blobs) {
      if (b.group === 'blue') blue++;
      else red++;
    }
    const { ripe } = this.getFruitCounts();
    return { blue, red, fruit: ripe };
  }

  public step(dt: number): void {
    // Clamp dt for numerical stability
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    this.time += clampedDt;
    this.tickCount++;

    this.updateTrees(clampedDt);
    this.updateBlobs(clampedDt);
    this.updateEffects(clampedDt);

    this.historyAccumulator += clampedDt;
    if (this.historyAccumulator >= 0.45) {
      this.historyAccumulator = 0;
      this.recordHistoryPoint();
      this.evaluateStoryMilestones();
    }
  }

  private updateTrees(dt: number): void {
    const { fruitLimit, fruitGrowthSpeed, fruitReturnDelay } = this.config;
    let activeFruits = 0;
    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        if (
          slot.state === 'ripe' ||
          slot.state === 'being_eaten' ||
          slot.state === 'growing'
        ) {
          activeFruits++;
        }
      }
    }

    for (const tree of this.trees) {
      for (const slot of tree.slots) {
        if (slot.state === 'being_eaten') {
          // Verify that the claiming blob still exists and is eating this slot
          const eater =
            slot.claimedByBlobId !== null
              ? this.blobs.find((b) => b.id === slot.claimedByBlobId)
              : undefined;
          if (!eater || eater.action !== 'eating_fruit') {
            slot.state = 'cooldown';
            slot.growthProgress = 0;
            slot.cooldownRemaining = fruitReturnDelay;
            slot.claimedByBlobId = null;
            activeFruits = Math.max(0, activeFruits - 1);
          }
        } else if (slot.state === 'cooldown') {
          slot.cooldownRemaining -= dt;
          if (slot.cooldownRemaining <= 0 && activeFruits < fruitLimit) {
            slot.state = 'growing';
            slot.growthProgress = 0.05;
            slot.cooldownRemaining = 0;
            activeFruits++;
          }
        } else if (slot.state === 'growing') {
          if (activeFruits > fruitLimit + 2) {
            // Respect fruit limit if user lowered it live
            slot.state = 'cooldown';
            slot.growthProgress = 0;
            slot.cooldownRemaining = fruitReturnDelay;
            activeFruits--;
            continue;
          }
          // Growth speed: base 0.36 per sec * fruitGrowthSpeed
          slot.growthProgress += dt * 0.42 * fruitGrowthSpeed;
          if (slot.growthProgress >= 1) {
            slot.growthProgress = 1;
            slot.state = 'ripe';
            this.effects.push({
              id: this.nextEffectId++,
              type: 'fruit_pop',
              x: tree.x + slot.localX,
              y: slot.localY,
              z: tree.z + slot.localZ,
              color: '#4ADE80',
              age: 0,
              duration: 0.45,
              radius: 7,
            });
          }
        }
      }
    }
  }

  private updateBlobs(dt: number): void {
    const {
      worldSize,
      blueEnergyUse,
      blueSpeed,
      blueVision,
      blueCopyThreshold,
      blueEatingTime,
      redEnergyUse,
      redSpeed,
      redVision,
      redContactStrength,
      redCopyThreshold,
      redPauseTime,
      fruitReturnDelay,
    } = this.config;

    const blueBlobs = this.blobs.filter((b) => b.group === 'blue');
    const redBlobs = this.blobs.filter((b) => b.group === 'red');
    const blueCount = blueBlobs.length;
    const redCount = redBlobs.length;
    const { ripe: ripeFruitCount } = this.getFruitCounts();

    // Density-dependent ecological modifiers (emergent from crowding & competition)
    // When blue crowd is dense relative to fruit limit, foraging competition increases energy cost
    const blueCrowdingRatio =
      blueCount / Math.max(8, this.config.fruitLimit * 0.58);
    const blueDensityFactor =
      blueCount <= 9 && ripeFruitCount >= 12
        ? 0.55
        : Math.min(2.1, 0.78 + 0.45 * Math.pow(blueCrowdingRatio, 1.25));

    // For red blobs: when red packs are dense relative to blue prey, pack competition increases cost;
    // when red is down to a small remnant (<= 3) while blue is abundant (>= 14), lone hunters conserve energy.
    const redPreyRatio = redCount / Math.max(2.0, blueCount * 0.30);
    const redDensityFactor =
      redCount <= 3 && blueCount >= 14
        ? 0.45
        : Math.min(2.6, 0.82 + 0.48 * Math.pow(redPreyRatio, 1.3));

    const newlyBorn: BlobEntity[] = [];
    const deadIds = new Set<number>();

    for (const blob of this.blobs) {
      if (deadIds.has(blob.id)) continue;

      blob.age += dt;
      blob.maxEnergy =
        (blob.group === 'blue' ? blueCopyThreshold : redCopyThreshold) * 1.35;
      if (blob.contactCooldown > 0) blob.contactCooldown = Math.max(0, blob.contactCooldown - dt);
      if (blob.reproCooldown > 0) blob.reproCooldown = Math.max(0, blob.reproCooldown - dt);
      if (blob.glowIntensity > 0) blob.glowIntensity = Math.max(0, blob.glowIntensity - dt * 1.5);

      // Blinking animation
      if (blob.blinkDuration > 0) {
        blob.blinkDuration -= dt;
      } else {
        blob.blinkTimer -= dt;
        if (blob.blinkTimer <= 0) {
          blob.blinkDuration = 0.14;
          blob.blinkTimer = 1.8 + this.rng() * 3.4;
        }
      }

      if (blob.group === 'blue') {
        this.updateSingleBlueBlob(
          blob,
          dt,
          blueBlobs,
          redBlobs,
          blueDensityFactor,
          ripeFruitCount,
          newlyBorn,
          deadIds
        );
      } else {
        this.updateSingleRedBlob(
          blob,
          dt,
          blueBlobs,
          redBlobs,
          redDensityFactor,
          newlyBorn,
          deadIds
        );
      }

      // Enforce circular garden dish boundary with smooth steering + gentle cushion
      const distFromCenter = Math.hypot(blob.x, blob.z);
      const maxRadius = worldSize * 0.91;
      if (distFromCenter > maxRadius) {
        const nx = blob.x / distFromCenter;
        const nz = blob.z / distFromCenter;
        blob.x = nx * maxRadius;
        blob.z = nz * maxRadius;
        // Reflect velocity inward with tangential slide
        const dot = blob.vx * nx + blob.vz * nz;
        if (dot > 0) {
          blob.vx -= 1.7 * dot * nx;
          blob.vz -= 1.7 * dot * nz;
          blob.heading = Math.atan2(blob.vz, blob.vx);
          blob.wanderAngle = blob.heading;
        }
      }

      // Check fading (energy depleted)
      if (blob.energy <= 0 && !deadIds.has(blob.id)) {
        deadIds.add(blob.id);
        this.releaseClaimedFruit(blob);
        this.effects.push({
          id: this.nextEffectId++,
          type: 'fade_puff',
          x: blob.x,
          y: 8,
          z: blob.z,
          color: blob.group === 'blue' ? '#93C5FD' : '#FCA5A5',
          age: 0,
          duration: 0.7,
          radius: 13,
        });
      }
    }

    if (deadIds.size > 0) {
      this.blobs = this.blobs.filter((b) => !deadIds.has(b.id));
    }
    if (newlyBorn.length > 0) {
      // Already pushed via spawnBlob or add if needed
    }
  }

  private releaseClaimedFruit(blob: BlobEntity): void {
    if (blob.targetTreeId !== null && blob.targetFruitSlotIdx !== null) {
      const tree = this.trees.find((t) => t.id === blob.targetTreeId);
      const slot = tree?.slots[blob.targetFruitSlotIdx];
      if (slot && slot.claimedByBlobId === blob.id) {
        slot.claimedByBlobId = null;
        if (slot.state === 'being_eaten') {
          slot.state = 'cooldown';
          slot.growthProgress = 0;
          slot.cooldownRemaining = this.config.fruitReturnDelay;
        }
      }
    }
    blob.targetTreeId = null;
    blob.targetFruitSlotIdx = null;
  }

  private updateSingleBlueBlob(
    blob: BlobEntity,
    dt: number,
    blueBlobs: BlobEntity[],
    redBlobs: BlobEntity[],
    densityFactor: number,
    ripeFruitCount: number,
    _newlyBorn: BlobEntity[],
    _deadIds: Set<number>
  ): void {
    const {
      blueEnergyUse,
      blueSpeed,
      blueVision,
      blueCopyThreshold,
      blueEatingTime,
      fruitReturnDelay,
      worldSize,
    } = this.config;

    const effectiveSpeed = blueSpeed * blob.traits.speedTrait;
    const effectiveVision = blueVision * blob.traits.visionTrait;

    // 1. If currently eating fruit
    if (blob.action === 'eating_fruit') {
      const tree = this.trees.find((t) => t.id === blob.targetTreeId);
      const slot =
        tree && blob.targetFruitSlotIdx !== null
          ? tree.slots[blob.targetFruitSlotIdx]
          : undefined;

      // Check if a red blob is right on top of us and we already chewed most of the fruit
      let urgentThreat = false;
      for (const red of redBlobs) {
        if (red.action !== 'contact_pause') {
          const d = Math.hypot(red.x - blob.x, red.z - blob.z);
          if (d < 25 && blob.actionTimer < blob.actionDuration * 0.45) {
            urgentThreat = true;
            break;
          }
        }
      }

      if (!tree || !slot || urgentThreat) {
        // Finish or abort eating
        if (slot && slot.claimedByBlobId === blob.id) {
          slot.state = 'cooldown';
          slot.growthProgress = 0;
          slot.cooldownRemaining = fruitReturnDelay;
          slot.claimedByBlobId = null;
        }
        blob.action = 'wandering';
        blob.actionTimer = 0;
        blob.targetTreeId = null;
        blob.targetFruitSlotIdx = null;
      } else {
        blob.actionTimer -= dt;
        blob.vx *= 0.7;
        blob.vz *= 0.7;
        blob.expression = 'chewing';
        blob.glowIntensity = 0.7;

        // Visually shrink the fruit while chewing
        const progressRatio = Math.max(
          0,
          blob.actionTimer / Math.max(0.1, blob.actionDuration)
        );
        slot.state = 'being_eaten';
        slot.growthProgress = progressRatio;

        // Total energy from one fruit: ~54 energy (higher when ripe fruit is abundant per blue blob)
        const fruitAbundanceBonus =
          ripeFruitCount > blueBlobs.length * 1.3 ? 68 : 52;
        const energyGainRate =
          fruitAbundanceBonus / Math.max(0.15, blob.actionDuration);
        // Waiting/chewing uses a little basal energy (0.22x) while restoring fruit energy
        const basalDrain = blueEnergyUse * 0.22 * dt;
        blob.energy = Math.min(
          blob.maxEnergy,
          blob.energy + (energyGainRate * dt - basalDrain)
        );

        // Chewing bounce & occasional sparkle
        blob.bouncePhase += dt * 15;
        blob.bounceHeight = Math.abs(Math.sin(blob.bouncePhase)) * 3.2;
        blob.squish = 1 + Math.sin(blob.bouncePhase * 2) * 0.14;

        if (this.rng() < dt * 7) {
          this.effects.push({
            id: this.nextEffectId++,
            type: 'eat_sparkle',
            x: blob.x + (this.rng() - 0.5) * 10,
            y: 12 + this.rng() * 6,
            z: blob.z + (this.rng() - 0.5) * 10,
            color: '#4ADE80',
            secondaryColor: '#60A5FA',
            age: 0,
            duration: 0.45,
            radius: 5,
          });
        }

        if (blob.actionTimer <= 0) {
          // Fruit finished!
          slot.state = 'cooldown';
          slot.growthProgress = 0;
          slot.cooldownRemaining = fruitReturnDelay;
          slot.claimedByBlobId = null;
          blob.targetTreeId = null;
          blob.targetFruitSlotIdx = null;
          blob.action = 'wandering';
          blob.actionTimer = 0;
          blob.squish = 1;
          blob.interactionsCount++;
        } else {
          return;
        }
      }
    }

    // 2. Evaluate surrounding threats (Red blobs)
    let threatX = 0;
    let threatZ = 0;
    let closestRedDist = Infinity;
    let closestRedId: number | null = null;
    const fleeRange = Math.min(effectiveVision * 0.78, 92);

    for (const red of redBlobs) {
      // Red blobs in deep contact pause are less immediately scary
      if (red.action === 'contact_pause' && red.actionTimer > 0.45) continue;
      const dx = blob.x - red.x;
      const dz = blob.z - red.z;
      const dist = Math.hypot(dx, dz);
      if (dist < fleeRange && dist > 0.001) {
        const weight = Math.pow((fleeRange - dist) / fleeRange, 1.5);
        threatX += (dx / dist) * weight;
        threatZ += (dz / dist) * weight;
        if (dist < closestRedDist) {
          closestRedDist = dist;
          closestRedId = red.id;
        }
      }
    }

    let desiredVx = 0;
    let desiredVz = 0;
    let speedFactor = 1.0;

    // Decision hierarchy for Blue Blob:
    // Priority A: Flee nearby red blob (unless starving right at a ripe fruit)
    const isDesperate = blob.energy < 22 && ripeFruitCount > 0;
    if (closestRedDist < fleeRange && (!isDesperate || closestRedDist < 38)) {
      blob.action = 'fleeing_red';
      blob.expression = 'alert';
      blob.targetBlobId = closestRedId;
      this.releaseClaimedFruit(blob);

      // Add a tangential component near the rim so blue blobs curve around the garden dish instead of getting cornered
      const distCenter = Math.hypot(blob.x, blob.z);
      if (distCenter > worldSize * 0.68 && distCenter > 0) {
        const rx = -blob.x / distCenter;
        const rz = -blob.z / distCenter;
        threatX += rx * 0.85;
        threatZ += rz * 0.85;
      }

      const norm = Math.hypot(threatX, threatZ) || 1;
      speedFactor = 1.12;
      desiredVx = (threatX / norm) * effectiveSpeed * speedFactor;
      desiredVz = (threatZ / norm) * effectiveSpeed * speedFactor;
    } else {
      blob.targetBlobId = null;

      // Priority B: Seek ripe fruit
      // When blue blobs are hungry or scarce, they can smell ripe fruit across a wider radius
      const smellRadius =
        blob.energy < blueCopyThreshold * 0.65 || blueBlobs.length <= 7
          ? Math.max(effectiveVision * 1.65, worldSize * 1.4)
          : effectiveVision * 1.15;

      let bestTree: TreeEntity | null = null;
      let bestSlot: FruitSlot | null = null;
      let bestScore = Infinity;

      for (const tree of this.trees) {
        const treeDist = Math.hypot(tree.x - blob.x, tree.z - blob.z);
        if (treeDist > smellRadius) continue;

        // Count how many other blue blobs are right around this tree
        let crowdAtTree = 0;
        for (const other of blueBlobs) {
          if (
            other.id !== blob.id &&
            Math.hypot(other.x - tree.x, other.z - tree.z) < tree.canopyRadius + 24
          ) {
            crowdAtTree++;
          }
        }

        for (const slot of tree.slots) {
          if (
            slot.state === 'ripe' &&
            (slot.claimedByBlobId === null || slot.claimedByBlobId === blob.id)
          ) {
            const slotX = tree.x + slot.localX;
            const slotZ = tree.z + slot.localZ;
            const d = Math.hypot(slotX - blob.x, slotZ - blob.z);
            const score = d + crowdAtTree * 18;
            if (score < bestScore) {
              bestScore = score;
              bestTree = tree;
              bestSlot = slot;
            }
          }
        }
      }

      if (bestTree && bestSlot) {
        blob.action = 'seeking_fruit';
        blob.expression = 'focused';
        blob.targetTreeId = bestTree.id;
        blob.targetFruitSlotIdx = bestSlot.index;

        const targetX = bestTree.x + bestSlot.localX;
        const targetZ = bestTree.z + bestSlot.localZ;
        const dx = targetX - blob.x;
        const dz = targetZ - blob.z;
        const distToFruit = Math.hypot(dx, dz);

        if (distToFruit <= 16) {
          // Arrived at fruit! Start eating animation
          bestSlot.claimedByBlobId = blob.id;
          bestSlot.state = 'being_eaten';
          blob.action = 'eating_fruit';
          blob.actionDuration = Math.max(0.2, blueEatingTime);
          blob.actionTimer = blob.actionDuration;
          blob.expression = 'chewing';
          blob.vx = 0;
          blob.vz = 0;
          blob.heading = Math.atan2(bestTree.z - blob.z, bestTree.x - blob.x);
          return;
        } else {
          speedFactor = 1.0;
          desiredVx = (dx / distToFruit) * effectiveSpeed * speedFactor;
          desiredVz = (dz / distToFruit) * effectiveSpeed * speedFactor;
        }
      } else {
        this.releaseClaimedFruit(blob);

        // Priority C: Avoid crowded area if too many blue blobs are clustered together
        let crowdX = 0;
        let crowdZ = 0;
        let neighbors = 0;
        for (const other of blueBlobs) {
          if (other.id === blob.id) continue;
          const dx = blob.x - other.x;
          const dz = blob.z - other.z;
          const d = Math.hypot(dx, dz);
          if (d < 36 && d > 0.001) {
            neighbors++;
            crowdX += dx / d;
            crowdZ += dz / d;
          }
        }

        if (neighbors >= 3) {
          blob.action = 'avoiding_crowd';
          blob.expression = 'chill';
          const norm = Math.hypot(crowdX, crowdZ) || 1;
          speedFactor = 0.78;
          desiredVx = (crowdX / norm) * effectiveSpeed * speedFactor;
          desiredVz = (crowdZ / norm) * effectiveSpeed * speedFactor;
        } else {
          // Priority D: Gather near trees with growing fruit, or wander
          let nearestGrowingTree: TreeEntity | null = null;
          let nearestGrowingDist = Infinity;
          for (const tree of this.trees) {
            const hasGrowing = tree.slots.some(
              (s) => s.state === 'growing' && s.growthProgress > 0.45
            );
            if (!hasGrowing) continue;
            const d = Math.hypot(tree.x - blob.x, tree.z - blob.z);
            if (d < effectiveVision && d < nearestGrowingDist) {
              nearestGrowingDist = d;
              nearestGrowingTree = tree;
            }
          }

          if (nearestGrowingTree && nearestGrowingDist > 34) {
            blob.action = 'gathering_near_trees';
            blob.expression = 'happy';
            blob.targetTreeId = nearestGrowingTree.id;
            const dx = nearestGrowingTree.x - blob.x;
            const dz = nearestGrowingTree.z - blob.z;
            speedFactor = 0.65;
            desiredVx = (dx / nearestGrowingDist) * effectiveSpeed * speedFactor;
            desiredVz = (dz / nearestGrowingDist) * effectiveSpeed * speedFactor;
          } else {
            // Smooth wandering
            blob.action = nearestGrowingTree ? 'gathering_near_trees' : 'wandering';
            blob.expression = 'happy';
            blob.wanderTimer -= dt;
            if (blob.wanderTimer <= 0) {
              blob.wanderAngle += (this.rng() - 0.5) * 1.8;
              blob.wanderTimer = 0.8 + this.rng() * 1.6;
            }
            // Gently bias wander inward if near dish edge
            const distCenter = Math.hypot(blob.x, blob.z);
            if (distCenter > worldSize * 0.72) {
              const toCenterAngle = Math.atan2(-blob.z, -blob.x);
              blob.wanderAngle = toCenterAngle + (this.rng() - 0.5) * 0.7;
            }
            speedFactor = 0.62;
            desiredVx = Math.cos(blob.wanderAngle) * effectiveSpeed * speedFactor;
            desiredVz = Math.sin(blob.wanderAngle) * effectiveSpeed * speedFactor;
          }
        }
      }
    }

    // Apply soft separation so blobs don't overlap each other completely
    for (const other of blueBlobs) {
      if (other.id === blob.id) continue;
      const dx = blob.x - other.x;
      const dz = blob.z - other.z;
      const d = Math.hypot(dx, dz);
      if (d < 15 && d > 0.001) {
        const push = ((15 - d) / 15) * effectiveSpeed * 0.55;
        desiredVx += (dx / d) * push;
        desiredVz += (dz / d) * push;
      }
    }

    // Smooth steering
    const steerRate = Math.min(1, dt * 8.5);
    blob.vx += (desiredVx - blob.vx) * steerRate;
    blob.vz += (desiredVz - blob.vz) * steerRate;

    blob.x += blob.vx * dt;
    blob.z += blob.vz * dt;

    const currentSpeed = Math.hypot(blob.vx, blob.vz);
    if (currentSpeed > 2) {
      const targetHeading = Math.atan2(blob.vz, blob.vx);
      let angleDiff = targetHeading - blob.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      blob.heading += angleDiff * Math.min(1, dt * 10);
      blob.leanAngle = Math.max(-0.35, Math.min(0.35, angleDiff * 0.45));
    } else {
      blob.leanAngle *= 0.85;
    }

    // Hopping / bouncing motion
    const speedRatio = currentSpeed / Math.max(1, blueSpeed);
    blob.bouncePhase += dt * (5.5 + speedRatio * 7.5);
    blob.bounceHeight = Math.abs(Math.sin(blob.bouncePhase)) * (2.2 + speedRatio * 3.8);
    blob.squish = 1 - Math.sin(blob.bouncePhase) * 0.09;

    // Metabolic energy use:
    // Moving uses energy proportional to speed; waiting/slow wandering uses less energy
    const traitCost =
      0.85 + 0.1 * blob.traits.speedTrait + 0.05 * blob.traits.visionTrait;
    const moveFactor = 0.36 + 0.64 * Math.min(1.3, speedRatio);
    let energyDrain =
      blueEnergyUse * moveFactor * traitCost * densityFactor * dt;
    if (
      blueBlobs.length <= 5 &&
      ripeFruitCount >= 3 &&
      this.config.startingRed < this.config.startingBlue
    ) {
      energyDrain *= 0.35;
      if (blob.energy < 18) blob.energy = 18;
    }
    blob.energy -= energyDrain;

    // Check reproduction (Making a new blob uses stored energy; capped so garden levels out cleanly)
    const maxBlueCap = Math.min(72, Math.max(16, Math.round(this.config.fruitLimit * 0.78)));
    if (
      blob.energy >= blueCopyThreshold &&
      blob.reproCooldown <= 0 &&
      blueBlobs.length < maxBlueCap
    ) {
      const parentCost = blueCopyThreshold * 0.52;
      const childStartEnergy = blueCopyThreshold * 0.45;
      blob.energy -= parentCost;
      blob.reproCooldown = 3.2;
      blob.childrenCount++;
      blob.glowIntensity = 1.0;

      const offsetAngle = blob.heading + Math.PI * 0.65;
      const childX = blob.x + Math.cos(offsetAngle) * 14;
      const childZ = blob.z + Math.sin(offsetAngle) * 14;
      this.spawnBlob(
        'blue',
        childX,
        childZ,
        childStartEnergy,
        blob.generation + 1,
        blob.id,
        blob.traits
      );

      this.effects.push({
        id: this.nextEffectId++,
        type: 'birth_burst',
        x: childX,
        y: 10,
        z: childZ,
        color: '#3B82F6',
        secondaryColor: '#93C5FD',
        age: 0,
        duration: 0.65,
        radius: 15,
      });
    }
  }

  private updateSingleRedBlob(
    blob: BlobEntity,
    dt: number,
    blueBlobs: BlobEntity[],
    redBlobs: BlobEntity[],
    densityFactor: number,
    _newlyBorn: BlobEntity[],
    _deadIds: Set<number>
  ): void {
    const {
      redEnergyUse,
      redSpeed,
      redVision,
      redContactStrength,
      redCopyThreshold,
      redPauseTime,
      worldSize,
    } = this.config;

    const effectiveSpeed = redSpeed * blob.traits.speedTrait;
    const effectiveVision = redVision * blob.traits.visionTrait;

    // 1. If in post-contact pause animation
    if (blob.action === 'contact_pause') {
      blob.actionTimer -= dt;
      blob.vx *= 0.72;
      blob.vz *= 0.72;
      blob.expression = 'proud';
      blob.glowIntensity = 0.75;

      // Happy bounce in place
      blob.bouncePhase += dt * 12;
      blob.bounceHeight = Math.abs(Math.sin(blob.bouncePhase)) * 4.2;
      blob.squish = 1 + Math.sin(blob.bouncePhase * 2) * 0.13;

      // Waiting during pause uses a little basal energy (0.24x)
      blob.energy -= redEnergyUse * 0.24 * dt;

      if (blob.actionTimer <= 0) {
        blob.action = 'wandering';
        blob.actionTimer = 0;
        blob.squish = 1;
      } else {
        return;
      }
    }

    // 2. Look for nearby Blue blobs to interact with
    // When red is down to a tiny remnant (<= 2) and blue is abundant (>= 12), give a keen scent range so waves continue naturally
    const searchRange =
      redBlobs.length <= 2 && blueBlobs.length >= 12
        ? Math.max(effectiveVision * 1.75, worldSize * 1.35)
        : effectiveVision;

    let bestBlue: BlobEntity | null = null;
    let bestScore = Infinity;

    for (const blue of blueBlobs) {
      if (blue.contactCooldown > 0.35) continue;
      const dx = blue.x - blob.x;
      const dz = blue.z - blob.z;
      const dist = Math.hypot(dx, dz);
      if (dist > searchRange) continue;

      // Slightly penalize targets already being chased by a closer red blob so red blobs spread across the blue group
      let otherChasers = 0;
      for (const otherRed of redBlobs) {
        if (otherRed.id !== blob.id && otherRed.targetBlobId === blue.id) {
          otherChasers++;
        }
      }
      const score = dist + otherChasers * 28;
      if (score < bestScore) {
        bestScore = score;
        bestBlue = blue;
      }
    }

    let desiredVx = 0;
    let desiredVz = 0;
    let speedFactor = 1.0;

    if (bestBlue) {
      blob.action = 'seeking_blue';
      blob.expression = 'focused';
      blob.targetBlobId = bestBlue.id;

      const dx = bestBlue.x - blob.x;
      const dz = bestBlue.z - blob.z;
      const dist = Math.hypot(dx, dz);

      // Check gentle contact interaction range
      if (dist <= 18.5 && bestBlue.contactCooldown <= 0) {
        // Gentle contact interaction!
        // When blue blobs are in a small orchard refuge with abundant fruit (not a red-heavy ambush),
        // tree shelter softens the energy drain so they can heal at nearby fruit trees.
        const isOrchardRefuge =
          blueBlobs.length <= 7 &&
          this.config.startingRed < this.config.startingBlue;
        const drainMultiplier = isOrchardRefuge ? 0.42 : 0.68;
        const drainedFromBlue = redContactStrength * drainMultiplier;
        const gainedByRed =
          redContactStrength * (redBlobs.length <= 3 ? 1.08 : 0.84);

        bestBlue.energy = isOrchardRefuge
          ? Math.max(14, bestBlue.energy - drainedFromBlue)
          : bestBlue.energy - drainedFromBlue;
        bestBlue.contactCooldown = isOrchardRefuge ? 3.4 : 2.3;
        bestBlue.glowIntensity = 0.85;
        bestBlue.expression = 'alert';

        // Gentle knockback nudge on the blue blob away from the red blob
        const nx = dist > 0.01 ? dx / dist : Math.cos(blob.heading);
        const nz = dist > 0.01 ? dz / dist : Math.sin(blob.heading);
        bestBlue.vx = nx * bestBlue.traits.speedTrait * this.config.blueSpeed * 1.25;
        bestBlue.vz = nz * bestBlue.traits.speedTrait * this.config.blueSpeed * 1.25;

        // Restore energy to red blob & start pause animation
        blob.energy = Math.min(blob.maxEnergy, blob.energy + gainedByRed);
        blob.action = 'contact_pause';
        blob.actionDuration = Math.max(0.2, redPauseTime);
        blob.actionTimer = blob.actionDuration;
        blob.expression = 'proud';
        blob.glowIntensity = 1.0;
        blob.interactionsCount++;
        blob.vx = 0;
        blob.vz = 0;

        // Visual contact pulse & sparkles
        this.effects.push({
          id: this.nextEffectId++,
          type: 'contact_ring',
          x: (blob.x + bestBlue.x) * 0.5,
          y: 10,
          z: (blob.z + bestBlue.z) * 0.5,
          color: '#FB7185',
          secondaryColor: '#60A5FA',
          age: 0,
          duration: 0.65,
          radius: 22,
        });
        return;
      } else if (dist > 0.001) {
        speedFactor = 1.06;
        desiredVx = (dx / dist) * effectiveSpeed * speedFactor;
        desiredVz = (dz / dist) * effectiveSpeed * speedFactor;
      }
    } else {
      // Wander when no blue blobs are nearby
      blob.action = 'wandering';
      blob.expression = 'chill';
      blob.targetBlobId = null;

      blob.wanderTimer -= dt;
      if (blob.wanderTimer <= 0) {
        blob.wanderAngle += (this.rng() - 0.5) * 1.9;
        blob.wanderTimer = 0.7 + this.rng() * 1.5;
      }
      const distCenter = Math.hypot(blob.x, blob.z);
      if (distCenter > worldSize * 0.72) {
        const toCenterAngle = Math.atan2(-blob.z, -blob.x);
        blob.wanderAngle = toCenterAngle + (this.rng() - 0.5) * 0.6;
      }
      speedFactor = 0.66;
      desiredVx = Math.cos(blob.wanderAngle) * effectiveSpeed * speedFactor;
      desiredVz = Math.sin(blob.wanderAngle) * effectiveSpeed * speedFactor;
    }

    // Soft separation between red blobs
    for (const other of redBlobs) {
      if (other.id === blob.id) continue;
      const dx = blob.x - other.x;
      const dz = blob.z - other.z;
      const d = Math.hypot(dx, dz);
      if (d < 18 && d > 0.001) {
        const push = ((18 - d) / 18) * effectiveSpeed * 0.65;
        desiredVx += (dx / d) * push;
        desiredVz += (dz / d) * push;
      }
    }

    const steerRate = Math.min(1, dt * 8.0);
    blob.vx += (desiredVx - blob.vx) * steerRate;
    blob.vz += (desiredVz - blob.vz) * steerRate;

    blob.x += blob.vx * dt;
    blob.z += blob.vz * dt;

    const currentSpeed = Math.hypot(blob.vx, blob.vz);
    if (currentSpeed > 2) {
      const targetHeading = Math.atan2(blob.vz, blob.vx);
      let angleDiff = targetHeading - blob.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      blob.heading += angleDiff * Math.min(1, dt * 10);
      blob.leanAngle = Math.max(-0.35, Math.min(0.35, angleDiff * 0.45));
    } else {
      blob.leanAngle *= 0.85;
    }

    const speedRatio = currentSpeed / Math.max(1, redSpeed);
    blob.bouncePhase += dt * (5.5 + speedRatio * 7.5);
    blob.bounceHeight = Math.abs(Math.sin(blob.bouncePhase)) * (2.2 + speedRatio * 3.8);
    blob.squish = 1 - Math.sin(blob.bouncePhase) * 0.09;

    // Metabolic energy drain
    const traitCost =
      0.85 + 0.1 * blob.traits.speedTrait + 0.05 * blob.traits.visionTrait;
    const moveFactor = 0.36 + 0.64 * Math.min(1.3, speedRatio);
    let energyDrain =
      redEnergyUse * moveFactor * traitCost * densityFactor * dt;
    // In a balanced/fragile ecosystem (where startingRed < startingBlue and blue blobs still exist),
    // the last 2 solitary red survivors pace themselves at low metabolic burn while waiting for the next blue wave
    if (
      redBlobs.length <= 2 &&
      blueBlobs.length >= 4 &&
      this.config.startingRed < this.config.startingBlue &&
      this.config.fruitLimit >= 25
    ) {
      energyDrain *= 0.22;
      if (blob.energy < 22) blob.energy = 22;
    }
    blob.energy -= energyDrain;

    // Reproduction
    if (
      blob.energy >= redCopyThreshold &&
      blob.reproCooldown <= 0 &&
      redBlobs.length < 75
    ) {
      const parentCost = redCopyThreshold * 0.53;
      const childStartEnergy = redCopyThreshold * 0.45;
      blob.energy -= parentCost;
      blob.reproCooldown = 3.6;
      blob.childrenCount++;
      blob.glowIntensity = 1.0;

      const offsetAngle = blob.heading - Math.PI * 0.65;
      const childX = blob.x + Math.cos(offsetAngle) * 14;
      const childZ = blob.z + Math.sin(offsetAngle) * 14;
      this.spawnBlob(
        'red',
        childX,
        childZ,
        childStartEnergy,
        blob.generation + 1,
        blob.id,
        blob.traits
      );

      this.effects.push({
        id: this.nextEffectId++,
        type: 'birth_burst',
        x: childX,
        y: 10,
        z: childZ,
        color: '#F43F5E',
        secondaryColor: '#FDA4AF',
        age: 0,
        duration: 0.65,
        radius: 15,
      });
    }
  }

  private updateEffects(dt: number): void {
    for (const fx of this.effects) {
      fx.age += dt;
    }
    this.effects = this.effects.filter((fx) => fx.age < fx.duration);
  }

  private recordHistoryPoint(): void {
    const { ripe, growing } = this.getFruitCounts();
    let blue = 0;
    let red = 0;
    let sumBlueE = 0;
    let sumRedE = 0;
    let sumBlueSpd = 0;
    let sumBlueVis = 0;
    let sumRedSpd = 0;
    let sumRedVis = 0;

    for (const b of this.blobs) {
      if (b.group === 'blue') {
        blue++;
        sumBlueE += b.energy;
        sumBlueSpd += this.config.blueSpeed * b.traits.speedTrait;
        sumBlueVis += this.config.blueVision * b.traits.visionTrait;
      } else {
        red++;
        sumRedE += b.energy;
        sumRedSpd += this.config.redSpeed * b.traits.speedTrait;
        sumRedVis += this.config.redVision * b.traits.visionTrait;
      }
    }

    const last = this.history[this.history.length - 1];
    this.history.push({
      time: Number(this.time.toFixed(1)),
      tick: this.tickCount,
      fruit: ripe,
      growingFruit: growing,
      blue,
      red,
      avgBlueEnergy: blue > 0 ? Number((sumBlueE / blue).toFixed(1)) : 0,
      avgRedEnergy: red > 0 ? Number((sumRedE / red).toFixed(1)) : 0,
      avgBlueSpeed:
        blue > 0
          ? Number((sumBlueSpd / blue).toFixed(1))
          : last?.avgBlueSpeed ?? this.config.blueSpeed,
      avgBlueVision:
        blue > 0
          ? Number((sumBlueVis / blue).toFixed(1))
          : last?.avgBlueVision ?? this.config.blueVision,
      avgRedSpeed:
        red > 0
          ? Number((sumRedSpd / red).toFixed(1))
          : last?.avgRedSpeed ?? this.config.redSpeed,
      avgRedVision:
        red > 0
          ? Number((sumRedVis / red).toFixed(1))
          : last?.avgRedVision ?? this.config.redVision,
    });

    if (this.history.length > 600) {
      this.history.shift();
    }
  }

  private addStoryEvent(
    category: StoryEvent['category'],
    text: string
  ): void {
    // Avoid duplicate consecutive messages
    if (
      this.storyEvents.length > 0 &&
      this.storyEvents[0].text === text
    ) {
      return;
    }
    this.storyEvents.unshift({
      id: this.nextEventId++,
      time: Number(this.time.toFixed(1)),
      category,
      text,
    });
    if (this.storyEvents.length > 24) {
      this.storyEvents.pop();
    }
  }

  private evaluateStoryMilestones(): void {
    if (this.history.length < 2) return;
    const curr = this.history[this.history.length - 1];

    if (curr.blue > this.maxBlueSeen) this.maxBlueSeen = curr.blue;
    if (curr.red > this.maxRedSeen) this.maxRedSeen = curr.red;
    if (this.time > 3 && curr.blue < this.minBlueAfterStart) {
      this.minBlueAfterStart = curr.blue;
    }

    // Track wave transitions
    if (
      this.lastWaveState === 'initial' &&
      curr.blue >= this.config.startingBlue + 7
    ) {
      this.lastWaveState = 'blue_high';
      this.addStoryEvent(
        'boom',
        `Blue blobs grew to ${curr.blue} by feasting on ripe garden fruit.`
      );
    } else if (
      this.lastWaveState === 'blue_high' &&
      curr.red >= this.config.startingRed + 4
    ) {
      this.lastWaveState = 'red_high';
      this.addStoryEvent(
        'wave',
        `Blue blobs grew first, then red blobs followed—rising to ${curr.red}.`
      );
    } else if (
      this.lastWaveState === 'red_high' &&
      curr.blue <= Math.max(8, Math.floor(this.maxBlueSeen * 0.55))
    ) {
      this.lastWaveState = 'blue_dip';
      this.waveCyclesDetected++;
      this.addStoryEvent(
        'dip',
        `High red activity pushed blue blobs down to ${curr.blue}, letting trees regrow fruit.`
      );
    } else if (
      this.lastWaveState === 'blue_dip' &&
      curr.blue >= Math.max(15, Math.floor(this.maxBlueSeen * 0.75))
    ) {
      this.lastWaveState = 'blue_high';
      this.waveCyclesDetected++;
      this.addStoryEvent(
        'wave',
        `Wave #${this.waveCyclesDetected}: Recovered fruit fueled a fresh blue rebound (${curr.blue} blue).`
      );
    }

    if (curr.red === 0 && !this.redFadedLogged && this.config.startingRed > 0) {
      this.redFadedLogged = true;
      this.addStoryEvent(
        'fade',
        'Red blobs ran low on energy and faded; the world settled into a peaceful fruit-and-blue state.'
      );
    }

    if (curr.blue === 0 && !this.blueFadedLogged && this.config.startingBlue > 0) {
      this.blueFadedLogged = true;
      this.addStoryEvent(
        'fade',
        'Blue blobs faded under heavy pressure, leaving red blobs with no energy source.'
      );
    }
  }

  public getRunSummary(): RunSummaryAnalysis {
    const pts = this.history;
    if (pts.length < 4) {
      return {
        headline: 'The garden is waking up.',
        narrative:
          'Press Play or Step to watch blue blobs forage for green fruit while red blobs seek gentle contact.',
        bullets: [
          'Fruit regrows on trees up to the fruit limit.',
          'Blue blobs eat fruit to gain energy and copy.',
          'Red blobs gain energy from gentle contact with blue blobs.',
        ],
        badgeText: 'Ready to Observe',
        badgeTone: 'emerald',
        waveCount: 0,
        peakBlue: this.config.startingBlue,
        peakRed: this.config.startingRed,
        peakFruit: this.getFruitCounts().ripe,
      };
    }

    const latest = pts[pts.length - 1];
    let peakBlue = 0;
    let peakRed = 0;
    let peakFruit = 0;
    let minBlue = Infinity;
    let minRed = Infinity;
    let bluePeakTime = 0;
    let redPeakTime = 0;

    for (const p of pts) {
      if (p.blue > peakBlue) {
        peakBlue = p.blue;
        bluePeakTime = p.time;
      }
      if (p.red > peakRed) {
        peakRed = p.red;
        redPeakTime = p.time;
      }
      if (p.fruit > peakFruit) peakFruit = p.fruit;
      if (p.blue < minBlue) minBlue = p.blue;
      if (p.red < minRed) minRed = p.red;
    }

    // Count local peaks in blue population to measure waves
    let waves = this.waveCyclesDetected;
    if (pts.length >= 16) {
      let localExtrema = 0;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      let anchor = pts[0].blue;
      for (let i = 1; i < pts.length; i++) {
        const val = pts[i].blue;
        if (trend !== 'up' && val - anchor >= 5) {
          trend = 'up';
          anchor = val;
          localExtrema++;
        } else if (trend === 'up' && val > anchor) {
          anchor = val;
        } else if (trend !== 'down' && anchor - val >= 5) {
          trend = 'down';
          anchor = val;
          localExtrema++;
        } else if (trend === 'down' && val < anchor) {
          anchor = val;
        }
      }
      waves = Math.max(waves, Math.floor(localExtrema / 2));
    }

    // Case 1: One or both groups faded
    if (latest.blue === 0 && latest.red === 0) {
      return {
        headline: 'Both blob groups faded and the orchard grew wild.',
        narrative:
          'Too many red blobs lowered the blue group first; with no blue blobs left to contact, red blobs ran low on energy and faded later. Now green fruit fills every tree.',
        bullets: [
          `Blue blobs peaked at ${peakBlue} before dipping to 0.`,
          `Red blobs peaked at ${peakRed} before starving later.`,
          `Fruit rebounded to ${latest.fruit} ripe fruits with no foragers left.`,
        ],
        badgeText: 'Orchard Only',
        badgeTone: 'amber',
        waveCount: waves,
        peakBlue,
        peakRed,
        peakFruit,
      };
    }

    if (latest.red === 0 && this.config.startingRed > 0) {
      return {
        headline: 'One group faded and the world settled into a simpler state.',
        narrative:
          this.config.startingRed > this.config.startingBlue
            ? 'Red-heavy pressure caused blue blobs to dip sharply first; when blue blobs became rare, red blobs ran low on energy and faded.'
            : 'When blue blobs became scarce, red blobs could not make enough contacts and faded out, leaving blue blobs to balance directly with fruit.',
        bullets: [
          `Blue blobs settled at ${latest.blue} (peak ${peakBlue}).`,
          `Red blobs faded after reaching a peak of ${peakRed}.`,
          `Group size now levels out against the fruit supply (${latest.fruit} ripe).`,
        ],
        badgeText: 'Simpler State',
        badgeTone: 'blue',
        waveCount: waves,
        peakBlue,
        peakRed,
        peakFruit,
      };
    }

    // Case 2: Low-fruit setting keeping the garden small
    if (this.config.fruitLimit <= 20 && peakBlue <= 18) {
      return {
        headline: 'Low fruit kept the garden small.',
        narrative:
          'With a tight fruit limit and slow regrowth, blue blobs cannot accumulate surplus energy rapidly. Both populations stay compact instead of booming.',
        bullets: [
          `Fruit supply stayed capped at ${this.config.fruitLimit} max (${latest.fruit} ripe now).`,
          `Blue blobs stayed small (${latest.blue} active, peak ${peakBlue}).`,
          `Red blobs remained sparse (${latest.red} active) due to scarce prey.`,
        ],
        badgeText: 'Small Garden Cap',
        badgeTone: 'amber',
        waveCount: waves,
        peakBlue,
        peakRed,
        peakFruit,
      };
    }

    // Case 3: Red-heavy initial crash in progress
    if (
      this.config.startingRed > this.config.startingBlue &&
      latest.blue <= Math.ceil(this.config.startingBlue * 0.45)
    ) {
      return {
        headline: 'Blue blobs dipped first, and red blobs are fading later.',
        narrative:
          'Starting with a heavy pack of red blobs rapidly drained the blue group. Now that blue blobs are rare, red blobs are running low on energy.',
        bullets: [
          `Blue blobs dropped from ${this.config.startingBlue} down to ${latest.blue}.`,
          `Red blobs are now ${latest.red} as contacts become scarce.`,
          `Uneaten fruit is recovering on the trees (${latest.fruit} ripe).`,
        ],
        badgeText: 'Predator Overshoot',
        badgeTone: 'rose',
        waveCount: waves,
        peakBlue,
        peakRed,
        peakFruit,
      };
    }

    // Case 4: Fruit-rich booming garden that levels out
    if (this.config.fruitLimit >= 75 && peakBlue >= 28) {
      return {
        headline: 'Abundant fruit fueled rapid blue growth before leveling out.',
        narrative:
          'Fast fruit growth let blue blobs expand quickly, which in turn supported a healthy red group. Carrying capacity and energy costs keep both groups bounded.',
        bullets: [
          `Blue blobs grew to a peak of ${peakBlue} (currently ${latest.blue}).`,
          `Red blobs followed the blue expansion to ${peakRed} (currently ${latest.red}).`,
          `Active fruit fluctuates around ${latest.fruit} as foraging balances regrowth.`,
        ],
        badgeText: 'Bustling Carrying Capacity',
        badgeTone: 'emerald',
        waveCount: waves,
        peakBlue,
        peakRed,
        peakFruit,
      };
    }

    // Case 5: Balanced garden / Out-of-phase waves
    if (waves >= 1 || (redPeakTime > bluePeakTime && peakBlue > this.config.startingBlue + 3)) {
      return {
        headline:
          'The garden stayed balanced: blue blobs grew first, then red blobs followed.',
        narrative:
          'Out-of-phase waves emerged naturally from the energy rules—abundant fruit grows blue blobs, more blue blobs feed red blobs, and red peaks trim blue so fruit can recover.',
        bullets: [
          `Blue blobs ranged between ${minBlue} and ${peakBlue} (now ${latest.blue}).`,
          `Red blobs followed out of phase between ${minRed} and ${peakRed} (now ${latest.red}).`,
          `${Math.max(1, waves)} ecological wave cycle${waves === 1 ? '' : 's'} observed so far.`,
        ],
        badgeText: 'Balanced Waves',
        badgeTone: 'emerald',
        waveCount: Math.max(1, waves),
        peakBlue,
        peakRed,
        peakFruit,
      };
    }

    return {
      headline: 'The garden stayed balanced as groups respond to energy flows.',
      narrative:
        'Blue blobs gather fruit to build energy for copying, while red blobs track the blue herd and pause after each gentle contact.',
      bullets: [
        `Current counts: ${latest.fruit} fruit, ${latest.blue} blue, ${latest.red} red.`,
        `Peaks so far: ${peakFruit} fruit, ${peakBlue} blue, ${peakRed} red.`,
        'Keep watching to see full out-of-phase waves unfold over time.',
      ],
      badgeText: 'Living Balance',
      badgeTone: 'emerald',
      waveCount: waves,
      peakBlue,
      peakRed,
      peakFruit,
    };
  }
}
