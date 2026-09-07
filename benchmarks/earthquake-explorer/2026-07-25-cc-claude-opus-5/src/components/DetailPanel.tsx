import { useMemo } from 'react'
import type { Quake } from '../lib/usgs'
import { alertColor, colorFor, magnitudeColor, type ColorMode } from '../lib/color'
import * as fmt from '../lib/format'
import { Chip } from './ui'
import { cx } from '../lib/cx'

/** ShakeMap's intensity palette, used for the felt-shaking scale. */
const MMI_COLORS = [
  '#ffffff',
  '#bfccff',
  '#a0e6ff',
  '#80ffff',
  '#7dff56',
  '#ffff00',
  '#ffc800',
  '#ff9100',
  '#ff0000',
  '#c80000',
]

const ALERT_MEANING: Record<string, string> = {
  green: 'No significant losses expected',
  yellow: 'Local damage possible, limited casualties',
  orange: 'Significant damage and casualties likely',
  red: 'Extensive damage, high casualties likely',
}

function Row({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[5px]">
      <span className="text-[11px] whitespace-nowrap text-ink-faint" title={hint}>
        {label}
      </span>
      <span className="tabular truncate text-right text-[11.5px] font-medium text-ink-dim">
        {value}
      </span>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line-soft px-4 py-3">
      <h3 className="mb-1 text-[10px] font-semibold tracking-[0.09em] text-ink-faint uppercase">
        {title}
      </h3>
      {children}
    </div>
  )
}

interface DetailPanelProps {
  quake: Quake
  all: Quake[]
  colorMode: ColorMode
  now: number
  onClose: () => void
  onSelect: (id: string) => void
}

