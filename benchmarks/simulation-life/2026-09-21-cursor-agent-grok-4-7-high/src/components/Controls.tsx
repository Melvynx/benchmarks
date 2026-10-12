import type { Params, ParamKey, Preset } from '../sim/params'
import { PARAM_GROUPS } from '../sim/params'

type Props = {
  params: Params
  presets: Preset[]
  activePreset: string | null
  setupDirty: boolean
  onChange: (key: ParamKey, value: number) => void
  onPreset: (preset: Preset) => void
}

export function Controls({ params, presets, activePreset, setupDirty, onChange, onPreset }: Props) {
  return (
    <aside className="controls">
      <div className="preset-row">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={preset.id === activePreset ? 'preset on' : 'preset'}
            onClick={() => onPreset(preset)}
            title={preset.blurb}
          >
            {preset.name}
          </button>
        ))}
      </div>
      {setupDirty ? <p className="dirty">Reset to place the new trees, blobs, size, and seed.</p> : null}
      {PARAM_GROUPS.map((group) => (
        <section key={group.title} className="panel">
          <header className="panel-head">
            <h2>{group.title}</h2>
            <p>{group.caption}</p>
          </header>
          {group.specs.map((spec) => {
            const value = params[spec.key]
            return (
              <label key={spec.key} className="field" title={spec.hint}>
                <span className="field-label">
                  <span>{spec.label}</span>
                  <span className="field-value">
                    {spec.integer ? Math.round(value) : trim(value)}
                    {spec.unit ?? ''}
                  </span>
                </span>
                {spec.key === 'seed' ? (
                  <input
                    type="number"
                    min={spec.min}
                    max={spec.max}
                    step={1}
                    value={value}
                    onChange={(event) => onChange(spec.key, Number(event.target.value))}
                  />
                ) : (
                  <input
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={value}
                    onChange={(event) => onChange(spec.key, Number(event.target.value))}
                  />
                )}
              </label>
            )
          })}
        </section>
      ))}
    </aside>
  )
}

function trim(value: number) {
  return Number(value.toFixed(3)).toString()
}
