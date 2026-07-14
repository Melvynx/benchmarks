import type { EarthquakeEvent } from "../types/earthquake";
import { assessActivity, strongestEvent } from "../lib/assessment";
import { MagnitudeBadge } from "./MagnitudeBadge";
import { formatRelativeTime } from "../lib/format";

const LEVEL_DOT: Record<string, string> = {
  quiet: "bg-ink-500",
  ordinary: "bg-alert-green",
  notable: "bg-alert-yellow",
  concerning: "bg-alert-red",
};

export interface StoryStripProps {
  events: EarthquakeEvent[];
  rangeLabel: string;
  nowMs: number;
  onFocusStrongest: (id: string) => void;
}

export function StoryStrip({ events, rangeLabel, nowMs, onFocusStrongest }: StoryStripProps) {
  const assessment = assessActivity(events);
  const strongest = strongestEvent(events);
  const majorCount = events.filter((e) => (e.magnitude ?? 0) >= 4.5).length;
  const alertCount = events.filter((e) => e.alert !== null).length;

  return (
    <div className="flex flex-col gap-3 border-b border-ink-800 bg-ink-900/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_DOT[assessment.level]}`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink-50">
            {assessment.label} <span className="font-normal text-ink-400">— {rangeLabel}</span>
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-300">
            {assessment.description}{" "}
            {events.length > 0 && (
              <>
                <span className="tnum">{events.length.toLocaleString()}</span> event{events.length === 1 ? "" : "s"} recorded
                {majorCount > 0 && (
                  <>
                    {" "}
                    · <span className="tnum">{majorCount}</span> at M4.5+
                  </>
                )}
                {alertCount > 0 && (
                  <>
                    {" "}
                    · <span className="tnum">{alertCount}</span> with an impact alert
                  </>
                )}
                .
              </>
            )}
          </p>
        </div>
      </div>

      {strongest && (
        <button
          type="button"
          onClick={() => onFocusStrongest(strongest.id)}
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg border border-ink-700 bg-ink-850 px-3 py-1.5 text-left hover:border-accent"
        >
          <MagnitudeBadge magnitude={strongest.magnitude} size="sm" />
          <span className="min-w-0">
            <span className="block max-w-[220px] truncate text-[12.5px] font-medium text-ink-50">Strongest: {strongest.place}</span>
            <span className="block text-[11px] text-ink-400">{formatRelativeTime(strongest.timeMs, nowMs)}</span>
          </span>
        </button>
      )}
    </div>
  );
}
