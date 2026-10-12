// Robustness sweep: `node scripts/sweep.ts preset seconds seeds k=v...` → survival + wave stats
import { World, DT, TUNING } from '../src/sim/world.ts'
import { PRESETS, type Params } from '../src/sim/params.ts'
const [id = 'balanced', secArg = '2000', seedArg = '8', ...overrides] = process.argv.slice(2)
const extra: Partial<Params> = {}
for (const o of overrides) {
  const [k, v] = o.split('=')
  if (k in TUNING) (TUNING as Record<string, number>)[k] = Number(v)
  else (extra as Record<string, number>)[k] = Number(v)
}
const preset = PRESETS.find((p) => p.id === id)!
let survived = 0
const lines: string[] = []
for (let s = 0; s < Number(seedArg); s++) {
  const w = new World({ ...preset.params, ...extra, seed: preset.params.seed + s * 101 })
  const B: number[] = []
  const R: number[] = []
  const steps = Math.round(Number(secArg) / DT)
  let gone = ''
  for (let i = 1; i <= steps; i++) {
    w.step()
    if (i % 20 === 0) {
      B.push(w.counts[0])
      R.push(w.counts[1])
    }
    if (!gone && (w.counts[0] === 0 || w.counts[1] === 0)) gone = `${w.counts[0] === 0 ? 'B' : 'R'}@${w.t.toFixed(0)}`
  }
  if (!gone) survived++
  const stat = (a: number[]) => {
    const m = a.reduce((x, y) => x + y, 0) / a.length
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length)
    return `${m.toFixed(0)}±${sd.toFixed(0)} [${Math.min(...a)}–${Math.max(...a)}]`
  }
  lines.push(`  s${s}: ${gone || 'ok'.padEnd(6)} B ${stat(B)}  R ${stat(R)}`)
}
console.log(`${id} ${overrides.join(' ')} → survived ${survived}/${seedArg}`)
console.log(lines.join('\n'))
