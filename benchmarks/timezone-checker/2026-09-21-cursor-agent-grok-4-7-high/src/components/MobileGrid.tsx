import type { BoardRow } from "../lib/board";
import { formatClock, formatClockTime, formatOffset } from "../lib/format";
import type { TimeFormat } from "../types";
import { CityIdentity, RemoveButton } from "./CityIdentity";
import { HourCell } from "./HourCell";

type Props = {
  rows: BoardRow[];
  format: TimeFormat;
  nowHour: number;
  headerOverlap: boolean[];
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
};

export function MobileGrid({ rows, format, nowHour, headerOverlap, onPromote, onRemove }: Props) {
  const reference = rows[0]?.city.name ?? "the reference city";
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <div className="scroller" data-layout="mobile">
      <p className="axis">Rows are {reference} hours. Each cell is local time in that city.</p>
      <table className="mobile-table" style={{ minWidth: 48 + rows.length * 96 }}>
        <thead>
          <tr>
            <th className="corner" scope="col">
              Hour
            </th>
            {rows.map((row, index) => (
              <th
                key={row.city.id}
                scope="col"
                className={index === 0 ? "city-head is-reference" : "city-head"}
                data-city={row.city.id}
              >
                <CityIdentity
                  city={row.city}
                  reference={index === 0}
                  offsetLabel={formatOffset(row.offset)}
                  nowLabel={formatClockTime(row.now.hour, row.now.minute, format)}
                  onPromote={() => onPromote(row.city.id)}
                />
                <RemoveButton name={row.city.name} onClick={() => onRemove(row.city.id)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => {
            const now = hour === nowHour;
            const overlap = headerOverlap[hour];
            return (
              <tr key={hour}>
                <th
                  scope="row"
                  data-hour={hour}
                  className={["tick", "hour-label", overlap ? "overlap" : "", now ? "is-now" : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {now ? <span className="now-dot" aria-hidden="true" /> : null}
                  <span>{formatClock(hour, 0, format, true)}</span>
                  {now ? <span className="sr-only">Current hour</span> : null}
                </th>
                {rows.map((row) => {
                  const cell = row.cells[hour];
                  return (
                    <HourCell
                      key={row.city.id}
                      hour={cell.hour}
                      minute={cell.minute}
                      state={cell.state}
                      format={format}
                      cityName={row.city.name}
                      now={now}
                      referenceHour={hour}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
