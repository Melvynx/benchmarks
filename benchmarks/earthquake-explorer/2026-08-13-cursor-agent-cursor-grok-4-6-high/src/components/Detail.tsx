import { magColor, magInk, quakeColor } from "../lib/color";
import {
  formatCoord,
  formatDepth,
  formatLocal,
  formatMag,
  formatUtc,
} from "../lib/format";
import type { ColorMode, Quake } from "../lib/types";

type Props = {
  quake: Quake;
  colorMode: ColorMode;
  onClose: () => void;
};

export function Detail({ quake, colorMode, onClose }: Props) {
  const magBg = magColor(quake.mag);
  const magFg = magInk(quake.mag);
  const dataColor = quakeColor(quake, colorMode);

  return (
    <article className="detail" aria-live="polite">
      <header className="detail-head">
        <span className="mag-hero" style={{ background: magBg, color: magFg }}>
          {formatMag(quake.mag)}
        </span>
        <div>
          <p className="detail-kicker">{quake.magType} · {quake.type}</p>
          <h2>{quake.place}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </header>

      <dl className="facts">
        <div>
          <dt>When (local)</dt>
          <dd>{formatLocal(quake.time)}</dd>
        </div>
        <div>
          <dt>When (UTC)</dt>
          <dd>{formatUtc(quake.time)}</dd>
        </div>
        <div>
          <dt>Depth</dt>
          <dd>{formatDepth(quake.depth)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{formatCoord(quake.lat, quake.lon)}</dd>
        </div>
        <div>
          <dt>Felt reports</dt>
          <dd>{quake.felt ?? "None yet"}</dd>
        </div>
        <div>
          <dt>Tsunami</dt>
          <dd>{quake.tsunami ? "Flagged by USGS" : "No flag"}</dd>
        </div>
        <div>
          <dt>Alert</dt>
          <dd className={quake.alert ? `alert-${quake.alert}` : undefined}>
            {quake.alert ?? "None"}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{quake.status}</dd>
        </div>
        <div>
          <dt>Significance</dt>
          <dd>{quake.sig}</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{quake.net || "USGS"} {quake.code}</dd>
        </div>
      </dl>

      <div className="detail-color">
        <span className="swatch" style={{ background: dataColor }} />
        <span>
          {colorMode === "depth"
            ? `Colored by depth (${formatDepth(quake.depth)})`
            : `Colored by magnitude (${formatMag(quake.mag)})`}
        </span>
      </div>

      <a className="usgs-link" href={quake.url} target="_blank" rel="noreferrer">
        Open USGS event page
      </a>
    </article>
  );
}
