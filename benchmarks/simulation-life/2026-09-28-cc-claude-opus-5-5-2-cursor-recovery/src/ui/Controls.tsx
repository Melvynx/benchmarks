import { memo, type CSSProperties } from 'react'
import { PARAM_DEFS, PRESETS, type ParamDef, type ParamGroup, type ParamKey, type Params } from '../sim/params.ts'

const GROUPS: { id: ParamGroup; title: string; note: string }[] = [
  { id: 'garden', title: 'Fruit trees', note: 'The food supply. Blue blobs live on it.' },
  { id: 'blue', title: 'Blue blobs', note: 'Eat fruit, copy when full, hide from reds.' },
  { id: 'red', title: 'Red blobs', note: 'Boop blue blobs for energy, then rest.' },
  { id: 'world', title: 'Starting garden', note: 'Sliders marked “on reset” plant a new garden.' },
]

export function formatParam(d: ParamDef, v: number): string {
  if (d.format) return d.format(v)
  const digits = d.step >= 1 ? 0 : d.step >= 0.1 ? 1 : 2
  return `${v.toFixed(digits)}${d.unit ? ` ${d.unit}` : ''}`
}

export function sameParams(a: Params, b: Params): boolean {
  return PARAM_DEFS.every((d) => a[d.key] === b[d.key])
}

interface Props {
  params: Params
  applied: Params
  presetId: string | null
  onParam: (key: ParamKey, value: number) => void
  onPreset: (id: string) => void
  onNewSeed: () => void
}

export const Controls = memo(function Controls({ params, applied, presetId, onParam, onPreset, onNewSeed }: Props) {
  const preset = PRESETS.find((p) => p.id === presetId)
  const edited = preset ? !sameParams(preset.params, params) : false
  return (
    <div className="controls">
      <section className="card presets">
        <div className="card-head">
          <div>
            <h3>Presets</h3>
            <p className="sub">Each one plants a fresh garden.</p>
          </div>
        </div>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`preset p-${p.id} ${p.id === presetId ? 'on' : ''}`} onClick={() => onPreset(p.id)} aria-pressed={p.id === presetId}>
              <b>
                {p.name}
                {p.id === presetId && edited && <em>edited</em>}
              </b>
              <span>{p.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.id} className={`card group g-${g.id}`}>
          <div className="card-head">
            <div>
              <h3>{g.title}</h3>
              <p className="sub">{g.note}</p>
            </div>
          </div>
          {PARAM_DEFS.filter((d) => d.group === g.id).map((d) =>
            d.key === 'seed' ? (
              <div key={d.key} className="ctl seed">
                <label htmlFor="ctl-seed">{d.label}</label>
                {params.seed !== applied.seed && <span className="pending">on reset</span>}
                <div className="seed-row">
                  <input
                    id="ctl-seed"
                    type="number"
                    min={d.min}
                    max={d.max}
                    step={1}
                    value={params.seed}
                    onChange={(e) => {
                      const v = Math.round(Number(e.target.value))
                      if (Number.isFinite(v)) onParam('seed', Math.min(d.max, Math.max(d.min, v)))
                    }}
                  />
                  <button type="button" className="btn small" onClick={onNewSeed} title="Pick a new random seed and replant">
                    New seed
                  </button>
                </div>
                <small className="hint">{d.hint}</small>
              </div>
            ) : (
              <Slider key={d.key} def={d} value={params[d.key]} pending={!!d.onReset && params[d.key] !== applied[d.key]} onChange={onParam} />
            ),
          )}
        </section>
      ))}
    </div>
  )
})

function Slider({ def: d, value, pending, onChange }: { def: ParamDef; value: number; pending: boolean; onChange: (k: ParamKey, v: number) => void }) {
  const id = `ctl-${d.key}`
  const pct = ((value - d.min) / (d.max - d.min)) * 100
  return (
    <div className="ctl">
      <label htmlFor={id}>{d.label}</label>
      {pending && <span className="pending">on reset</span>}
      <output htmlFor={id}>{formatParam(d, value)}</output>
      <input
        id={id}
        type="range"
        min={d.min}
        max={d.max}
        step={d.step}
        value={value}
        style={{ '--p': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(d.key, Number(e.target.value))}
        aria-describedby={`${id}-hint`}
      />
      <small className="hint" id={`${id}-hint`} title={d.hint}>
        {d.hint}
      </small>
    </div>
  )
}
