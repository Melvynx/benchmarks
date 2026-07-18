/**
 * Headless verification that the energy rules produce the promised ecology.
 * Run with: pnpm verify:sim
 */
import { createWorld, stepWorld } from '../src/sim/world'
import { PARAM_DEFAULTS, PRESETS, type Params } from '../src/sim/params'

interface RunResult {
  name: string
  ticks: number
  maxBlue: number
  maxRed: number
  minBlueAfterStart: number
  finalBlue: number
  finalRed: number
  finalFruit: number
  bluePeaks: number[]
  redPeaks: number[]
  avgFruitFrac: number
  avgPop: number
  series: { blue: number[]; red: number[]; fruit: number[] }
}

function findPeaks(values: number[], minProminence: number, minGap: number): number[] {
  const peaks: number[] = []
  for (let i = 2; i < values.length - 2; i++) {
    const v = values[i]
    if (v <= values[i - 1] || v < values[i + 1]) continue
    const leftMin = Math.min(...values.slice(Math.max(0, i - minGap), i + 1))
    const rightMin = Math.min(...values.slice(i, Math.min(values.length, i + minGap + 1)))
    if (v - Math.max(leftMin, rightMin) >= minProminence) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minGap) peaks.push(i)
    }
  }
  return peaks
}

function run(name: string, overrides: Partial<Params>, ticks: number, seed = 7): RunResult {
  const params: Params = { ...PARAM_DEFAULTS, ...overrides, seed }
  const world = createWorld(params)
  const blue: number[] = []
  const red: number[] = []
  const fruit: number[] = []
  let maxBlue = 0
  let maxRed = 0
  let minBlueAfterStart = Infinity
  let fruitSum = 0
  const capacity = params.startTrees * params.fruitLimit
  for (let t = 0; t < ticks; t++) {
    stepWorld(world)
    if (t % 30 === 0) {
      blue.push(world.blues.length)
      red.push(world.reds.length)
      fruit.push(world.trees.reduce((s, tr) => s + tr.fruit, 0))
      fruitSum += fruit[fruit.length - 1] / Math.max(1, capacity)
    }
    maxBlue = Math.max(maxBlue, world.blues.length)
    maxRed = Math.max(maxRed, world.reds.length)
    if (t > 900 && world.blues.length > 0) minBlueAfterStart = Math.min(minBlueAfterStart, world.blues.length)
  }
  const bluePeaks = findPeaks(blue, Math.max(3, maxBlue * 0.2), 40)
  const redPeaks = findPeaks(red, Math.max(2, maxRed * 0.2), 40)
  return {
    name,
    ticks,
    maxBlue,
    maxRed,
    minBlueAfterStart: minBlueAfterStart === Infinity ? 0 : minBlueAfterStart,
    finalBlue: world.blues.length,
    finalRed: world.reds.length,
    finalFruit: world.trees.reduce((s, tr) => s + tr.fruit, 0),
    bluePeaks,
    redPeaks,
    avgFruitFrac: fruitSum / Math.max(1, blue.length),
    avgPop: (blue.reduce((a, b) => a + b, 0) + red.reduce((a, b) => a + b, 0)) / Math.max(1, blue.length),
    series: { blue, red, fruit },
  }
}

function presetParams(id: string): Partial<Params> {
  const p = PRESETS.find((p) => p.id === id)
  if (!p) throw new Error(`unknown preset ${id}`)
  return p.params
}

let failures = 0
function check(label: string, ok: boolean, detail: string) {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures++
  console.log(`  [${mark}] ${label} — ${detail}`)
}

const MIN = 1800 // 30 ticks = 1 sim-second at 30tps
const LONG = 60 * MIN // 1 sim-hour

