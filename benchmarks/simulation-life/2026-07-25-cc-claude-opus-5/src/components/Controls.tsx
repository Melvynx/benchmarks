import { PARAM_GROUPS, PRESETS, type ParamKey, type Params, type ParamSpec } from '../sim/params'

type Props = {
  params: Params
  running: boolean
  speed: number
  activePreset: string | null
  onParam: (key: ParamKey, value: number) => void
  onPreset: (id: string) => void
  onPlay: () => void
  onStep: () => void
  onReset: () => void
  onRandomize: () => void
  onSpeed: (v: number) => void
}

const SPEEDS = [0.5, 1, 2, 4, 8]

function fmt(spec: ParamSpec, value: number) {
  const text = spec.integer || spec.step >= 1 ? String(Math.round(value)) : value.toFixed(spec.step < 0.01 ? 3 : 2)
  return spec.unit ? `${text}${spec.unit}` : text
}

function Slider({ spec, value, onParam }: { spec: ParamSpec; value: number; onParam: Props['onParam'] }) {
  return (
    <label className="slider">
      <span className="slider-top">
        <span className="slider-label">
          {spec.label}
          {spec.setup && <span className="badge">on reset</span>}
        </span>
        <output className="slider-value">{fmt(spec, value)}</output>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onParam(spec.key, Number(e.target.value))}
      />
      <span className="slider-hint">{spec.hint}</span>
    </label>
  )
}

export function Controls(props: Props) {
  const { params, running, speed, activePreset } = props
  return (
    <div className="controls">
      <div className="panel transport">
        <div className="button-row">
          <button className="primary" onClick={props.onPlay} aria-pressed={running}>
            {running ? '❙❙ Pause' : '▶ Play'}
          </button>
          <button onClick={props.onStep} disabled={running} title="Advance one simulation step">
            ⇥ Step
          </button>
          <button onClick={props.onReset}>↺ Reset</button>
          <button onClick={props.onRandomize} title="New seed, same settings">
            🎲 Randomize
          </button>
        </div>
        <div className="speed-row" role="group" aria-label="Simulation speed">
          <span className="speed-label">Speed</span>
          {SPEEDS.map((s) => (
            <button key={s} className={`chip ${speed === s ? 'chip-on' : ''}`} onClick={() => props.onSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Presets</h3>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.id} className={`preset ${activePreset === p.id ? 'preset-on' : ''}`} onClick={() => props.onPreset(p.id)}>
              <span className="preset-name">{p.name}</span>
              <span className="preset-blurb">{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {PARAM_GROUPS.map((group) => (
        <div className="panel" key={group.title}>
          <h3 className="panel-title">
            {group.title}
            <span className="panel-caption">{group.caption}</span>
          </h3>
          <div className="slider-list">
            {group.specs.map((spec) => (
              <Slider key={spec.key} spec={spec} value={params[spec.key]} onParam={props.onParam} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
