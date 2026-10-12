// Headless checks of the brief's quality claims: `pnpm verify [seconds] [seeds]`
import { World, DT } from '../src/sim/world.ts'
import { PRESETS } from '../src/sim/params.ts'
import { tellStory } from '../src/sim/analysis.ts'

const seconds = Number(process.argv[2] ?? 1500)
const seeds = Number(process.argv[3] ?? 4)

interface Run {
  w: World
  maxB: number
  maxR: number
  blueAt60: number
}

function run(id: string, seedOffset: number): Run {
  const preset = PRESETS.find((p) => p.id === id)!
  const w = new World({ ...preset.params, seed: preset.params.seed + seedOffset * 101 })
  let maxB = 0
  let maxR = 0
  let blueAt60 = 0
  const steps = Math.round(seconds / DT)
  for (let i = 1; i <= steps; i++) {
    w.step()
    maxB = Math.max(maxB, w.counts[0])
    maxR = Math.max(maxR, w.counts[1])
    if (i === Math.round(60 / DT)) blueAt60 = w.counts[0]
  }
  return { w, maxB, maxR, blueAt60 }
}

let failures = 0
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (${detail})`)
}

const runs: Record<string, Run[]> = {}
for (const p of PRESETS) {
  runs[p.id] = []
  for (let s = 0; s < seeds; s++) runs[p.id].push(run(p.id, s))
  console.log(`\n${p.name}`)
  for (const [s, r] of runs[p.id].entries()) {
    const st = tellStory(r.w.history, r.w.params, r.w.totals)
    console.log(
      `  seed+${s}: B max ${r.maxB} R max ${r.maxR} now ${r.w.counts.join('/')} waves ${st.blueWaves}/${st.redWaves} lag ${st.lagSec?.toFixed(0) ?? '-'}s loops ${st.loops.toFixed(1)}`,
    )
    console.log(`    “${st.headline}” ${st.lines.join(' ')}`)
  }
}

console.log('\nChecks')
const bal = runs.balanced
const balAlive = bal.filter((r) => r.w.counts[0] > 0 && r.w.counts[1] > 0).length
check('Balanced: both groups survive the whole run', balAlive >= Math.ceil(seeds * 0.75), `${balAlive}/${seeds} seeds`)
const balWaves = bal.map((r) => tellStory(r.w.history, r.w.params, r.w.totals))
const outOfPhase = balWaves.filter((s) => s.lagSec !== null && s.lagSec > 0 && s.loops >= 2 && s.blueWaves >= 3 && s.redWaves >= 3).length
check(
  'Balanced: repeated out-of-phase waves (red trails blue, CCW phase loops)',
  outOfPhase >= Math.ceil(seeds * 0.75),
  `${outOfPhase}/${seeds} seeds · lags ${balWaves.map((s) => s.lagSec?.toFixed(0) ?? '-').join(',')}s · loops ${balWaves.map((s) => s.loops.toFixed(1)).join(',')}`,
)

const rich = runs.rich
const richFast = rich.filter((r) => r.blueAt60 >= r.w.params.blue0 * 3).length
check('Fruit-rich: blue blobs grow quickly (×3 in 60s)', richFast === seeds, `blue at 60s: ${rich.map((r) => r.blueAt60).join(',')} from ${rich[0].w.params.blue0}`)
const richBig = Math.min(...rich.map((r) => r.maxB)) > Math.max(...bal.map((r) => r.maxB))
check('Fruit-rich: blue peak beats every balanced run', richBig, `rich min peak ${Math.min(...rich.map((r) => r.maxB))} vs balanced max peak ${Math.max(...bal.map((r) => r.maxB))}`)

const low = runs.lowfruit
const lowSmall = low.every((r) => r.maxB + r.maxR < 50 && r.maxB < Math.min(...bal.map((b) => b.maxB)) / 2)
check('Low-fruit: whole garden stays small', lowSmall, `peaks ${low.map((r) => `${r.maxB}+${r.maxR}`).join(', ')}`)

const rh = runs.redheavy
const rhOrder = rh.filter((r) => {
  const { t, blue, red } = r.w.history.cols
  const b0 = blue[0]
  const r0 = red[0]
  const blueDip = blue.findIndex((x) => x <= b0 * 0.7)
  const redFade = red.findIndex((x) => x <= r0 * 0.5)
  return blueDip >= 0 && redFade >= 0 && t[blueDip] < t[redFade]
}).length
check('Red-heavy: blue dips first, red fades later', rhOrder === seeds, `${rhOrder}/${seeds} seeds`)

for (const p of PRESETS) {
  const rs = runs[p.id]
  const bounded = rs.every((r) => {
    const b = r.w.history.cols.blue
    const lastQ = b.slice(Math.floor(b.length * 0.75))
    const mean = lastQ.reduce((x, y) => x + y, 0) / Math.max(1, lastQ.length)
    return r.maxB < 900 && mean <= r.maxB
  })
  const lateMeans = rs.map((r) => {
    const b = r.w.history.cols.blue
    const lastQ = b.slice(Math.floor(b.length * 0.75))
    return Math.round(lastQ.reduce((x, y) => x + y, 0) / Math.max(1, lastQ.length))
  })
  check(`${p.name}: group sizes stay bounded`, bounded, `peak blue ${rs.map((r) => r.maxB).join(',')} · late mean ${lateMeans.join(',')}`)
}

console.log(`\n${failures ? `${failures} check(s) failed` : 'All checks passed'}`)
process.exit(failures ? 1 : 0)
