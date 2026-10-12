import { GROUPS, LABELS, PRESETS, RANGES, formatValue } from '../sim/presets'
import type { Params } from '../sim/types'

type Props = {
  params: Params
  presetId: string
  dirty: boolean
  onChange: (patch: Partial<Params>) => void
  onPreset: (id: string) => void
}

export function Controls({ params, presetId, dirty, onChange, onPreset }: Props) {
  const preset = PRESETS.find((item) => item.id === presetId)
  return (
    <aside className="controls">
      <div className="presets">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === presetId ? 'preset on' : 'preset'}
            aria-pressed={item.id === presetId}
            onClick={() => onPreset(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="blurb">{preset ? preset.blurb : 'Custom mix. The dish keeps whatever you just tuned.'}</p>
      {GROUPS.map((group) => (
        <fieldset key={group.id} className={`group ${group.id}`}>
          <legend>{group.title}</legend>
          <p>{group.hint}</p>
          {group.keys.map((key) =>
            key === 'seed' ? (
              <label key={key} className="slider">
                <span>
                  {LABELS[key]}
                  <strong>{params.seed}</strong>
                </span>
                <input
                  type="number"
                  min={RANGES.seed.min}
                  max={RANGES.seed.max}
                  step={1}
                  value={params.seed}
                  aria-label={LABELS[key]}
                  onChange={(event) => {
                    const next = Math.round(Number(event.target.value))
                    if (Number.isFinite(next)) onChange({ seed: next })
                  }}
                />
              </label>
            ) : (
              <label key={key} className="slider">
                <span>
                  {LABELS[key]}
                  <strong>{formatValue(key, params[key])}</strong>
                </span>
                <input
                  type="range"
                  min={RANGES[key].min}
                  max={RANGES[key].max}
                  step={RANGES[key].step}
                  value={params[key]}
                  aria-label={LABELS[key]}
                  onChange={(event) => onChange({ [key]: Number(event.target.value) })}
                />
              </label>
            ),
          )}
          {group.id === 'setup' && dirty ? <p className="dirty">Reset to plant this setup.</p> : null}
        </fieldset>
      ))}
    </aside>
  )
}
