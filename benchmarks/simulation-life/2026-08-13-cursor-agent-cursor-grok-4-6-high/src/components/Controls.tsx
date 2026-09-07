import { PARAM_GROUPS, type ParamKey, type Params } from '../sim/params'

type Props = {
  params: Params
  onParam: (key: ParamKey, value: number) => void
}

export function Controls({ params, onParam }: Props) {
  return (
    <div className="controls">
      {PARAM_GROUPS.map((group) => (
        <section key={group.title} className="control-group">
          <h2>{group.title}</h2>
          <p className="caption">{group.caption}</p>
          {group.specs.map((spec) => {
            const value = params[spec.key]
            return (
              <label key={spec.key} className="knob" title={spec.hint}>
                <span className="knob-row">
                  <span>{spec.label}</span>
                  <span className="knob-value">
                    {formatValue(value, spec.step)}
                    {spec.unit ?? ''}
                  </span>
                </span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  aria-label={spec.label}
                  onChange={(e) => onParam(spec.key, Number(e.target.value))}
                />
              </label>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function formatValue(value: number, step: number) {
  if (step >= 1) return String(Math.round(value))
  const digits = step < 0.01 ? 3 : 2
  return value.toFixed(digits)
}
