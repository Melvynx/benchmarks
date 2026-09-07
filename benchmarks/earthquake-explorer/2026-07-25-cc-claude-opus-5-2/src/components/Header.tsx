import { quakeColor, type ColorMode } from "../lib/color";
import { magnitudeLabel, relativeTime, splitPlace } from "../lib/format";
import type { Stats } from "../lib/filters";
import type { FeedStatus } from "../hooks/useEarthquakes";
import type { Quake } from "../lib/usgs";

export interface HeaderProps {
  stats: Stats;
  status: FeedStatus;
  refreshing: boolean;
  lastLoadedAt: number | null;
  now: number;
  colorMode: ColorMode;
  windowLabel: string;
  onRefresh: () => void;
  onSelect: (quake: Quake) => void;
  /** Mobile only: opens the filter drawer. */
  onOpenControls?: () => void;
  activeFilters: number;
}

export function Header({
  stats,
  status,
  refreshing,
  lastLoadedAt,
  now,
  colorMode,
  windowLabel,
  onRefresh,
  onSelect,
  onOpenControls,
  activeFilters,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-identity">
        <Seismo />
        <h1 className="header-title">Claude Opus 5</h1>
      </div>

      <div className="header-stats">
        <Stat label={`Events · ${windowLabel}`} value={stats.count.toLocaleString()} />
        {stats.strongest ? (
          <Stat
            label="Strongest"
            value={`M ${magnitudeLabel(stats.strongest.mag)}`}
            detail={splitPlace(stats.strongest.place).region}
            color={quakeColor(colorMode, stats.strongest, now)}
            onClick={() => stats.strongest && onSelect(stats.strongest)}
          />
        ) : null}
        {stats.latest ? (
          <Stat
            label="Most recent"
            value={relativeTime(stats.latest.time, now)}
            detail={splitPlace(stats.latest.place).region}
            color={quakeColor(colorMode, stats.latest, now)}
            onClick={() => stats.latest && onSelect(stats.latest)}
          />
        ) : null}
        <Stat
          label="Felt by people"
          value={stats.feltCount.toLocaleString()}
          detail={stats.significantCount > 0 ? `${stats.significantCount} significant` : undefined}
        />
      </div>

      <div className="header-side">
        {onOpenControls ? (
          <button type="button" className="btn btn-ghost header-filters" onClick={onOpenControls}>
            Filters
            {activeFilters > 0 ? <span className="badge">{activeFilters}</span> : null}
          </button>
        ) : null}

        <div className={`live ${status === "error" ? "is-error" : ""}`}>
          <span className={`live-dot ${refreshing ? "is-busy" : ""}`} aria-hidden="true" />
          <span className="live-text">
            <span className="live-label">
              {status === "error" ? "Feed offline" : refreshing ? "Syncing" : "Live"}
            </span>
            <span className="live-time">
              {lastLoadedAt ? `updated ${relativeTime(lastLoadedAt, now)}` : "connecting…"}
            </span>
          </span>
        </div>

        <button
          type="button"
          className="icon-btn icon-btn-lg"
          onClick={onRefresh}
          aria-label="Refresh the feed now"
          title="Refresh now"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className={refreshing ? "is-spinning" : ""}>
            <path
              d="M13.5 8a5.5 5.5 0 1 1-1.7-3.97"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M13.6 1.9v3.1h-3.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  detail,
  color,
  onClick,
}: {
  label: string;
  value: string;
  detail?: string;
  color?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>
        {value}
      </span>
      {detail ? <span className="stat-detail">{detail}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="stat stat-clickable" onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className="stat">{content}</div>;
}

/** A three-cycle seismogram trace, drawn once and animated with CSS. */
function Seismo() {
  return (
    <svg className="seismo" viewBox="0 0 44 24" aria-hidden="true">
      <path
        d="M0 12h6l2.5-7 3 14 3-18 3 22 3-13 2.5 5H44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
