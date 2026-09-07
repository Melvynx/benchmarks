import { useMemo } from "react";

import { quakeColor, type ColorMode } from "../lib/color";
import {
  clockTime,
  depthLabel,
  latLabel,
  localTime,
  lonLabel,
  magnitudeLabel,
  mmiDescriptor,
  mmiRoman,
  relativeTime,
  splitPlace,
  titleCase,
  tntEquivalent,
  utcTime,
} from "../lib/format";
import { compassBearing, haversineKm } from "../lib/geo";
import type { AlertLevel, Quake } from "../lib/usgs";
import { DepthProfile } from "./DepthProfile";

const NEARBY_RADIUS_KM = 300;
const NEARBY_LIMIT = 6;

const ALERT_COPY: Record<AlertLevel, { label: string; body: string }> = {
  green: { label: "Green", body: "No significant losses expected" },
  yellow: { label: "Yellow", body: "Local impact, some losses likely" },
  orange: { label: "Orange", body: "Regional impact, significant losses" },
  red: { label: "Red", body: "Major disaster, extensive losses" },
};

export interface DetailPanelProps {
  quake: Quake;
  /** Full feed, so neighbours are found regardless of the active filters. */
  allQuakes: Quake[];
  colorMode: ColorMode;
  now: number;
  onClose: () => void;
  onSelect: (quake: Quake) => void;
  onLocate: () => void;
}

