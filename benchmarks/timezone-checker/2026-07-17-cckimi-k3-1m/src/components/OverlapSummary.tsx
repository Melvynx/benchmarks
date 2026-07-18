import type { GridData, Mode } from '../lib/overlap';
import { formatHourLabel, formatRange } from '../lib/time';
import { WarnIcon } from './Icons';

function MiniStrip({ flags, hour12 }: { flags: boolean[]; hour12: boolean }) {
  return (
    <div className="mini-strip" aria-hidden>
      {flags.map((f, i) => (
        <span key={i} className={f ? 'on' : ''} title={formatHourLabel(i, hour12)} />
      ))}
    </div>
  );
}

function nameList(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

interface Props {
  grid: GridData;
  mode: Mode;
  hour12: boolean;
}

/**
 * Overlap summary shown above the grid.
 * Meeting: one shared window for everyone. Base: one line per city vs. the reference.
 */
export function OverlapSummary({ grid, mode, hour12 }: Props) {
  if (mode === 'meeting') {
    const { meetingCount, meetingRanges, meetingFlags } = grid;
    return (
      <section
        className={`summary-band ${meetingCount > 0 ? 'is-ok' : 'is-warn'}`}
        aria-label="Overlap summary"
      >
        {meetingCount > 0 ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[30px] font-bold leading-none text-leaf">
                {meetingCount}
              </span>
              <span className="text-[13px] font-medium text-fog">
                shared {meetingCount === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            <MiniStrip flags={meetingFlags} hour12={hour12} />
            <div className="flex flex-wrap gap-1.5">
              {meetingRanges.map((r) => (
                <span key={r.start} className="range-badge">
                  {formatRange(r, hour12)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-warn">
              <WarnIcon size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-warn">No shared awake hours</p>
              <p className="mt-0.5 text-xs text-fog">
                With this awake window, everyone is never up at the same time. Widen the window
                or switch to Base mode to compare cities pairwise.
              </p>
            </div>
          </div>
        )}
        {meetingCount > 0 && (
          <p className="mt-2.5 text-[11px] text-fog/80">
            Everyone in {nameList(grid.rows.map((r) => r.city.name))} is awake at the same time ·
            ranges in {grid.refCity.name} time
          </p>
        )}
      </section>
    );
  }

  const anyOverlap = grid.rows.slice(1).some((row) => row.overlapCount > 0);
  return (
    <section
      className={`summary-band ${anyOverlap ? 'is-ok' : 'is-warn'}`}
      aria-label="Overlap summary"
    >
      <div className="space-y-2.5">
        {grid.rows.slice(1).map((row) => (
          <div key={row.city.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="w-32 truncate text-[13px] font-semibold">{row.city.name}</span>
            {row.overlapCount > 0 ? (
              <>
                <span className="w-8 font-mono text-sm font-bold text-leaf">
                  {row.overlapCount}h
                </span>
                <MiniStrip flags={row.overlapFlags} hour12={hour12} />
                <span className="flex flex-wrap gap-1.5">
                  {row.ranges.map((r) => (
                    <span key={r.start} className="range-badge">
                      {formatRange(r, hour12)}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <span className="warn-chip">
                <WarnIcon size={13} /> No overlap with {grid.refCity.name}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-fog/80">
        Each city compared independently against the reference, {grid.refCity.name} · ranges in{' '}
        {grid.refCity.name} time
      </p>
    </section>
  );
}
