import { HistoryPoint, SimulationConfig } from '../types/simulation';

export interface NarrativeSummary {
  headline: string;
  badge: string;
  tone: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate';
  detail: string;
  phase: string;
  stabilityScore: number; // 0 to 100
  cycleEstimate: number;
}

export function generateNarrative(
  history: HistoryPoint[],
  config: SimulationConfig,
  elapsedTime: number
): NarrativeSummary {
  if (history.length < 4) {
    return {
      headline: 'The garden awakens...',
      badge: '🌱 Sprouting',
      tone: 'emerald',
      detail: 'Initial seeds have taken root. Foraging blue blobs are dispersing to locate fruit trees while red predators scout their surroundings.',
      phase: 'Initialization',
      stabilityScore: 85,
      cycleEstimate: 0,
    };
  }

  const latest = history[history.length - 1];
  const blueCount = latest.blueCount;
  const redCount = latest.redCount;
  const fruitCount = latest.fruitCount;
  const maxFruit = latest.fruitCapacity || 1;

  // Window for short-term trend (last 10-20 samples ~ 3-5 seconds)
  const windowSize = Math.min(25, history.length);
  const recentSlice = history.slice(history.length - windowSize);
  const oldestRecent = recentSlice[0];

  const deltaBlue = blueCount - oldestRecent.blueCount;
  const deltaRed = redCount - oldestRecent.redCount;
  const deltaFruit = fruitCount - oldestRecent.fruitCount;

  // Check extinctions / dominance
  if (blueCount === 0 && redCount === 0) {
    return {
      headline: 'One group faded and the world settled into a simpler state.',
      badge: '🍂 Silent Garden',
      tone: 'slate',
      detail: 'All blobs have departed. The fruit trees now flourish in absolute peace, their branches weighed down with unharvested fruit.',
      phase: 'Extinction',
      stabilityScore: 10,
      cycleEstimate: 0,
    };
  }

  if (blueCount === 0 && redCount > 0) {
    return {
      headline: 'Prey vanished; predators are running low on energy.',
      badge: '⚠️ Starvation',
      tone: 'rose',
      detail: `The blue population was wiped out. Without prey to replenish their reserves, the remaining ${redCount} red blobs will soon fade.`,
      phase: 'Prey Collapse',
      stabilityScore: 20,
      cycleEstimate: 0,
    };
  }

  if (redCount === 0 && blueCount > 0) {
    return {
      headline: 'Predators faded; blue foragers enjoy an untamed sanctuary.',
      badge: '🫐 Free Haven',
      tone: 'blue',
      detail: `With no red predators left to keep them in check, ${blueCount} blue blobs browse freely, limited only by the trees' fruit regeneration.`,
      phase: 'Prey Monopoly',
      stabilityScore: 40,
      cycleEstimate: 0,
    };
  }

  // Low fruit scenario
  const isLowFruitGarden = maxFruit < 40 || (fruitCount / maxFruit < 0.25 && config.fruitGrowthSpeed < 0.8);
  if (isLowFruitGarden && blueCount < 20 && redCount < 8) {
    return {
      headline: 'Low fruit kept the garden small.',
      badge: '🏜️ Scarce Oasis',
      tone: 'amber',
      detail: `Scarce food supplies throttle blue reproduction. In turn, low blue numbers cap the red predator population, keeping the entire ecosystem modest.`,
      phase: 'Nutrient Limited',
      stabilityScore: 65,
      cycleEstimate: 1,
    };
  }

  // Wave phase detection:
  // Phase 1: Blue rising, Red low/lagging -> "Blue blobs grew first, then red blobs followed."
  // Phase 2: Red rising, Blue falling -> "Too many red blobs lowers the blue group."
  // Phase 3: Blue low, Red falling -> "If blue blobs become rare, red blobs run low on energy and fade."
  // Phase 4: Red low, Fruit high -> Blue recovering

  // Count oscillations in history
  let wavePeaks = 0;
  for (let i = 2; i < history.length - 2; i++) {
    const prev = history[i - 1].blueCount;
    const curr = history[i].blueCount;
    const next = history[i + 1].blueCount;
    if (curr > prev && curr > next && curr > 25) {
      wavePeaks++;
    }
  }

  // Check out-of-phase wave dynamics
  const blueIsSurging = deltaBlue > 5;
  const redIsSurging = deltaRed > 3;
  const blueIsDropping = deltaBlue < -5;
  const redIsDropping = deltaRed < -3;

  if (blueIsSurging && deltaRed <= 1) {
    return {
      headline: 'Blue blobs grew first, then red blobs followed.',
      badge: '📈 Prey Surge',
      tone: 'blue',
      detail: `Plentiful fruit sparked a blue baby boom (+${deltaBlue} foragers). Expect red predators to multiply soon in response to the abundant meals.`,
      phase: 'Forager Growth',
      stabilityScore: 88,
      cycleEstimate: Math.max(1, wavePeaks),
    };
  }

  if (redIsSurging && blueIsDropping) {
    return {
      headline: 'Too many red blobs lowered the blue group.',
      badge: '🎯 Heavy Predation',
      tone: 'rose',
      detail: `Red predator numbers surged (+${deltaRed}), intensifying contact pressure. The blue population is dipping (-${Math.abs(deltaBlue)}), which will soon pinch predator reserves.`,
      phase: 'Predation Wave',
      stabilityScore: 78,
      cycleEstimate: Math.max(1, wavePeaks),
    };
  }

  if (blueCount < 18 && redIsDropping) {
    return {
      headline: 'Prey became rare; red blobs are running low on energy and fading.',
      badge: '📉 Predator Famine',
      tone: 'amber',
      detail: `Scarce blue blobs cannot sustain the large predator pack. Red numbers are thinning (-${Math.abs(deltaRed)}), creating room for fruit and blue blobs to bounce back.`,
      phase: 'Predator Crash',
      stabilityScore: 74,
      cycleEstimate: Math.max(1, wavePeaks),
    };
  }

  if (deltaFruit > 10 && deltaBlue >= 0 && redCount < 15) {
    return {
      headline: 'Fruit regrew; blue foragers are rallying.',
      badge: '🍎 Harvest Recovery',
      tone: 'emerald',
      detail: `Trees have replenished their fruit reserves. Blue blobs are regaining energy and beginning to replicate, setting up the next population wave.`,
      phase: 'Resource Rebound',
      stabilityScore: 92,
      cycleEstimate: Math.max(1, wavePeaks),
    };
  }

  // Sustained balance
  if (elapsedTime > 25 && wavePeaks >= 2) {
    return {
      headline: 'The garden stayed balanced.',
      badge: '⚖️ Harmonic Waves',
      tone: 'emerald',
      detail: `The garden has achieved resilient Lotka-Volterra equilibrium: ${wavePeaks} distinct population waves recorded without either group collapsing.`,
      phase: 'Dynamic Equilibrium',
      stabilityScore: 96,
      cycleEstimate: wavePeaks,
    };
  }

  return {
    headline: 'The garden stayed balanced.',
    badge: '🌿 Rhythmic Pulse',
    tone: 'emerald',
    detail: `A healthy coexistence: ${fruitCount} ripe fruits nourish ${blueCount} blue foragers, while ${redCount} red predators gently check overpopulation.`,
    phase: 'Harmonic Coexistence',
    stabilityScore: 90,
    cycleEstimate: Math.max(1, wavePeaks),
  };
}