console.log('\n=== balanced garden (60 sim-min) ===')
const bal = run('balanced', presetParams('balanced'), LONG)
console.log(
  `  maxBlue=${bal.maxBlue} maxRed=${bal.maxRed} finalBlue=${bal.finalBlue} finalRed=${bal.finalRed} ` +
    `bluePeaks=${bal.bluePeaks.length}@${bal.bluePeaks.slice(0, 6).join(',')} redPeaks=${bal.redPeaks.length}@${bal.redPeaks.slice(0, 6).join(',')} avgFruitFrac=${bal.avgFruitFrac.toFixed(2)}`,
)
check('blue population waves (>=2 peaks)', bal.bluePeaks.length >= 2, `${bal.bluePeaks.length} peaks`)
check('red population waves (>=2 peaks)', bal.redPeaks.length >= 2, `${bal.redPeaks.length} peaks`)
check(
  'blue leads red (first blue peak before first red peak)',
  bal.bluePeaks.length > 0 && bal.redPeaks.length > 0 && bal.bluePeaks[0] < bal.redPeaks[0],
  `blue@${bal.bluePeaks[0] ?? '-'} red@${bal.redPeaks[0] ?? '-'}`,
)
check('both groups survive a long run', bal.finalBlue > 0 && bal.finalRed > 0, `final blue=${bal.finalBlue} red=${bal.finalRed}`)
check('populations level off (bounded)', bal.maxBlue < 250 && bal.maxRed < 200, `maxBlue=${bal.maxBlue} maxRed=${bal.maxRed}`)

console.log('\n=== fruit-rich garden (20 sim-min) ===')
const rich = run('fruit-rich', presetParams('fruit-rich'), 20 * MIN)
console.log(`  maxBlue=${rich.maxBlue} finalBlue=${rich.finalBlue} avgFruitFrac=${rich.avgFruitFrac.toFixed(2)}`)
check('blue blobs grow quickly', rich.maxBlue > bal.maxBlue * 1.15, `rich maxBlue=${rich.maxBlue} vs balanced ${bal.maxBlue}`)

console.log('\n=== low-fruit garden (20 sim-min) ===')
const low = run('low-fruit', presetParams('low-fruit'), 20 * MIN)
console.log(`  maxBlue=${low.maxBlue} avgPop=${low.avgPop.toFixed(1)} avgFruitFrac=${low.avgFruitFrac.toFixed(2)}`)
check('garden stays small', low.avgPop < bal.avgPop * 0.7 && low.maxBlue < bal.maxBlue * 0.8, `avgPop=${low.avgPop.toFixed(1)} vs balanced ${bal.avgPop.toFixed(1)}, maxBlue=${low.maxBlue}`)

console.log('\n=== red-heavy garden (20 sim-min) ===')
const heavy = run('red-heavy', presetParams('red-heavy'), 20 * MIN)
const blueDipIdx = heavy.series.blue.findIndex((v, i) => i > 20 && v < 10 * 0.45)
const redFadeIdx = heavy.series.red.findIndex((v, i) => i > 40 && v <= Math.max(2, heavy.maxRed * 0.25))
console.log(
  `  maxRed=${heavy.maxRed} minBlue=${heavy.minBlueAfterStart} blueDipIdx=${blueDipIdx} redFadeIdx=${redFadeIdx} finalBlue=${heavy.finalBlue} finalRed=${heavy.finalRed}`,
)
check('blue dips hard first', blueDipIdx > 0 || heavy.minBlueAfterStart < 6, `blueDipIdx=${blueDipIdx} minBlue=${heavy.minBlueAfterStart}`)
check(
  'red fades after the blue dip',
  redFadeIdx > blueDipIdx && blueDipIdx > 0,
  `redFadeIdx=${redFadeIdx} blueDipIdx=${blueDipIdx}`,
)

console.log('\n=== determinism (same seed, same story) ===')
const a = run('det-a', {}, 5 * MIN, 42)
const b = run('det-b', {}, 5 * MIN, 42)
check('identical seeds give identical results', a.finalBlue === b.finalBlue && a.finalRed === b.finalRed && a.maxBlue === b.maxBlue, `a=(${a.finalBlue},${a.finalRed}) b=(${b.finalBlue},${b.finalRed})`)

console.log(failures === 0 ? '\nAll simulation checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
