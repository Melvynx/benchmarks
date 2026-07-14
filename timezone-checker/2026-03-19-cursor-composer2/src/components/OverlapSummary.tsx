import {
  baseOverlapHours,
  hoursToRanges,
  meetingOverlapHours,
  type AppMode,
} from '../lib/gridModel'
import { formatHourRange } from '../lib/formatHour'
import type { City } from '../data/cities'
import styles from './OverlapSummary.module.css'

interface Props {
  cities: City[]
  mode: AppMode
  wakeHour: number
  sleepHour: number
  use24h: boolean
  refCityName: string
}

export function OverlapSummary({
  cities,
  mode,
  wakeHour,
  sleepHour,
  use24h,
  refCityName,
}: Props) {
  if (cities.length < 2) return null

  if (mode === 'meeting') {
    const hours = meetingOverlapHours(cities, wakeHour, sleepHour)
    const ranges = hoursToRanges(hours)
    return (
      <div className={styles.card} role="status">
        <div className={styles.title}>Meeting overlap</div>
        {hours.length === 0 ? (
          <p className={styles.warn}>No shared awake hours today — adjust cities or your awake window.</p>
        ) : (
          <>
            <p className={styles.count}>
              <strong>{hours.length}</strong> hour{hours.length === 1 ? '' : 's'} in {refCityName} when everyone is awake
            </p>
            <ul className={styles.badges}>
              {ranges.map(([a, b]) => (
                <li key={`${a}-${b}`} className={styles.badge}>
                  {formatHourRange(a, b, use24h)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  const perCity = baseOverlapHours(cities, wakeHour, sleepHour)
  return (
    <div className={styles.card} role="status">
      <div className={styles.title}>Overlap vs {refCityName}</div>
      <ul className={styles.list}>
        {cities.slice(1).map((c) => {
          const hours = perCity.get(c.id) ?? []
          const ranges = hoursToRanges(hours)
          return (
            <li key={c.id} className={styles.row}>
              <span className={styles.city}>{c.name}</span>
              {hours.length === 0 ? (
                <span className={styles.warnInline}>No overlap today</span>
              ) : (
                <>
                  <span className={styles.countInline}>
                    {hours.length}h
                  </span>
                  <span className={styles.badgeRow}>
                    {ranges.map(([a, b]) => (
                      <span key={`${a}-${b}`} className={styles.badge}>
                        {formatHourRange(a, b, use24h)}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
