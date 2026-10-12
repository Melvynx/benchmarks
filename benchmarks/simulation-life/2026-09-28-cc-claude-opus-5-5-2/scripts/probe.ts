// Detailed trace of one run: `node scripts/probe.ts preset seconds every k=v...`
import { World, DT, BLUE, RED, TUNING } from '../src/sim/world.ts'
import { PRESETS, type Params } from '../src/sim/params.ts'
const [id = 'balanced', secArg = '300', everyArg = '10', ...overrides] = process.argv.slice(2)
const extra: Partial<Params> = {}
for (const o of overrides) {
  const [k, v] = o.split('=')
  if (k in TUNING) (TUNING as Record<string, number>)[k] = Number(v)
  else (extra as Record<string, number>)[k] = Number(v)
}
const preset = PRESETS.find((p) => p.id === id)!
const w = new World({ ...preset.params, ...extra })
const every = Math.round(Number(everyArg) / DT)
let lastT = w.totals
let prev = JSON.parse(JSON.stringify(w.totals))
for (let i = 1; i <= Math.round(Number(secArg) / DT); i++) {
  w.step()
  if (i % every === 0) {
    const acts: Record<string, number> = {}
    let eb = 0, er = 0
    for (const b of w.blobs) if (b.alive) { acts[(b.kind === BLUE ? 'b.' : 'r.') + b.action] = (acts[(b.kind === BLUE ? 'b.' : 'r.') + b.action] ?? 0) + 1; if (b.kind === BLUE) eb += b.energy; else er += b.energy }
    const T = w.totals
    console.log(
      `t=${w.t.toFixed(0).padStart(4)} B=${String(w.counts[0]).padStart(3)} R=${String(w.counts[1]).padStart(3)} F=${String(w.ripe).padStart(3)} eB=${(eb / (w.counts[0] || 1)).toFixed(0)} eR=${(er / (w.counts[1] || 1)).toFixed(0)} +B${T.births[0] - prev.births[0]} +R${T.births[1] - prev.births[1]} boop${T.contacts - prev.contacts} kill${T.fadesByBoop - prev.fadesByBoop} hungB${T.fadesByHunger[0] - prev.fadesByHunger[0]} hungR${T.fadesByHunger[1] - prev.fadesByHunger[1]} ageB${T.fadesByAge[0] - prev.fadesByAge[0]} ageR${T.fadesByAge[1] - prev.fadesByAge[1]} ` +
        Object.entries(acts).sort().map(([k, v]) => `${k}:${v}`).join(' '),
    )
    prev = JSON.parse(JSON.stringify(T))
  }
}
void lastT; void RED
