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

export function DesktopGrid({ rows, format, nowHour, headerOverlap, onPromote, onRemove }: Props) {
  const reference = rows[0]?.city.name ?? "the reference city";
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <div className="scroller" data-layout="desktop">
      <p className="axis">Columns are {reference} hours. Each cell is local time in that city.</p>
      <table className="desktop-table">
        <colgroup>
          <col className="col-city" />
          {hours.map((hour) => (
            <col key={hour} className="col-hour" />
          ))}
          <col className="col-remove" />
        </colgroup>
        <thead>
          <tr>
            <th className="corner" scope="col">
              City
            </th>
            {hours.map((hour) => {
              const overlap = headerOverlap[hour];
              const now = hour === nowHour;
              return (
                <th
                  key={hour}
                  scope="col"
                  data-hour={hour}
                  className={["tick", overlap ? "overlap" : "", now ? "is-now" : ""].filter(Boolean).join(" ")}
                >
                  {now ? <span className="now-dot" aria-hidden="true" /> : null}
                  <span>{formatClock(hour, 0, format, true)}</span>
                  {now ? <span className="sr-only">Current hour</span> : null}
                </th>
              );
            })}
            <th className="remove-head" scope="col">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.city.id} className={index === 0 ? "is-reference" : undefined} data-city={row.city.id}>
              <th className="city-cell" scope="row">
                <CityIdentity
                  city={row.city}
                  reference={index === 0}
                  offsetLabel={formatOffset(row.offset)}
                  nowLabel={formatClockTime(row.now.hour, row.now.minute, format)}
                  onPromote={() => onPromote(row.city.id)}
                />
              </th>
              {row.cells.map((cell, hour) => (
                <HourCell
                  key={hour}
                  hour={cell.hour}
                  minute={cell.minute}
                  state={cell.state}
                  format={format}
                  cityName={row.city.name}
                  now={hour === nowHour}
                  referenceHour={hour}
                />
              ))}
              <td className="remove-cell">
                <RemoveButton name={row.city.name} onClick={() => onRemove(row.city.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
