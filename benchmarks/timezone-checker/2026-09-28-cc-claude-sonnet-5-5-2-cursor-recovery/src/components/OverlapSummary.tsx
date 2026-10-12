import type { CityView } from '../hooks/useBoard'
import type { HourRange, OverlapSummary as Summary } from '../lib/overlap'
import { HOURS_PER_DAY } from '../lib/overlap'
import { formatHour } from '../lib/time'
import type { Mode, TimeFormat } from '../types'
import { CheckIcon, WarningIcon } from './Icons'
import styles from './OverlapSummary.module.css'

interface Props {
  mode: Mode
  views: CityView[]
  summaries: Summary[]
  format: TimeFormat
}

const pluralHours = (count: number) => `${count} ${count === 1 ? 'hour' : 'hours'}`

function RangeBadge({ range, format }: { range: HourRange; format: TimeFormat }) {
  const wraps = range.hours < HOURS_PER_DAY && range.end <= range.start
  const label =
    range.hours === HOURS_PER_DAY
      ? 'All day'
      : `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`
  return (
    <li
      className={styles.badge}
      data-testid="overlap-range"
      title={`${pluralHours(range.hours)}${wraps ? ', continues into the next day' : ''}`}
    >
      {label}
    </li>
  )
}

function Ranges({ ranges, format }: { ranges: HourRange[]; format: TimeFormat }) {
  return (
    <ul className={styles.badges} aria-label="Overlap windows">
      {ranges.map((range) => (
        <RangeBadge key={range.start} range={range} format={format} />
      ))}
    </ul>
  )
}

export function OverlapSummary({ mode, views, summaries, format }: Props) {
  if (views.length < 2) {
    return (
      <p className={styles.note}>
        {views.length === 0
          ? 'Add a city to get started.'
          : 'Add another city to see when your schedules overlap.'}
      </p>
    )
  }

  const reference = views[0].city.name

  if (mode === 'meeting') {
    const summary = summaries[0]
    if (!summary) return null

    if (summary.hours === 0) {
      return (
        <section className={`${styles.card} ${styles.warning}`} data-testid="overlap-summary" aria-label="Overlap summary">
          <WarningIcon className={styles.icon} size={20} />
          <div className={styles.body}>
            <p className={styles.headline}>No overlap</p>
            <p className={styles.detail}>
              There is no hour when every city is awake. Widen the awake window or remove a city.
            </p>
          </div>
        </section>
      )
    }

    return (
      <section className={`${styles.card} ${styles.success}`} data-testid="overlap-summary" aria-label="Overlap summary">
        <CheckIcon className={styles.icon} size={20} />
        <div className={styles.body}>
          <p className={styles.headline}>
            {pluralHours(summary.hours)} <span className={styles.headlineMuted}>when everyone is awake</span>
          </p>
          <Ranges ranges={summary.ranges} format={format} />
          <p className={styles.detail}>Times in {reference} (reference city).</p>
        </div>
      </section>
    )
  }

  return (
    <section className={`${styles.card} ${styles.column}`} data-testid="overlap-summary" aria-label="Overlap summary">
      <p className={styles.headline}>
        Overlap with {reference} <span className={styles.headlineMuted}>(reference city)</span>
      </p>
      <ul className={styles.lines}>
        {views.slice(1).map((view, index) => {
          const summary = summaries[index]
          if (!summary) return null
          return (
            <li key={view.city.id} className={styles.line} data-testid="overlap-line">
              <span className={styles.lineCity}>{view.city.name}</span>
              {summary.hours === 0 ? (
                <span className={styles.lineWarning}>
                  <WarningIcon size={14} />
                  No overlap with {reference}
                </span>
              ) : (
                <>
                  <span className={styles.lineCount}>{pluralHours(summary.hours)}</span>
                  <Ranges ranges={summary.ranges} format={format} />
                </>
              )}
            </li>
          )
        })}
      </ul>
      <p className={styles.detail}>Times in {reference}.</p>
    </section>
  )
}
