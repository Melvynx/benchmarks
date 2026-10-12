import type { City } from "../data/cities";
import { formatClock, formatRange, hourCountLabel } from "../lib/format";
import { awakeHourMask, maskToRanges } from "../lib/schedule";
import type { TimeFormat } from "../types";
import { CitySearch } from "./CitySearch";

type Props = {
  wake: number;
  sleep: number;
  format: TimeFormat;
  available: City[];
  now: Date;
  onWake: (hour: number) => void;
  onSleep: (hour: number) => void;
  onFormat: (format: TimeFormat) => void;
  onAdd: (id: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function SettingsPanel({
  wake,
  sleep,
  format,
  available,
  now,
  onWake,
  onSleep,
  onFormat,
  onAdd,
}: Props) {
  const mask = awakeHourMask(wake, sleep);
  const count = mask.filter(Boolean).length;
  const ranges = maskToRanges(mask).map((range) => formatRange(range, format)).join(", ");

  return (
    <div className="controls">
      <div className="settings-grid">
      <fieldset className="settings">
        <legend>Awake window</legend>
        <div className="awake-controls">
          <label>
            <span className="field-label">Wake</span>
            <select aria-describedby="awake-summary" value={wake} onChange={(event) => onWake(Number(event.target.value))}>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatClock(hour, 0, format)}
                </option>
              ))}
            </select>
          </label>
          <span className="to" aria-hidden="true">
            to
          </span>
          <label>
            <span className="field-label">Sleep</span>
            <select aria-describedby="awake-summary" value={sleep} onChange={(event) => onSleep(Number(event.target.value))}>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatClock(hour, 0, format)}
                </option>
              ))}
            </select>
          </label>
          <div className="segment" role="group" aria-label="Time format">
            <button type="button" aria-pressed={format === "12"} onClick={() => onFormat("12")}>
              12h
            </button>
            <button type="button" aria-pressed={format === "24"} onClick={() => onFormat("24")}>
              24h
            </button>
          </div>
        </div>
      </fieldset>
      <CitySearch available={available} now={now} onAdd={onAdd} />
      </div>
      <p className="awake-readout" id="awake-summary">
        {ranges} · {hourCountLabel(count)}. Same window for every city.
        {wake === sleep ? " Matching wake and sleep keeps every hour awake." : ""}
      </p>
    </div>
  );
}