export function DetailPanel({
  quake,
  allQuakes,
  colorMode,
  now,
  onClose,
  onSelect,
  onLocate,
}: DetailPanelProps) {
  const color = quakeColor(colorMode, quake, now);
  const { prefix, region } = splitPlace(quake.place);

  const nearby = useMemo(() => {
    const found: Array<{ quake: Quake; km: number; bearing: string }> = [];
    for (const other of allQuakes) {
      if (other.id === quake.id) continue;
      const km = haversineKm(quake.lat, quake.lon, other.lat, other.lon);
      if (km > NEARBY_RADIUS_KM) continue;
      found.push({ quake: other, km, bearing: compassBearing(quake.lat, quake.lon, other.lat, other.lon) });
    }
    found.sort((a, b) => a.km - b.km);
    return found.slice(0, NEARBY_LIMIT);
  }, [quake, allQuakes]);

  const intensity = quake.mmi ?? quake.cdi;
  const intensitySource = quake.mmi !== null ? "Instrumental (ShakeMap)" : "Community reports";

  return (
    <aside className="detail" aria-label={`Details for ${quake.title}`}>
      <header className="detail-head">
        <div className="detail-head-top">
          <span className="detail-eyebrow">
            {quake.type === "earthquake" ? "Earthquake" : titleCase(quake.type)}
            <span className="detail-status" data-status={quake.status}>
              {quake.status === "reviewed" ? "Reviewed" : "Automatic"}
            </span>
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="detail-hero">
          <div className="detail-mag" style={{ color, borderColor: color }}>
            <span className="detail-mag-value">{magnitudeLabel(quake.mag)}</span>
            <span className="detail-mag-type">{quake.magType?.toUpperCase() ?? "M"}</span>
          </div>
          <div className="detail-hero-text">
            <h2 className="detail-place">
              {prefix ? <span className="detail-prefix">{prefix} of </span> : null}
              {region}
            </h2>
            <p className="detail-when">
              <strong>{relativeTime(quake.time, now)}</strong>
              <span className="detail-when-sep">·</span>
              {localTime(quake.time)}
            </p>
            <p className="detail-when-utc">
              {utcTime(quake.time)} · local clock {clockTime(quake.time)}
            </p>
          </div>
        </div>

        <div className="detail-flags">
          {quake.alert ? (
            <span className={`flag flag-alert flag-${quake.alert}`} title={ALERT_COPY[quake.alert].body}>
              PAGER {ALERT_COPY[quake.alert].label}
            </span>
          ) : null}
          {quake.tsunami ? <span className="flag flag-tsunami">Tsunami evaluated</span> : null}
          {quake.sig >= 600 ? <span className="flag flag-sig">Significant event</span> : null}
          {(quake.felt ?? 0) > 0 ? (
            <span className="flag">{(quake.felt ?? 0).toLocaleString()} felt reports</span>
          ) : null}
        </div>

        <div className="detail-actions">
          <button type="button" className="btn btn-primary" onClick={onLocate}>
            Centre on map
          </button>
          <a className="btn" href={quake.url} target="_blank" rel="noreferrer">
            USGS event page ↗
          </a>
        </div>
      </header>

      <div className="detail-body">
        {intensity !== null ? (
          <Section title="Shaking intensity" hint={intensitySource}>
            <IntensityMeter value={intensity} />
          </Section>
        ) : null}

        {/* USGS measures depth from mean sea level, so a negative figure is a
            hypocentre in high terrain, not a data error. */}
        <Section title="Depth" hint={quake.depth < 0 ? "Above sea level" : "Below sea level"}>
          <DepthProfile depth={quake.depth} />
        </Section>

        <Section title="Energy released" hint="Gutenberg–Richter estimate">
          <p className="energy-line">
            Equivalent to <strong>{tntEquivalent(quake.mag)}</strong>
          </p>
          <p className="energy-note">
            A single step up the magnitude scale releases about 32× more energy.
          </p>
        </Section>

        <Section title="Measurements">
          <dl className="facts">
            <Fact label="Depth" value={depthLabel(quake.depth)} />
            <Fact label="Latitude" value={latLabel(quake.lat)} />
            <Fact label="Longitude" value={lonLabel(quake.lon)} />
            <Fact label="Significance" value={`${quake.sig} / 1000`} />
            <Fact
              label="Stations"
              value={quake.nst !== null ? String(quake.nst) : "—"}
              hint="Seismometers used to locate the event"
            />
            <Fact
              label="Azimuthal gap"
              value={quake.gap !== null ? `${Math.round(quake.gap)}°` : "—"}
              hint="Largest gap between stations; under 180° is a well-constrained location"
            />
            <Fact
              label="RMS residual"
              value={quake.rms !== null ? `${quake.rms.toFixed(2)} s` : "—"}
              hint="Fit between observed and predicted arrival times"
            />
            <Fact label="Network" value={quake.net.toUpperCase() || "—"} />
          </dl>
        </Section>

        <Section
          title="Nearby in this feed"
          hint={`Within ${NEARBY_RADIUS_KM} km`}
        >
          {nearby.length === 0 ? (
            <p className="detail-empty">No other recorded events within {NEARBY_RADIUS_KM} km.</p>
          ) : (
            <ul className="nearby">
              {nearby.map(({ quake: other, km, bearing }) => (
                <li key={other.id}>
                  <button type="button" className="nearby-row" onClick={() => onSelect(other)}>
                    <span
                      className="nearby-mag"
                      style={{ color: quakeColor(colorMode, other, now) }}
                    >
                      {magnitudeLabel(other.mag)}
                    </span>
                    <span className="nearby-text">
                      <span className="nearby-dist">
                        {Math.round(km)} km {bearing}
                      </span>
                      <span className="nearby-time">{relativeTime(other.time, now)}</span>
                    </span>
                    <span className="nearby-depth">{depthLabel(other.depth)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="detail-id">
          Event ID <code>{quake.id}</code>
        </p>
      </div>
    </aside>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="detail-section">
      <div className="detail-section-head">
        <h3>{title}</h3>
        {hint ? <span>{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="fact" title={hint}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const INTENSITY_COLORS = [
  "#ffffff",
  "#bfccff",
  "#a0e6ff",
  "#80ffc8",
  "#7cf35a",
  "#ffff4d",
  "#ffcc33",
  "#ff9933",
  "#ff5c1a",
  "#e60000",
  "#a60000",
];

/** Modified Mercalli scale, laid out the way USGS ShakeMaps present it. */
function IntensityMeter({ value }: { value: number }) {
  const level = Math.max(1, Math.min(10, Math.round(value)));
  return (
    <div className="intensity">
      <div className="intensity-scale" role="img" aria-label={`Intensity ${mmiRoman(value)}, ${mmiDescriptor(value)}`}>
        {INTENSITY_COLORS.map((color, index) => (
          <span
            key={color}
            className={`intensity-step ${index + 1 === level ? "is-active" : ""}`}
            style={{ background: color }}
          >
            {index + 1 === level ? <span className="intensity-caret" /> : null}
          </span>
        ))}
      </div>
      <div className="intensity-read">
        <span className="intensity-roman">{mmiRoman(value)}</span>
        <span className="intensity-word">{mmiDescriptor(value)}</span>
        <span className="intensity-num">MMI {value.toFixed(1)}</span>
      </div>
    </div>
  );
}
