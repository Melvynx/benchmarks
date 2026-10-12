// Headless runs of the garden for tuning presets: `pnpm tune [presetId] [seconds] [seeds]`
import { World, DT, TUNING } from '../src/sim/world.ts'
import { PRESETS, type Params } from '../src/sim/params.ts'

const [presetArg = 'all', secArg = '1200', seedArg = '3', ...overrides] = process.argv.slice(2)
const seconds = Number(secArg)
const seeds = Number(seedArg)
const extra: Partial<Params> = {}
for (const o of overrides) {
  const [k, v] = o.split('=')
  if (k in TUNING) (TUNING as Record<string, number>)[k] = Number(v)
  else (extra as Record<string, number>)[k] = Number(v)
}

for (const preset of PRESETS) {
  if (presetArg !== 'all' && preset.id !== presetArg) continue
  console.log(`\n=== ${preset.name} ${JSON.stringify(extra)}`)
  for (let s = 0; s < seeds; s++) {
    const w = new World({ ...preset.params, ...extra, seed: preset.params.seed + s * 101 })
    const t0 = performance.now()
    const row: string[] = []
    let blueGone = -1
    let redGone = -1
    let maxB = 0
    let maxR = 0
    const steps = Math.round(seconds / DT)
    for (let i = 1; i <= steps; i++) {
      w.step()
      const [b, r] = w.counts
      maxB = Math.max(maxB, b)
      maxR = Math.max(maxR, r)
      if (b === 0 && blueGone < 0) blueGone = w.t
      if (r === 0 && redGone < 0) redGone = w.t
      if (i % Math.round(25 / DT) === 0) row.push(`${b}/${r}/${w.ripe}`)
    }
    const ms = performance.now() - t0
    console.log(
      `seed ${s}: maxB ${maxB} maxR ${maxR} blueGone ${blueGone.toFixed(0)} redGone ${redGone.toFixed(0)} births ${w.totals.births} boops ${w.totals.contacts} (${(ms / 1000).toFixed(1)}s)`,
    )
    if (process.env.ROWS) console.log('  ' + row.join(' '))
  }
}