export function DetailPanel({
  quake,
  all,
  colorMode,
  now,
  onClose,
  onSelect,
}: DetailPanelProps) {
  const color = colorFor(colorMode, quake, now)
  const magColor = magnitudeColor(quake.mag)

  /** Other events close in space and time — usually fore/aftershocks. */
  const nearby = useMemo(() => {
    const WINDOW = 7 * 24 * 3600_000
    return all
      .filter(
        (q) =>
          q.id !== quake.id &&
          Math.abs(q.time - quake.time) <= WINDOW &&
          fmt.distanceKm(quake.lat, quake.lon, q.lat, q.lon) <= 250,
      )
      .map((q) => ({ quake: q, km: fmt.distanceKm(quake.lat, quake.lon, q.lat, q.lon) }))
      .sort((a, b) => b.quake.mag - a.quake.mag)
      .slice(0, 6)
  }, [all, quake])

  const mmi = quake.mmi ?? quake.cdi

  return (
    <div className="scroll-slim animate-fade-rise flex h-full flex-col overflow-y-auto bg-surface">
      <div className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
          <div
            className="tabular grid size-14 shrink-0 place-items-center rounded-xl text-xl font-semibold"
            style={{
              background: `${color}1c`,
              color,
              boxShadow: `inset 0 0 0 1px ${color}50, 0 0 26px ${color}22`,
            }}
          >
            {fmt.magnitude(quake.mag)}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[13px] leading-snug font-semibold text-ink">{quake.place}</p>
            <p className="tabular mt-1 text-[11px] text-ink-faint">
              {fmt.timeAgo(quake.time, now)} · {fmt.absoluteTime(quake.time)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quake.type !== 'earthquake' && (
                <Chip color="#a78bfa">{quake.type.replace(/_/g, ' ')}</Chip>
              )}
              {quake.alert && (
                <Chip color={alertColor(quake.alert)} title={ALERT_MEANING[quake.alert]}>
                  PAGER {quake.alert}
                </Chip>
              )}
              {quake.tsunami === 1 && <Chip color="#38bdf8">Tsunami evaluated</Chip>}
              <Chip color={quake.status === 'reviewed' ? '#34d399' : undefined}>
                {quake.status === 'reviewed' ? 'Reviewed' : 'Automatic'}
              </Chip>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-line text-ink-faint transition-colors hover:bg-hover hover:text-ink"
          >
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <Block title="Location">
        <Row label="Depth" value={fmt.depth(quake.depth)} />
        <Row
          label="Coordinates"
          value={`${fmt.coordinate(quake.lat, 'lat')}, ${fmt.coordinate(quake.lon, 'lon')}`}
        />
        <Row label="Origin time (UTC)" value={fmt.utcTime(quake.time)} />
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-ink-faint">
            <span>Surface</span>
            <span>700 km</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="absolute top-0 h-full w-[3px] rounded-full"
              style={{
                left: `${Math.min(99, (quake.depth / 700) * 100)}%`,
                background: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
          </div>
          <p className="mt-1 text-[10px] text-ink-faint">
            {quake.depth < 70
              ? 'Shallow — surface shaking is strongest for this depth class.'
              : quake.depth < 300
                ? 'Intermediate depth — shaking is spread over a wider area.'
                : 'Deep focus — rarely damaging, felt over long distances.'}
          </p>
        </div>
      </Block>

      <Block title="Energy">
        <Row label="Magnitude type" value={fmt.magTypeLabel(quake.magType)} />
        <Row label="Equivalent yield" value={fmt.formatTnt(quake.mag)} />
        <Row
          label="Significance"
          value={`${quake.sig} / 1000`}
          hint="USGS composite of magnitude, felt reports and estimated impact"
        />
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (quake.sig / 1000) * 100)}%`,
              background: magColor,
            }}
          />
        </div>
      </Block>

      {(mmi !== null || quake.felt !== null) && (
        <Block title="Felt & shaking">
          {quake.felt !== null && (
            <Row label="Felt reports" value={fmt.compactNumber(quake.felt)} />
          )}
          {quake.cdi !== null && (
            <Row
              label="Reported intensity"
              value={`${fmt.mercalli(quake.cdi)} (CDI ${quake.cdi.toFixed(1)})`}
              hint="Community Determined Intensity, from public reports"
            />
          )}
          {quake.mmi !== null && (
            <Row
              label="Estimated intensity"
              value={`${fmt.mercalli(quake.mmi)} (MMI ${quake.mmi.toFixed(1)})`}
              hint="Instrumental Modified Mercalli Intensity"
            />
          )}
          {mmi !== null && (
            <div className="mt-2">
              <div className="flex gap-px overflow-hidden rounded-[3px]">
                {MMI_COLORS.map((c, i) => {
                  const level = i + 1
                  const active = Math.round(mmi) >= level
                  return (
                    <span
                      key={level}
                      className={cx(
                        'h-2 flex-1 transition-opacity',
                        active ? 'opacity-100' : 'opacity-20',
                      )}
                      style={{ background: c }}
                    />
                  )
                })}
              </div>
              <div className="tabular mt-1 flex justify-between text-[9px] text-ink-faint">
                <span>I · not felt</span>
                <span>V · strong</span>
                <span>X+ · extreme</span>
              </div>
            </div>
          )}
        </Block>
      )}

      <Block title="Solution quality">
        <Row
          label="Stations used"
          value={quake.nst ?? '—'}
          hint="Number of seismic stations in the location solution"
        />
        <Row
          label="Azimuthal gap"
          value={quake.gap !== null ? `${quake.gap.toFixed(0)}°` : '—'}
          hint="Largest gap between stations; under 180° is a well-constrained epicentre"
        />
        <Row
          label="Nearest station"
          value={quake.dmin !== null ? `${(quake.dmin * 111.2).toFixed(0)} km` : '—'}
        />
        <Row label="Travel-time residual" value={quake.rms !== null ? `${quake.rms.toFixed(2)} s` : '—'} />
        {quake.gap !== null && (
          <p className="mt-1 text-[10px] leading-snug text-ink-faint">
            {quake.gap < 90
              ? 'Well constrained by surrounding stations.'
              : quake.gap < 180
                ? 'Reasonably constrained epicentre.'
                : 'Stations sit mostly on one side — the epicentre is less certain.'}
          </p>
        )}
      </Block>

      {nearby.length > 0 && (
        <Block title={`Nearby within 7 days (${nearby.length})`}>
          <ul className="-mx-1.5">
            {nearby.map(({ quake: q, km }) => {
              const c = magnitudeColor(q.mag)
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(q.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-raised"
                  >
                    <span
                      className="tabular w-8 shrink-0 rounded text-center text-[10.5px] font-semibold"
                      style={{ background: `${c}20`, color: c }}
                    >
                      {fmt.magnitude(q.mag)}
                    </span>
                    <span className="tabular min-w-0 flex-1 truncate text-[10.5px] text-ink-faint">
                      {km.toFixed(0)} km away · {fmt.timeAgo(q.time, now)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Block>
      )}

      <div className="mt-auto border-t border-line-soft p-4">
        <a
          href={quake.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-raised py-2 text-[11.5px] font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
        >
          Full USGS event page
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <path
              d="M4.5 2.5H9.5V7.5M9.5 2.5 3 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <p className="mt-2 text-center text-[9.5px] text-ink-faint">
          Event {quake.id} · {quake.net.toUpperCase()} network
        </p>
      </div>
    </div>
  )
}
