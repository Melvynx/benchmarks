import { useMemo, useState } from 'react'
import type { Sample } from '../sim/history'
import { summarise } from '../sim/analysis'
import { TimelineChart, type Series } from './charts/TimelineChart'
import { PhasePlot } from './charts/PhasePlot'
import { TraitChart } from './charts/TraitChart'
import { seriesColor, SERIES_LABEL, type Mode, type SeriesKey } from '../theme'

type Props = {
  samples: Sample[]
  /** Changes whenever `samples` gains a row; see History.version. */
  samplesVersion: number
  mode: Mode
  fruitCapacity: number
  blueAlive: number
  redAlive: number
}

type View = 'chart' | 'table'

const KEYS: SeriesKey[] = ['fruit', 'blue', 'red']

function Legend({ mode, keys = KEYS }: { mode: Mode; keys?: SeriesKey[] }) {
  return (
    <div className="legend">
      {keys.map((k) => (
        <span key={k} className="legend-item">
          <span className="swatch" style={{ background: seriesColor(k, mode) }} />
          {SERIES_LABEL[k]}
        </span>
      ))}
    </div>
  )
}

function Table({ samples, mode }: { samples: Sample[]; mode: Mode }) {
  // Thin to a readable number of rows — the chart is the detailed view.
  const stride = Math.max(1, Math.ceil(samples.length / 40))
  const rows = samples.filter((_, i) => i % stride === 0)
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Time</th>
            {KEYS.map((k) => (
              <th key={k} scope="col">
                <span className="swatch" style={{ background: seriesColor(k, mode) }} />
                {SERIES_LABEL[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.t}>
              <td>{s.t.toFixed(0)}s</td>
              <td>{s.fruit}</td>
              <td>{s.blue}</td>
              <td>{s.red}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChartsPanel({ samples, samplesVersion, mode, fruitCapacity, blueAlive, redAlive }: Props) {
  const [view, setView] = useState<View>('chart')
  const [indexed, setIndexed] = useState(false)

  const series: Series[] = useMemo(
    () => [
      { key: 'fruit', values: samples.map((s) => s.fruit) },
      { key: 'blue', values: samples.map((s) => s.blue) },
      { key: 'red', values: samples.map((s) => s.red) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- samples is appended in place; samplesVersion is the real signal.
    [samples, samplesVersion],
  )

  const summary = useMemo(
    () => summarise({ samples, fruitCapacity, blueAlive, redAlive }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above.
    [samples, samplesVersion, fruitCapacity, blueAlive, redAlive],
  )

  // When one series dwarfs the others the raw counts stop being readable, so
  // point at the indexed view rather than silently rescaling behind the user.
  const spread = useMemo(() => {
    const peaks = series.map((s) => Math.max(1, ...s.values))
    return Math.max(...peaks) / Math.max(1, Math.min(...peaks))
  }, [series])

  return (
    <div className="charts">
      <div className="panel">
        <h3 className="panel-title">
          Populations over time
          <span className="view-toggle">
            <button className={`chip ${!indexed ? 'chip-on' : ''}`} onClick={() => setIndexed(false)}>
              Counts
            </button>
            <button className={`chip ${indexed ? 'chip-on' : ''}`} onClick={() => setIndexed(true)}>
              Share of peak
            </button>
            <button className={`chip ${view === 'table' ? 'chip-on' : ''}`} onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
              Table
            </button>
          </span>
        </h3>
        <Legend mode={mode} />
        {view === 'chart' ? (
          <TimelineChart
            samples={samples}
            series={series}
            mode={mode}
            indexed={indexed}
            yLabel={indexed ? 'Share of each groups own peak' : 'Count'}
          />
        ) : (
          <Table samples={samples} mode={mode} />
        )}
        {!indexed && spread > 6 && view === 'chart' && (
          <p className="note">
            Fruit and the blob groups are on very different scales right now. <button className="link" onClick={() => setIndexed(true)}>Share of peak</button> puts
            them side by side.
          </p>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">What happened</h3>
        <p className={`headline tone-${summary.tone}`}>{summary.headline}</p>
        <ul className="notes">
          {summary.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>

      <div className="panel-pair">
        <div className="panel">
          <h3 className="panel-title">
            Blue against red
            <span className="panel-caption">loops mean the two are chasing each other</span>
          </h3>
          <PhasePlot samples={samples} samplesVersion={samplesVersion} mode={mode} />
        </div>
        <div className="panel">
          <h3 className="panel-title">
            Inherited traits
            <span className="panel-caption">average of each group, 1.0 is the starting stock</span>
          </h3>
          <TraitChart samples={samples} mode={mode} />
          <Legend mode={mode} keys={['blue', 'red']} />
        </div>
      </div>
    </div>
  )
}
