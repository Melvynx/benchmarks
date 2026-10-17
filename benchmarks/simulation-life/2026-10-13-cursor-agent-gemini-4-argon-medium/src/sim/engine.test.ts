import { describe, expect, it } from 'vitest'
import { GardenSimulation } from './engine'
import { PRESETS } from './presets'

function runSim(presetId: string, seconds: number) {
  const preset = PRESETS.find((p) => p.id === presetId)!
  const sim = new GardenSimulation(preset.config)
  const steps = Math.round(seconds / 0.05)
  for (let i = 0; i < steps; i++) {
    sim.step(0.05)
  }
  return sim
}

describe('GardenSimulation presets & ecology rules', () => {
  it('verifies balanced preset maintains long-running waves with both species alive', () => {
    const sim = runSim('balanced', 160)
    const blues = sim.history.map((h) => h.blueCount)
    const reds = sim.history.map((h) => h.redCount)
    const maxBlue = Math.max(...blues)
    const minBlue = Math.min(...blues)
    const maxRed = Math.max(...reds)
    const latest = sim.history[sim.history.length - 1]

    console.log('BALANCED:', {
      maxBlue,
      minBlue,
      maxRed,
      endBlue: latest.blueCount,
      endRed: latest.redCount,
      waves: sim.getSummary().waveCount,
      headline: sim.getSummary().headline,
    })

    expect(latest.blueCount).toBeGreaterThan(0)
    expect(latest.redCount).toBeGreaterThan(0)
    expect(maxBlue - minBlue).toBeGreaterThanOrEqual(6)
    expect(maxBlue).toBeLessThan(120)
  })

  it('verifies fruit-rich preset grows blue blobs quickly to a larger population', () => {
    const sim = runSim('fruit-rich', 120)
    const blues = sim.history.map((h) => h.blueCount)
    const maxBlue = Math.max(...blues)
    const avgBlue = blues.reduce((a, b) => a + b, 0) / blues.length

    console.log('FRUIT-RICH:', {
      maxBlue,
      avgBlue: avgBlue.toFixed(1),
      headline: sim.getSummary().headline,
    })

    expect(maxBlue).toBeGreaterThanOrEqual(32)
  })

  it('verifies low-fruit preset keeps the whole garden small', () => {
    const sim = runSim('low-fruit', 120)
    const blues = sim.history.map((h) => h.blueCount)
    const reds = sim.history.map((h) => h.redCount)
    const maxBlue = Math.max(...blues)
    const maxRed = Math.max(...reds)

    console.log('LOW-FRUIT:', {
      maxBlue,
      maxRed,
      endBlue: blues[blues.length - 1],
      endRed: reds[reds.length - 1],
      headline: sim.getSummary().headline,
    })

    expect(maxBlue).toBeLessThanOrEqual(16)
    expect(maxRed).toBeLessThanOrEqual(10)
  })

  it('verifies red-heavy preset dips blue blobs first and red blobs fade later', () => {
    const sim = runSim('red-heavy', 120)
    const blues = sim.history.map((h) => h.blueCount)
    const reds = sim.history.map((h) => h.redCount)
    const minBlue = Math.min(...blues)
    const endRed = reds[reds.length - 1]

    console.log('RED-HEAVY:', {
      startBlue: blues[0],
      minBlue,
      startRed: reds[0],
      endRed,
      endBlue: blues[blues.length - 1],
      headline: sim.getSummary().headline,
    })

    expect(minBlue).toBeLessThan(blues[0])
    expect(endRed).toBeLessThan(reds[0] * 0.5)
  })
})
