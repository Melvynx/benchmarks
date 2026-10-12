import type { Story } from '../sim/analysis.ts'
import type { Totals } from '../sim/world.ts'
import { clock } from './chart.ts'

const MOOD: Record<Story['mood'], { label: string; tone: string }> = {
  early: { label: 'Just started', tone: 'neutral' },
  balanced: { label: 'Balanced', tone: 'good' },
  booming: { label: 'Booming', tone: 'good' },
  small: { label: 'Small garden', tone: 'calm' },
  faded: { label: 'One group faded', tone: 'warn' },
  empty: { label: 'Empty', tone: 'bad' },
  settled: { label: 'Settling', tone: 'neutral' },
}

export function Summary({ story, totals, counts, ripe, capacity }: { story: Story; totals: Totals; counts: [number, number]; ripe: number; capacity: number }) {
  const m = MOOD[story.mood]
  return (
    <div className="card summary">
      <div className="card-head">
        <div>
          <h3>Run summary</h3>
          <p className="sub">Written from the recorded history, updated live.</p>
        </div>
        <span className={`mood ${m.tone}`}>{m.label}</span>
      </div>
      <p className="headline">{story.headline}</p>
      <ul className="story">
        {story.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <dl className="stats">
        <div>
          <dt>Garden time</dt>
          <dd>{clock(story.duration)}</dd>
        </div>
        <div>
          <dt>Now</dt>
          <dd>
            <span className="c-blue">{counts[0]}</span> · <span className="c-red">{counts[1]}</span> · <span className="c-fruit">{ripe}</span>
            <small>/{capacity}</small>
          </dd>
        </div>
        <div>
          <dt>Peak blue</dt>
          <dd>
            <span className="c-blue">{story.peakBlue.n}</span> <small>at {clock(story.peakBlue.t)}</small>
          </dd>
        </div>
        <div>
          <dt>Peak red</dt>
          <dd>
            <span className="c-red">{story.peakRed.n}</span> <small>at {clock(story.peakRed.t)}</small>
          </dd>
        </div>
        <div>
          <dt>Copies made</dt>
          <dd>
            <span className="c-blue">{totals.births[0]}</span> · <span className="c-red">{totals.births[1]}</span>
          </dd>
        </div>
        <div>
          <dt>Fruit eaten · boops</dt>
          <dd>
            {totals.fruitEaten} · {totals.contacts}
          </dd>
        </div>
        <div>
          <dt>Blue fades</dt>
          <dd>
            <small>
              {totals.fadesByBoop} booped · {totals.fadesByHunger[0]} hungry · {totals.fadesByAge[0]} old
            </small>
          </dd>
        </div>
        <div>
          <dt>Red fades</dt>
          <dd>
            <small>
              {totals.fadesByHunger[1]} hungry · {totals.fadesByAge[1]} old
            </small>
          </dd>
        </div>
      </dl>
    </div>
  )
}
