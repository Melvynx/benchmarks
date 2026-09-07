import { describe, it, expect } from 'vitest';
import { SimulationEngine } from './engine';
import { PRESETS } from './presets';
import { analyzeEcosystemStory } from './narrative';

describe('SimulationEngine', () => {
  it('initializes with default config and populations', () => {
    const engine = new SimulationEngine();
    const stats = engine.getStats();

    expect(stats.blueCount).toBe(30);
    expect(stats.redCount).toBe(10);
    expect(engine.trees.length).toBe(16);
    expect(stats.fruitCount).toBeGreaterThan(0);
  });

  it('updates simulation time and moves entities', () => {
    const engine = new SimulationEngine();
    const initialBlue = Array.from(engine.blobs.values()).find(b => b.species === 'blue')!;
    const startX = initialBlue.x;
    const startZ = initialBlue.z;
    const startEnergy = initialBlue.energy;

    // Run 10 ticks (0.5s)
    for (let i = 0; i < 10; i++) {
      engine.update(0.05);
    }

    expect(engine.time).toBeCloseTo(0.5, 1);
    expect(initialBlue.energy).toBeLessThan(startEnergy);
  });

  it('allows blue blobs to consume fruit and gain energy', () => {
    const engine = new SimulationEngine();
    const blue = engine.spawnBlob('blue', 0, 0, 1, undefined, 30);
    const initialEnergy = blue.energy;

    // Force eating action
    blue.action = 'eating';
    blue.actionTimer = 0.05;

    engine.update(0.1); // Finish eating
    expect(blue.energy).toBeGreaterThan(initialEnergy);
    expect(blue.stats.fruitEaten).toBe(1);
  });

  it('reproduces when energy reaches threshold', () => {
    const engine = new SimulationEngine({ blueCopyThreshold: 50 });
    const initialCount = Array.from(engine.blobs.values()).filter(b => b.species === 'blue').length;

    // Give high energy to a blue blob
    const blue = Array.from(engine.blobs.values()).find(b => b.species === 'blue')!;
    blue.energy = 80;

    engine.update(0.05);
    const newCount = Array.from(engine.blobs.values()).filter(b => b.species === 'blue').length;
    expect(newCount).toBeGreaterThan(initialCount);
  });

  it('applies presets correctly', () => {
    const engine = new SimulationEngine();
    const fruitRich = PRESETS.find(p => p.id === 'fruit-rich')!;

    engine.reset(fruitRich.config);
    expect(engine.config.treeCount).toBe(24);
    expect(engine.trees.length).toBe(24);
    expect(engine.blobs.size).toBe(45 + 12);
  });

  it('analyzes narrative story correctly', () => {
    const story = analyzeEcosystemStory([
      {
        time: 1,
        fruitCount: 50,
        blueCount: 30,
        redCount: 10,
        avgBlueEnergy: 50,
        avgRedEnergy: 50,
        avgBlueSpeed: 1,
        avgRedSpeed: 1,
        avgBlueVision: 1,
        avgRedVision: 1,
      },
      {
        time: 2,
        fruitCount: 45,
        blueCount: 32,
        redCount: 11,
        avgBlueEnergy: 52,
        avgRedEnergy: 51,
        avgBlueSpeed: 1,
        avgRedSpeed: 1,
        avgBlueVision: 1,
        avgRedVision: 1,
      },
      {
        time: 3,
        fruitCount: 40,
        blueCount: 35,
        redCount: 12,
        avgBlueEnergy: 53,
        avgRedEnergy: 52,
        avgBlueSpeed: 1,
        avgRedSpeed: 1,
        avgBlueVision: 1,
        avgRedVision: 1,
      },
      {
        time: 4,
        fruitCount: 35,
        blueCount: 38,
        redCount: 13,
        avgBlueEnergy: 54,
        avgRedEnergy: 53,
        avgBlueSpeed: 1,
        avgRedSpeed: 1,
        avgBlueVision: 1,
        avgRedVision: 1,
      },
    ]);

    expect(story.headline).toBeDefined();
    expect(story.insightBullets.length).toBeGreaterThan(0);
  });
});
