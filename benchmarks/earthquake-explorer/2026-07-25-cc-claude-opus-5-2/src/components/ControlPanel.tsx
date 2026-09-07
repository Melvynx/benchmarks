import { useEffect, useRef } from "react";

import { COLOR_MODES, RAMPS, rampGradient, type ColorMode } from "../lib/color";
import { DEPTH_RANGE, MAG_RANGE, activeFilterCount, type Filters } from "../lib/filters";
import { FEED_WINDOWS, type WindowId } from "../lib/usgs";
import { RangeSlider } from "./RangeSlider";

export interface ControlPanelProps {
  windowId: WindowId;
  onWindowChange: (id: WindowId) => void;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onReset: () => void;
  /** Number of events surviving the current filters. */
  resultCount: number;
  totalCount: number;
}

export function ControlPanel(props: ControlPanelProps) {
  const {
    windowId,
    onWindowChange,
    filters,
    onFiltersChange,
    colorMode,
    onColorModeChange,
    onReset,
    resultCount,
    totalCount,
  } = props;

  const searchRef = useRef<HTMLInputElement>(null);
  const activeCount = activeFilterCount(filters);

  // "/" focuses search, the way every list-and-map tool works.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const patch = (next: Partial<Filters>) => onFiltersChange({ ...filters, ...next });
  const activeWindow = FEED_WINDOWS.find((w) => w.id === windowId);

  return (
    <div className="controls">
      <section className="control-group">
        <div className="control-head">
          <h2 className="control-title">Time window</h2>
          {activeWindow?.note ? <span className="control-note">{activeWindow.note}</span> : null}
        </div>
        <div className="segmented" role="group" aria-label="Time window">
          {FEED_WINDOWS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`segment ${option.id === windowId ? "is-active" : ""}`}
              aria-pressed={option.id === windowId}
              onClick={() => onWindowChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="control-group">
        <div className="control-head">
          <h2 className="control-title">Colour by</h2>
        </div>
        <div className="mode-grid" role="group" aria-label="Colour encoding">
          {COLOR_MODES.map((ramp) => (
            <button
              key={ramp.id}
              type="button"
              className={`mode-card ${ramp.id === colorMode ? "is-active" : ""}`}
              aria-pressed={ramp.id === colorMode}
              onClick={() => onColorModeChange(ramp.id)}
            >
              <span className="mode-swatch" style={{ background: rampGradient(ramp) }} />
              <span className="mode-name">{ramp.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="control-group">
        <div className="control-head">
          <h2 className="control-title">Filters</h2>
          {activeCount > 0 ? (
            <button type="button" className="link-btn" onClick={onReset}>
              Reset{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          ) : null}
        </div>

        <div className="search-field">
          <SearchIcon />
          <input
            ref={searchRef}
            className="search-input"
            type="search"
            placeholder="Search a place…  ( / )"
            value={filters.search}
            aria-label="Search by place name"
            onChange={(e) => patch({ search: e.target.value })}
          />
          {filters.search ? (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => patch({ search: "" })}
            >
              ×
            </button>
          ) : null}
        </div>

        <RangeSlider
          label="Magnitude"
          min={MAG_RANGE[0]}
          max={MAG_RANGE[1]}
          step={0.1}
          value={[filters.minMag, filters.maxMag]}
          onChange={([minMag, maxMag]) => patch({ minMag, maxMag })}
          format={(v) => `M${v.toFixed(1)}`}
          trackBackground={rampGradient(RAMPS.magnitude)}
        />

        <RangeSlider
          label="Depth"
          min={DEPTH_RANGE[0]}
          max={DEPTH_RANGE[1]}
          step={5}
          value={[filters.minDepth, filters.maxDepth]}
          onChange={([minDepth, maxDepth]) => patch({ minDepth, maxDepth })}
          format={(v) => `${v} km`}
          trackBackground={rampGradient(RAMPS.depth)}
        />

        <div className="chips" role="group" aria-label="Quick filters">
          <Chip
            active={filters.significantOnly}
            onClick={() => patch({ significantOnly: !filters.significantOnly })}
            title="USGS significance score of 600 or more"
          >
            Significant
          </Chip>
          <Chip
            active={filters.feltOnly}
            onClick={() => patch({ feltOnly: !filters.feltOnly })}
            title="At least one “Did you feel it?” report"
          >
            Felt by people
          </Chip>
          <Chip
            active={filters.tsunamiOnly}
            onClick={() => patch({ tsunamiOnly: !filters.tsunamiOnly })}
            title="Event flagged for tsunami evaluation"
          >
            Tsunami flag
          </Chip>
          <Chip
            active={filters.tectonicOnly}
            onClick={() => patch({ tectonicOnly: !filters.tectonicOnly })}
            title="Exclude quarry blasts, explosions and other non-tectonic events"
          >
            Tectonic only
          </Chip>
          <Chip
            active={filters.viewportOnly}
            onClick={() => patch({ viewportOnly: !filters.viewportOnly })}
            title="Only list events inside the current map view"
          >
            In map view
          </Chip>
        </div>

        <p className="control-readout">
          <strong>{resultCount.toLocaleString()}</strong> of {totalCount.toLocaleString()} events
          match
        </p>
      </section>

    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`chip ${active ? "is-active" : ""}`}
      aria-pressed={active}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

