import { memo, useState } from 'react'
import { PRESETS, STRUCTURAL_KEYS, type Params } from '../sim/params'
import { CONTROL_GROUPS, type ControlDef, type Tone } from './controlDefs'

interface Props {
  staged: Params
  applied: Params
  presetId: string
  pendingRestart: boolean
  onChange: <K extends keyof Params>(key: K, value: Params[K]) => void
  onPreset: (id: string) => void
  onRestart: () => void
}

function Slider({
  def,
  value,
  tone,
  dirty,
  onChange,
}: {
  def: ControlDef
  value: number
  tone: Tone
  dirty: boolean
  onChange: (v: number) => void
}) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100
  const id = `ctl-${def.key}`
  return (
    <div className={`slider tone-${tone}${dirty ? ' dirty' : ''}`} title={def.hint}>
      <div className="slider-head">
        <label htmlFor={id}>{def.label}</label>
        <output htmlFor={id}>{def.format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        style={{ ['--pct' as string]: `${Math.min(100, Math.max(0, pct))}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function ControlPanelImpl({ staged, applied, presetId, pendingRestart, onChange, onPreset, onRestart }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({ fruit: true, blue: true, red: true, traits: false, world: true })

  return (
    <section className="panel controls" aria-label="Garden controls">
      <div className="panel-title">
        <h2>Tune the garden</h2>
        <span className="hint">changes apply live</span>
      </div>

      <div className="presets" role="group" aria-label="Presets">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`preset${presetId === p.id ? ' active' : ''}`}
            onClick={() => onPreset(p.id)}
            title={p.blurb}
          >
            <span className="preset-emoji" aria-hidden="true">
              {p.emoji}
            </span>
            <span className="preset-name">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="preset-blurb">
        {presetId === 'custom' ? 'Custom mix. Your own rules.' : (PRESETS.find((p) => p.id === presetId)?.blurb ?? '')}
      </p>

      {CONTROL_GROUPS.map((g) => (
        <div key={g.id} className={`group tone-${g.tone}`}>
          <button
            type="button"
            className="group-head"
            aria-expanded={open[g.id]}
            onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
          >
            <span className="group-emoji" aria-hidden="true">
              {g.emoji}
            </span>
            <span className="group-title">{g.title}</span>
            {g.restart && <span className="badge">restart to apply</span>}
            <span className="chev" aria-hidden="true">
              {open[g.id] ? '−' : '+'}
            </span>
          </button>
          {open[g.id] && (
            <div className="group-body">
              {g.controls.map((c) => (
                <Slider
                  key={c.key}
                  def={c}
                  value={staged[c.key]}
                  tone={g.tone}
                  dirty={STRUCTURAL_KEYS.includes(c.key) && staged[c.key] !== applied[c.key]}
                  onChange={(v) => onChange(c.key, v)}
                />
              ))}
              {g.id === 'world' && (
                <div className={`seed-row${staged.seed !== applied.seed ? ' dirty' : ''}`}>
                  <label htmlFor="ctl-seed">Random seed</label>
                  <input
                    id="ctl-seed"
                    type="number"
                    min={1}
                    max={99999}
                    value={staged.seed}
                    onChange={(e) => onChange('seed', Math.max(1, Math.min(99999, Math.round(Number(e.target.value) || 1))))}
                  />
                  <button
                    type="button"
                    className="mini"
                    onClick={() => onChange('seed', Math.floor(Math.random() * 9999) + 1)}
                    title="Roll a new seed"
                  >
                    🎲
                  </button>
                </div>
              )}
              {g.id === 'world' && (
                <button type="button" className={`restart${pendingRestart ? ' ready' : ''}`} onClick={onRestart}>
                  {pendingRestart ? 'Restart with new world' : 'Restart this world'}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

export const ControlPanel = memo(ControlPanelImpl)
