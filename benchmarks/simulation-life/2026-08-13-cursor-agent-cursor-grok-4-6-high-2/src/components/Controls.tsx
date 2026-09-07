import { useSyncExternalStore } from 'react'
import { Engine } from '../sim/engine'
import { isSetupParam, PARAM_GROUPS, PRESETS, randomizeParams, type ParamKey } from '../sim/params'

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8]

type Props = {
  engine: Engine
}

export function Controls({ engine }: Props) {
  useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const p = engine.params

  return (
    <aside className="controls">
      <div className="transport">
        <button type="button" className={engine.running ? 'on' : ''} onClick={() => engine.setRunning(true)}>
          Play
        </button>
        <button type="button" className={!engine.running ? 'on' : ''} onClick={() => engine.setRunning(false)}>
          Pause
        </button>
        <button
          type="button"
          onClick={() => {
            engine.setRunning(false)
            engine.stepOnce()
          }}
        >
          Step
        </button>
        <button type="button" onClick={() => engine.reset(engine.params)}>
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            const next = randomizeParams((Date.now() ^ engine.params.seed) >>> 0)
            engine.presetId = 'custom'
            engine.reset(next)
          }}
        >
          Randomize
        </button>
      </div>

      <label className="speed">
        <span>Simulation speed</span>
        <select
          value={engine.speed}
          onChange={(e) => engine.setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>

      <div className="presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={engine.presetId === preset.id ? 'on' : ''}
            title={preset.blurb}
            onClick={() => {
              engine.presetId = preset.id
              engine.reset(preset.params)
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="knobs">
        {PARAM_GROUPS.map((group) => (
          <section key={group.title}>
            <header>
              <h2>{group.title}</h2>
              <p>{group.caption}</p>
            </header>
            {group.specs.map((spec) => (
              <Knob
                key={spec.key}
                spec={spec}
                value={p[spec.key]}
                onChange={(v) => {
                  engine.presetId = 'custom'
                  engine.setParam(spec.key, v)
                }}
              />
            ))}
          </section>
        ))}
      </div>
    </aside>
  )
}

function Knob({
  spec,
  value,
  onChange,
}: {
  spec: (typeof PARAM_GROUPS)[number]['specs'][number]
  value: number
  onChange: (v: number) => void
}) {
  const shown = spec.integer ? String(Math.round(value)) : value.toFixed(spec.step < 0.1 ? 2 : spec.step < 1 ? 1 : 0)
  return (
    <label className="knob" title={spec.hint}>
      <span className="knob-top">
        <span>
          {spec.label}
          {isSetupParam(spec.key as ParamKey) ? <em> reset</em> : null}
        </span>
        <span className="knob-val">
          {shown}
          {spec.unit ?? ''}
        </span>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
