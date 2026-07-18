import { useEffect, useMemo, useRef, useState } from "react";
import { CityPicker } from "./components/CityPicker";
import { SettingsPanel } from "./components/SettingsPanel";
import { OverlapSummary } from "./components/OverlapSummary";
import { TimeGrid } from "./components/TimeGrid";
import { LinkIcon, UsersIcon } from "./components/Icons";
import { CITY_BY_ID } from "./data/cities";
import { usePersistentState } from "./hooks/usePersistentState";
import {
  buildTimeMatrix,
  getBaseOverlap,
  getMeetingOverlap,
  getOffsetMinutes,
  isAwake,
  type Mode,
} from "./lib/timezone";

function App() {
  const [state, setState] = usePersistentState();
  const [now, setNow] = useState(() => new Date());
  const pickerProxyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const cities = useMemo(
    () => state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city) => city !== undefined),
    [state.cityIds],
  );

  const matrix = useMemo(() => buildTimeMatrix(cities, now), [cities, now]);
  const awakeMatrix = useMemo(
    () => matrix.map((row) => row.map((time) => isAwake(time.totalMinutes, state.wakeHour, state.sleepHour))),
    [matrix, state.wakeHour, state.sleepHour],
  );
  const meetingOverlap = useMemo(() => getMeetingOverlap(awakeMatrix), [awakeMatrix]);
  const baseOverlaps = useMemo(
    () => cities.map((_, index) => getBaseOverlap(awakeMatrix, index)),
    [awakeMatrix, cities],
  );
  const overlapRows = useMemo(() => {
    if (state.mode === "meeting") return cities.map(() => meetingOverlap);
    return cities.map((_, index) => index === 0 ? Array(24).fill(false) as boolean[] : baseOverlaps[index]);
  }, [state.mode, cities, meetingOverlap, baseOverlaps]);
  const offsets = useMemo(
    () => cities.map((city) => getOffsetMinutes(city.timeZone, now)),
    [cities, now],
  );

  function update<Key extends keyof typeof state>(key: Key, value: (typeof state)[Key]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function addCity(cityId: string) {
    setState((current) => current.cityIds.includes(cityId)
      ? current
      : { ...current, cityIds: [...current.cityIds, cityId] });
  }

  function promoteCity(cityId: string) {
    setState((current) => {
      const index = current.cityIds.indexOf(cityId);
      if (index <= 0) return current;
      return { ...current, cityIds: [cityId, ...current.cityIds.filter((id) => id !== cityId)] };
    });
  }

  function removeCity(cityId: string) {
    setState((current) => ({ ...current, cityIds: current.cityIds.filter((id) => id !== cityId) }));
  }

  function setMode(mode: Mode) {
    update("mode", mode);
  }

  function openCityPickerFromEmpty() {
    pickerProxyRef.current?.click();
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="title-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <h1>GPT-5.6 Sol</h1>
        </div>
        <div className="header-status"><span className="live-dot" /> Current DST offsets</div>
      </header>

      <section className="toolbar" aria-label="Timezone controls">
        <div className="mode-control" role="group" aria-label="Comparison mode">
          <button type="button" aria-pressed={state.mode === "meeting"} className={state.mode === "meeting" ? "selected" : undefined} onClick={() => setMode("meeting")}>
            <UsersIcon />
            <span><strong>Meeting</strong><small>Everyone together</small></span>
          </button>
          <button type="button" aria-pressed={state.mode === "base"} className={state.mode === "base" ? "selected" : undefined} onClick={() => setMode("base")}>
            <LinkIcon />
            <span><strong>Base</strong><small>One-to-one</small></span>
          </button>
        </div>

        <div className="toolbar-actions">
          <SettingsPanel
            wakeHour={state.wakeHour}
            sleepHour={state.sleepHour}
            timeFormat={state.timeFormat}
            onWakeChange={(hour) => update("wakeHour", hour)}
            onSleepChange={(hour) => update("sleepHour", hour)}
            onFormatChange={(format) => update("timeFormat", format)}
          />
          <div className="picker-proxy-wrap">
            <CityPicker selectedIds={state.cityIds} onAdd={addCity} now={now} prominent />
            <button
              ref={pickerProxyRef}
              className="picker-proxy"
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => {
                const trigger = document.querySelector<HTMLButtonElement>(".city-picker > .control-button");
                trigger?.click();
              }}
            />
          </div>
        </div>
      </section>

      <OverlapSummary
        cities={cities}
        mode={state.mode}
        timeFormat={state.timeFormat}
        meetingOverlap={meetingOverlap}
        baseOverlaps={baseOverlaps}
      />

      <TimeGrid
        cities={cities}
        matrix={matrix}
        awakeMatrix={awakeMatrix}
        overlapRows={overlapRows}
        offsets={offsets}
        mode={state.mode}
        timeFormat={state.timeFormat}
        now={now}
        onPromote={promoteCity}
        onRemove={removeCity}
        onOpenPicker={openCityPickerFromEmpty}
      />
    </main>
  );
}

export default App;
