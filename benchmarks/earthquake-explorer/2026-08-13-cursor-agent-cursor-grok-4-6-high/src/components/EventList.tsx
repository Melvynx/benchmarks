import { quakeColor } from "../lib/color";
import { formatMag, formatWhen, splitPlace } from "../lib/format";
import type { ColorMode, Quake, SortKey } from "../lib/types";

type Props = {
  quakes: Quake[];
  total: number;
  selectedId: string | null;
  sort: SortKey;
  colorMode: ColorMode;
  now: number;
  onSort: (sort: SortKey) => void;
  onSelect: (id: string) => void;
};

const LIST_CAP = 180;

export function EventList({
  quakes,
  total,
  selectedId,
  sort,
  colorMode,
  now,
  onSort,
  onSelect,
}: Props) {
  const shown = quakes.slice(0, LIST_CAP);

  return (
    <section className="list-panel" aria-label="Earthquake list">
      <div className="list-head">
        <h2>
          {total === 0 ? "No events" : `${total.toLocaleString()} events`}
        </h2>
        <label className="sort">
          <span className="sr-only">Sort events</span>
          <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            <option value="recent">Newest</option>
            <option value="strongest">Strongest</option>
            <option value="felt">Most felt</option>
            <option value="nearest">Nearest</option>
          </select>
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="empty">
          No earthquakes match these filters. Lower the magnitude floor, clear the place
          search, or widen the time window.
        </p>
      ) : (
        <ul className="quake-list">
          {shown.map((quake) => {
            const { offset, region } = splitPlace(quake.place);
            const color = quakeColor(quake, colorMode);
            const selected = quake.id === selectedId;
            return (
              <li key={quake.id}>
                <button
                  type="button"
                  className={selected ? "quake-row is-selected" : "quake-row"}
                  onClick={() => onSelect(quake.id)}
                  aria-current={selected}
                >
                  <span
                    className="mag-pill"
                    style={{ background: color, color: magText(color) }}
                  >
                    {formatMag(quake.mag)}
                  </span>
                  <span className="quake-copy">
                    <span className="quake-place">
                      {offset ? <span className="offset">{offset} </span> : null}
                      {region}
                    </span>
                    <span className="quake-meta">
                      {formatWhen(quake.time, now)}
                      {quake.tsunami ? " · tsunami" : ""}
                      {quake.felt ? ` · ${quake.felt} felt` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {total > LIST_CAP ? (
        <p className="list-more">Showing {LIST_CAP} of {total.toLocaleString()}. Tighten filters to narrow the list.</p>
      ) : null}
    </section>
  );
}

function magText(bg: string) {
  const warm = ["#e05228", "#c41e3a", "#7a1238", "#6d5cff"];
  return warm.includes(bg) ? "#fff8f4" : "#141318";
}
