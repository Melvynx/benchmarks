import { useEffect, useMemo, useState } from "react";
import { DesktopGrid } from "./components/DesktopGrid";
import { MobileGrid } from "./components/MobileGrid";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { CITIES, CITY_MAP } from "./data/cities";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNow } from "./hooks/useNow";
import { buildBoard } from "./lib/board";
import { readState, writeState } from "./lib/storage";
import type { Mode, TimeFormat } from "./types";

function clampHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 0;
  return hour;
}

export function App() {
  const now = useNow();
  const desktop = useMediaQuery("(min-width: 768px)");
  const [state, setState] = useState(readState);

  useEffect(() => {
    writeState(state);
  }, [state]);

  const cities = useMemo(
    () => state.cityIds.flatMap((id) => {
      const city = CITY_MAP.get(id);
      return city ? [city] : [];
    }),
    [state.cityIds],
  );

  const board = useMemo(
    () => buildBoard(cities, state, now),
    [cities, state, now],
  );

  const available = useMemo(
    () => CITIES.filter((city) => !state.cityIds.includes(city.id)),
    [state.cityIds],
  );

  const referenceName = cities[0]?.name ?? "the reference city";

  function setMode(mode: Mode) {
    setState((current) => ({ ...current, mode }));
  }

  function setFormat(format: TimeFormat) {
    setState((current) => ({ ...current, format }));
  }

  return (
    <div className="app">
      <header className="top">
        <div className="title-block">
          <h1>Grok 4.7</h1>
          <p className="lede">Find hours when people in different cities are awake.</p>
        </div>
        <div className="mode">
          <div className="segment" role="group" aria-label="Mode">
            <button type="button" aria-pressed={state.mode === "meeting"} onClick={() => setMode("meeting")}>
              Meeting
            </button>
            <button type="button" aria-pressed={state.mode === "base"} onClick={() => setMode("base")}>
              Base
            </button>
          </div>
          <p className="mode-help">
            {state.mode === "meeting"
              ? "One window where every city is awake."
              : `A separate window for each city against ${referenceName}.`}
          </p>
        </div>
      </header>

      <main className="sheet">
        <SettingsPanel
          wake={state.wake}
          sleep={state.sleep}
          format={state.format}
          available={available}
          now={now}
          onWake={(wake) => setState((current) => ({ ...current, wake: clampHour(wake) }))}
          onSleep={(sleep) => setState((current) => ({ ...current, sleep: clampHour(sleep) }))}
          onFormat={setFormat}
          onAdd={(id) =>
            setState((current) =>
              current.cityIds.includes(id) ? current : { ...current, cityIds: [...current.cityIds, id] },
            )
          }
        />

        <OverlapSummary
          mode={state.mode}
          format={state.format}
          referenceName={referenceName}
          meeting={board.meeting}
          baseLines={board.baseLines}
        />

        {cities.length === 0 ? (
          <p className="empty">Add a city to build the board.</p>
        ) : desktop ? (
          <DesktopGrid
            rows={board.rows}
            format={state.format}
            nowHour={board.nowHour ?? 0}
            headerOverlap={board.headerOverlap}
            onPromote={(id) =>
              setState((current) =>
                current.cityIds[0] === id || !current.cityIds.includes(id)
                  ? current
                  : { ...current, cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)] },
              )
            }
            onRemove={(id) =>
              setState((current) => ({ ...current, cityIds: current.cityIds.filter((cityId) => cityId !== id) }))
            }
          />
        ) : (
          <MobileGrid
            rows={board.rows}
            format={state.format}
            nowHour={board.nowHour ?? 0}
            headerOverlap={board.headerOverlap}
            onPromote={(id) =>
              setState((current) =>
                current.cityIds[0] === id || !current.cityIds.includes(id)
                  ? current
                  : { ...current, cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)] },
              )
            }
            onRemove={(id) =>
              setState((current) => ({ ...current, cityIds: current.cityIds.filter((cityId) => cityId !== id) }))
            }
          />
        )}

        {cities.length > 0 ? (
          <footer className="foot">
            <ul className="legend">
              <li>
                <span className="swatch overlap" aria-hidden="true" /> Overlap
              </li>
              <li>
                <span className="swatch awake" aria-hidden="true" /> Awake
              </li>
              <li>
                <span className="swatch sleep" aria-hidden="true" /> Asleep
              </li>
            </ul>
            <p className="hint">
              {state.mode === "meeting"
                ? "Green cells = everyone awake"
                : `Green cells = awake with ${referenceName}`}
            </p>
          </footer>
        ) : null}
      </main>
    </div>
  );
}
