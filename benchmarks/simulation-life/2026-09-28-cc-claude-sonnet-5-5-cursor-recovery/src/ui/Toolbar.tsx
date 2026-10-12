import { SPEEDS } from '../sim/runner'

interface Props {
  playing: boolean
  speed: number
  onToggle: () => void
  onStep: () => void
  onReset: () => void
  onRandomize: () => void
  onSpeed: (s: number) => void
}

export function Toolbar({ playing, speed, onToggle, onStep, onReset, onRandomize, onSpeed }: Props) {
  const idx = Math.max(0, SPEEDS.indexOf(speed))
  return (
    <div className="toolbar" role="toolbar" aria-label="Simulation controls">
      <button type="button" className={`btn primary${playing ? ' playing' : ''}`} onClick={onToggle} aria-pressed={playing} title="Play or pause (Space)">
        <span className="ico" aria-hidden="true">
          {playing ? '❚❚' : '▶'}
        </span>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" className="btn" onClick={onStep} title="Advance one second of garden time (S)">
        <span className="ico" aria-hidden="true">
          ⏭
        </span>
        Step
      </button>
      <button type="button" className="btn" onClick={onReset} title="Restart this world from its seed (R)">
        <span className="ico" aria-hidden="true">
          ↺
        </span>
        Reset
      </button>
      <button type="button" className="btn" onClick={onRandomize} title="New seed with jiggled rules (N)">
        <span className="ico" aria-hidden="true">
          🎲
        </span>
        Randomize
      </button>
      <div className="speed">
        <label htmlFor="sim-speed">Speed</label>
        <input
          id="sim-speed"
          type="range"
          min={0}
          max={SPEEDS.length - 1}
          step={1}
          value={idx}
          style={{ ['--pct' as string]: `${(idx / (SPEEDS.length - 1)) * 100}%` }}
          onChange={(e) => onSpeed(SPEEDS[Number(e.target.value)])}
        />
        <output htmlFor="sim-speed">{speed}×</output>
      </div>
    </div>
  )
}
