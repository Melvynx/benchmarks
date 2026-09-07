import { HistoryPoint } from '../types/simulation';

export interface EcosystemStory {
  headline: string;
  subhead: string;
  phase: 'boom' | 'predation' | 'famine' | 'recovery' | 'balanced' | 'extinction_predator' | 'extinction_prey' | 'extinction_all';
  insightBullets: string[];
  stabilityScore: number; // 0 to 100
}

export function analyzeEcosystemStory(history: HistoryPoint[]): EcosystemStory {
  if (history.length < 4) {
    return {
      headline: 'Garden World Awakening',
      subhead: 'Life stirs across the tabletop dish as organisms seek their first meals.',
      phase: 'balanced',
      insightBullets: [
        'Blue blobs explore trees searching for ripe green fruit.',
        'Red blobs patrol the terrain for foraging prey.',
        'Fruit trees begin initial photosynthetic regrowth cycles.',
      ],
      stabilityScore: 85,
    };
  }

  const latest = history[history.length - 1];
  const windowSize = Math.min(16, history.length);
  const past = history[history.length - windowSize];
  const dt = Math.max(0.1, latest.time - past.time);

  const dFruit = (latest.fruitCount - past.fruitCount) / dt;
  const dBlue = (latest.blueCount - past.blueCount) / dt;
  const dRed = (latest.redCount - past.redCount) / dt;

  // Check extinctions
  if (latest.blueCount === 0 && latest.redCount === 0) {
    return {
      headline: 'Quiet Tabletop Sanctuary',
      subhead: 'All mobile creatures have vanished. The garden dish rests in undisturbed botanical silence.',
      phase: 'extinction_all',
      insightBullets: [
        'Fruit trees are completely full and unharvested.',
        'Zero metabolic energy is being consumed.',
        'Plant new blobs or use a preset to repopulate the world.',
      ],
      stabilityScore: 10,
    };
  }

  if (latest.blueCount > 0 && latest.redCount === 0) {
    return {
      headline: 'Herbivore Paradise',
      subhead: 'Red predators have gone extinct. Blue blobs forage freely without fear.',
      phase: 'extinction_predator',
      insightBullets: [
        'Blue population is now constrained only by fruit tree regrowth capacity.',
        'No fleeing stress; energy is spent purely on foraging and copying.',
        'Spawn red blobs using tools or reset with a balanced preset to restore the food chain.',
      ],
      stabilityScore: 60,
    };
  }

  if (latest.blueCount === 0 && latest.redCount > 0) {
    return {
      headline: 'Predator Famine & Collapse',
      subhead: 'All blue foragers were consumed. The remaining red predators face starvation.',
      phase: 'extinction_prey',
      insightBullets: [
        'Red blobs cannot eat plant fruit and are rapidly losing stored energy.',
        'Population collapse is imminent unless blue prey is reintroduced.',
        'Drop blue blobs to rescue the surviving red lineage.',
      ],
      stabilityScore: 20,
    };
  }

  // Active cycles
  if (dBlue > 0.8 && latest.fruitCount > 15) {
    return {
      headline: 'Forager Population Explosion',
      subhead: 'Abundant fruit has sparked a rapid blue baby boom across the garden.',
      phase: 'boom',
      insightBullets: [
        `Blue group expanded to ${latest.blueCount} individuals.`,
        'High food availability drives high reproductive frequency.',
        'Red predators are beginning to encounter prey with ease.',
      ],
      stabilityScore: 78,
    };
  }

  if (dRed > 0.4 && latest.blueCount > 15) {
    return {
      headline: 'Predator Hunting Surge',
      subhead: 'Red blobs are feasting on the dense blue population, surging in numbers.',
      phase: 'predation',
      insightBullets: [
        `Red pack reached ${latest.redCount} hunters.`,
        'High contact frequency transfers immense caloric energy to predators.',
        'Blue group is starting to feel acute predation pressure.',
      ],
      stabilityScore: 82,
    };
  }

  if (dBlue < -0.6 && latest.redCount > 12) {
    return {
      headline: 'Prey Crash & Overhunting',
      subhead: 'Intense red predation has sharply thinned out blue foragers.',
      phase: 'famine',
      insightBullets: [
        'Blue population dropped as escape became difficult.',
        'Red predators will soon face starvation as prey becomes scarce.',
        'Fruit reserves on trees are starting to accumulate again.',
      ],
      stabilityScore: 65,
    };
  }

  if (dFruit > 0.6 && latest.blueCount < 20 && latest.redCount < 10) {
    return {
      headline: 'Ecosystem Flora Recovery',
      subhead: 'With low herbivore pressure, fruit trees are flourishing and replenishing bounties.',
      phase: 'recovery',
      insightBullets: [
        `Fruit count rebounded to ${latest.fruitCount} ripe treats.`,
        'Surviving blue blobs are finding rich nourishment again.',
        'The stage is set for the next upward population wave.',
      ],
      stabilityScore: 88,
    };
  }

  // Default balanced wave
  return {
    headline: 'Harmonic Lotka-Volterra Oscillation',
    subhead: 'The garden is maintaining a stable predator-prey equilibrium out of phase.',
    phase: 'balanced',
    insightBullets: [
      `Active populations: 🍏 ${latest.fruitCount} Fruit · 🔵 ${latest.blueCount} Blue · 🔴 ${latest.redCount} Red`,
      'Energy flow matches natural cyclical replenishment rates.',
      'Natural selection favors swift and observant blobs.',
    ],
    stabilityScore: 94,
  };
}
