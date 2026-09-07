import { useState } from 'react'
import { COLOR_MODE_META, LEGENDS, rampGradient, type ColorMode } from '../lib/color'
import { cx } from '../lib/cx'

const MAG_SIZES = [
  { mag: 2, size: 5 },
  { mag: 4, size: 9 },
  { mag: 6, size: 15 },
  { mag: 7.5, size: 22 },
]

export function Legend({ mode }: { mode: ColorMode }) {
  // On a phone the expanded key would cover half the map, so it starts folded.
  const [open, setOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768,
  )
  const meta = COLOR_MODE_META[mode]
  const entries = LEGENDS[mode]

  return (
    <div className="w-[13.5rem] overflow-hidden rounded-xl border border-line bg-void/85 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-raised/60"
      >
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold text-ink">
            {meta.title}
          </span>
          <span className="block text-[10px] text-ink-faint">Colour key</span>
        </span>
        <svg
          viewBox="0 0 12 12"
          className={cx(
            'size-3 shrink-0 text-ink-faint transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line-soft px-3 pt-2.5 pb-3">
          {mode !== 'alert' && (
            <div
              className="mb-2.5 h-1.5 w-full rounded-full"
              style={{ background: rampGradient(mode) }}
              aria-hidden
            />
          )}

          <ul className="space-y-[3px]">
            {entries.map((entry) => (
              <li key={entry.label} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: entry.color, boxShadow: `0 0 7px ${entry.color}80` }}
                  aria-hidden
                />
                <span className="tabular w-[4.6rem] shrink-0 text-[10.5px] font-medium text-ink-dim">
                  {entry.label}
                </span>
                {entry.note && (
                  <span className="truncate text-[10px] text-ink-faint">{entry.note}</span>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-2.5 border-t border-line-soft pt-2 text-[10px] leading-snug text-ink-faint">
            {meta.caption}
          </p>

          <div className="mt-2.5 border-t border-line-soft pt-2.5">
            <p className="mb-1.5 text-[10px] font-medium text-ink-faint">
              Point size = magnitude
            </p>
            <div className="flex items-end justify-between px-1">
              {MAG_SIZES.map(({ mag, size }) => (
                <span key={mag} className="flex flex-col items-center gap-1">
                  <span
                    className="rounded-full border border-white/40 bg-white/15"
                    style={{ width: size, height: size }}
                    aria-hidden
                  />
                  <span className="tabular text-[9px] text-ink-faint">M{mag}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
