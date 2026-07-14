import { formatHourLabel } from '../lib/formatHour'
import { utcOffsetLabel, type GridRowModel } from '../lib/gridModel'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './ScheduleGrid.module.css'

interface Props {
  rows: GridRowModel[]
  use24h: boolean
  isReference: (cityId: string) => boolean
  onPromote: (cityId: string) => void
  onRemove: (cityId: string) => void
}

export function ScheduleGrid(props: Props) {
  const desktop = useMediaQuery('(min-width: 768px)')
  return desktop ? <DesktopGrid {...props} /> : <MobileGrid {...props} />
}

function cellClass(c: { sleeping: boolean; overlap: boolean }): string {
  if (c.sleeping) return styles.cellSleep
  if (c.overlap) return styles.cellOverlap
  return styles.cellAwake
}

function DesktopGrid({ rows, use24h, isReference, onPromote, onRemove }: Props) {
  if (rows.length === 0) return null
  return (
    <div className={styles.desktopWrap}>
      <div
        className={styles.desktopGrid}
        style={{ gridTemplateColumns: `minmax(168px, 220px) repeat(24, minmax(0, 1fr)) 44px` }}
      >
        <div className={styles.cornerHead}>
          <span className={styles.cornerTitle}>Local time when it’s…</span>
          <span className={styles.cornerSub}>(reference day)</span>
        </div>
        {Array.from({ length: 24 }, (_, refH) => (
          <div key={refH} className={styles.hourHead}>
            {formatHourLabel(refH, use24h)}
          </div>
        ))}
        <div className={styles.removeHead} aria-hidden />

        {rows.map(({ city, cells }) => (
          <div key={city.id} className={styles.rowContents}>
            <div className={styles.cityInfo}>
              <div className={styles.cityTitleRow}>
                <button
                  type="button"
                  className={styles.cityNameBtn}
                  onClick={() => onPromote(city.id)}
                  title="Set as reference (move to top)"
                >
                  {city.name}
                </button>
                {isReference(city.id) && (
                  <span className={styles.refBadge} aria-label="Reference city">
                    REF
                  </span>
                )}
              </div>
              <div className={styles.cityMeta}>
                {city.country} · UTC{utcOffsetLabel(city.timeZone)}
              </div>
            </div>
            {cells.map((cell, refH) => (
              <div
                key={refH}
                className={`${styles.cell} ${cellClass(cell)}`}
                title={`${city.name}: ${formatHourLabel(cell.localHour, use24h)} local`}
              >
                <span className={styles.cellInner}>{formatHourLabel(cell.localHour, use24h)}</span>
              </div>
            ))}
            <div className={styles.removeCell}>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(city.id)}
                aria-label={`Remove ${city.name}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileGrid({ rows, use24h, isReference, onPromote, onRemove }: Props) {
  if (rows.length === 0) return null
  const n = rows.length
  return (
    <div className={styles.mobileWrap}>
      <div
        className={styles.mobileGrid}
        style={{
          gridTemplateColumns: `3rem repeat(${n}, minmax(0, 1fr)) 2.25rem`,
        }}
      >
        <div className={styles.rowContents}>
        <div className={styles.mCorner} />
        {rows.map(({ city }) => (
          <div key={`h-${city.id}`} className={styles.mCityHead}>
            <button
              type="button"
              className={styles.mCityBtn}
              onClick={() => onPromote(city.id)}
            >
              <span className={styles.mCityShort}>{shortName(city.name)}</span>
              {isReference(city.id) && <span className={styles.mRef}>REF</span>}
            </button>
            <span className={styles.mOffset}>UTC{utcOffsetLabel(city.timeZone)}</span>
          </div>
        ))}
        <div className={styles.mRmHead} aria-hidden />
        </div>

        {Array.from({ length: 24 }, (_, refH) => (
          <div key={refH} className={styles.rowContents}>
            <div className={styles.mRefHour}>{formatHourLabel(refH, use24h)}</div>
            {rows.map(({ city, cells }) => (
              <div
                key={city.id}
                className={`${styles.cell} ${styles.mCell} ${cellClass(cells[refH])}`}
                title={`${city.name} @ ref ${formatHourLabel(refH, use24h)}: ${formatHourLabel(cells[refH].localHour, use24h)} local`}
              >
                <span className={styles.cellInner}>
                  {formatHourLabel(cells[refH].localHour, use24h)}
                </span>
              </div>
            ))}
            <div className={styles.mRmSpacer} />
          </div>
        ))}

        <div className={`${styles.rowContents} ${styles.mFootRow}`}>
          <div className={styles.mFooterCorner} />
          {rows.map(({ city }) => (
            <div key={city.id} className={styles.mFooter}>
              <button
                type="button"
                className={styles.mRemoveFoot}
                onClick={() => onRemove(city.id)}
                aria-label={`Remove ${city.name}`}
              >
                Remove
              </button>
            </div>
          ))}
          <div className={styles.mFooterEnd} />
        </div>
      </div>
    </div>
  )
}

function shortName(name: string) {
  const parts = name.split(' ')
  if (parts.length === 1) return name.slice(0, 10)
  return `${parts[0][0]}. ${parts.at(-1)}`.slice(0, 12)
}
