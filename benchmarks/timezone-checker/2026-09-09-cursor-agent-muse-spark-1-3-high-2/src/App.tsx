import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { CITY_BY_ID, CITY_CATALOG, DEFAULT_CITY_IDS, type City } from './cities';
import {
  formatDecimalLabel,
  formatHourLabel,
  formatOffset,
  getLocalDecimalHour,
  getReferenceDayInstants,
  groupContiguous,
  formatRange,
  isAwake,
} from './time';
import './styles.css';

type Mode = 'meeting' | 'base';
type HourFormat = '12h' | '24h';

interface PersistedState {
  cityIds: string[];
  wake: number;
  sleep: number;
  format: HourFormat;
  mode: Mode;
}

const STORAGE_KEY = 'tz-overlap-checker-v1';
const MODEL_NAME = 'Muse Spark 1.3';

const DEFAULTS: PersistedState = {
  cityIds: DEFAULT_CITY_IDS,
  wake: 7,
  sleep: 23,
  format: '12h',
  mode: 'meeting',
};

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const cityIds = Array.isArray(parsed.cityIds)
      ? parsed.cityIds.filter((id) => typeof id === 'string' && CITY_BY_ID[id])
      : DEFAULTS.cityIds;
    return {
      cityIds: cityIds.length > 0 ? [...new Set(cityIds)] : [...DEFAULTS.cityIds],
      wake: typeof parsed.wake === 'number' && parsed.wake >= 0 && parsed.wake <= 23 ? parsed.wake : 7,
      sleep: typeof parsed.sleep === 'number' && parsed.sleep >= 0 && parsed.sleep <= 23 ? parsed.sleep : 23,
      format: parsed.format === '24h' ? '24h' : '12h',
      mode: parsed.mode === 'base' ? 'base' : 'meeting',
    };
  } catch {
    return DEFAULTS;
  }
}

function AwakeDot({ awake }: { awake: boolean }) {
  return <span className={awake ? 'dot dot-awake' : 'dot dot-asleep'} />;
}

export default function App() {
  const [initial] = useState<PersistedState>(() => loadState());
  const [cityIds, setCityIds] = useState<string[]>(initial.cityIds);
  const [wake, setWake] = useState(initial.wake);
  const [sleep, setSleep] = useState(initial.sleep);
  const [format, setFormat] = useState<HourFormat>(initial.format);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [query, setQuery] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityIds, wake, sleep, format, mode }));
  }, [cityIds, wake, sleep, format, mode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const cities: City[] = useMemo(
    () => cityIds.map((id) => CITY_BY_ID[id]).filter(Boolean),
    [cityIds],
  );
  const use24h = format === '24h';
  const refCity = cities[0];

  const results = useMemo(() => {
    if (cities.length === 0) return null;
    const instants = getReferenceDayInstants(refCity.timeZone, now);
    const decimals: number[][] = cities.map((c) =>
      instants.map((inst) => getLocalDecimalHour(c.timeZone, inst)),
    );
    const awake: boolean[][] = decimals.map((row) => row.map((d) => isAwake(d, wake, sleep)));
    const meetingOverlap: boolean[] = instants.map((_, h) => awake.every((row) => row[h]));
    const baseOverlap: boolean[][] = cities.map((_, i) => {
      if (i === 0) return instants.map(() => false);
      return instants.map((_, h) => awake[0][h] && awake[i][h]);
    });
    return { instants, decimals, awake, meetingOverlap, baseOverlap };
  }, [cities, refCity?.timeZone, now, wake, sleep]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inList = new Set(cityIds);
    return CITY_CATALOG.filter((c) => {
      if (inList.has(c.id)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    }).slice(0, 12);
  }, [query, cityIds]);

  const addCity = (id: string) => {
    setCityIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery('');
    setDropOpen(false);
  };

  const removeCity = (id: string) => {
    setCityIds((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c !== id)));
  };

  const promoteRef = (id: string) => {
    setCityIds((prev) => {
      if (prev[0] === id) return prev;
      return [id, ...prev.filter((c) => c !== id)];
    });
  };

  const meetingHours = useMemo(() => {
    if (!results) return [];
    const out: number[] = [];
    results.meetingOverlap.forEach((v, h) => v && out.push(h));
    return out;
  }, [results]);

  const cellState = (cityIdx: number, h: number): 'sleep' | 'awake' | 'overlap' => {
    if (!results) return 'awake';
    if (!results.awake[cityIdx][h]) return 'sleep';
    if (mode === 'meeting') return results.meetingOverlap[h] ? 'overlap' : 'awake';
    if (cityIdx === 0) return 'awake';
    return results.baseOverlap[cityIdx][h] ? 'overlap' : 'awake';
  };

  return (
    <div className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="shell">
        <header className="topbar">
          <div>
            <h1 className="title">{MODEL_NAME}</h1>
            <p className="subtitle">
              Timezone overlap checker for distributed teams — anchored to{' '}
              <strong>{refCity ? refCity.name : '—'}</strong>
            </p>
          </div>
          <div className="mode-switch" role="tablist" aria-label="Mode">
            <button
              role="tab"
              aria-selected={mode === 'meeting'}
              className={mode === 'meeting' ? 'mode-btn active' : 'mode-btn'}
              onClick={() => setMode('meeting')}
            >
              Meeting
            </button>
            <button
              role="tab"
              aria-selected={mode === 'base'}
              className={mode === 'base' ? 'mode-btn active' : 'mode-btn'}
              onClick={() => setMode('base')}
            >
              Base
            </button>
          </div>
        </header>

        <section className="panel controls">
          <div className="add-wrap" ref={dropRef}>
            <label className="lbl" htmlFor="city-search">
              Add city
            </label>
            <input
              id="city-search"
              className="search"
              placeholder="Search city or country — e.g. Tokyo, India…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropOpen(true);
              }}
              onFocus={() => setDropOpen(true)}
            />
            {dropOpen && (
              <div className="dropdown">
                {filtered.length === 0 && <div className="drop-empty">No matches — try another name.</div>}
                {filtered.map((c) => (
                  <button key={c.id} className="drop-item" onClick={() => addCity(c.id)}>
                    <span className="drop-name">{c.name}</span>
                    <span className="drop-sub">
                      {c.country} · {c.region} · {formatOffset(c.timeZone, now)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="settings">
            <div className="field">
              <label className="lbl" htmlFor="wake">Wake-up</label>
              <select id="wake" className="select" value={wake} onChange={(e) => setWake(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{formatHourLabel(h, use24h)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="sleep">Sleep</label>
              <select id="sleep" className="select" value={sleep} onChange={(e) => setSleep(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{formatHourLabel(h, use24h)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="lbl">Format</span>
              <div className="mini-switch">
                <button className={format === '12h' ? 'mini active' : 'mini'} onClick={() => setFormat('12h')}>12h</button>
                <button className={format === '24h' ? 'mini active' : 'mini'} onClick={() => setFormat('24h')}>24h</button>
              </div>
            </div>
            <div className="awake-line">
              <AwakeDot awake />
              <span>
                Awake {formatHourLabel(wake, use24h)} → {formatHourLabel(sleep, use24h)}
                {wake > sleep && wake !== sleep ? ' (overnight)' : ''}
                {wake === sleep ? ' (24h)' : ''}
              </span>
            </div>
          </div>
        </section>

        {cities.length >= 2 && results && (
          <section className="panel summary">
            {mode === 'meeting' ? (
              meetingHours.length > 0 ? (
                <div className="sum-row">
                  <span className="sum-count">{meetingHours.length}h overlap</span>
                  <span className="sum-in">in {refCity.name}</span>
                  <div className="badges">
                    {groupContiguous(meetingHours).map((g) => (
                      <span key={`${g.start}-${g.end}`} className="badge">
                        {formatRange(g.start, g.end, use24h)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="warn">No common awake window — no overlap across all cities.</div>
              )
            ) : (
              <div className="base-list">
                {cities.slice(1).map((c, k) => {
                  const idx = k + 1;
                  const hrs: number[] = [];
                  results.baseOverlap[idx].forEach((v, h) => v && hrs.push(h));
                  return (
                    <div key={c.id} className="sum-row">
                      <span className="sum-city">{refCity.name} × {c.name}</span>
                      {hrs.length > 0 ? (
                        <>
                          <span className="sum-count">{hrs.length}h</span>
                          <div className="badges">
                            {groupContiguous(hrs).map((g) => (
                              <span key={`${g.start}-${g.end}`} className="badge">
                                {formatRange(g.start, g.end, use24h)}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="warn-inline">No overlap with {c.name}.</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {results && (
          <>
            {/* DESKTOP LAYOUT */}
            <section className="panel grid-desktop" aria-label="Timezone grid desktop">
              <div className="d-head d-row">
                <div className="d-city-col" />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="d-h">{formatHourLabel(h, use24h)}</div>
                ))}
                <div className="d-x-col" />
              </div>
              {cities.map((c, i) => (
                <div key={c.id} className="d-row">
                  <div className="d-city-col">
                    <button className="city-name" onClick={() => promoteRef(c.id)} title="Make reference city">
                      {c.name}
                    </button>
                    {i === 0 && <span className="ref">REF</span>}
                    <div className="city-meta">
                      {c.country} · {formatOffset(c.timeZone, now)}
                    </div>
                  </div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const st = cellState(i, h);
                    return (
                      <div key={h} className={`cell ${st}`} title={`${c.name}: ${formatDecimalLabel(results.decimals[i][h], use24h)}`}>
                        {formatDecimalLabel(results.decimals[i][h], use24h)}
                      </div>
                    );
                  })}
                  <div className="d-x-col">
                    <button
                      className="x-btn"
                      onClick={() => removeCity(c.id)}
                      disabled={cities.length <= 1}
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* MOBILE LAYOUT — separate structure */}
            <section className="panel grid-mobile" aria-label="Timezone grid mobile">
              <div className="m-grid" style={{ ['--cols' as string]: cities.length }}>
                <div className="m-corner">REF&nbsp;{use24h ? '24h' : '12h'}</div>
                {cities.map((c, i) => (
                  <div key={c.id} className="m-chead">
                    <button className="city-name" onClick={() => promoteRef(c.id)}>{c.name}</button>
                    {i === 0 && <span className="ref">REF</span>}
                    <div className="city-meta">{formatOffset(c.timeZone, now)}</div>
                    <button
                      className="x-btn"
                      onClick={() => removeCity(c.id)}
                      disabled={cities.length <= 1}
                      aria-label={`Remove ${c.name}`}
                    >
                      × remove
                    </button>
                  </div>
                ))}
                {Array.from({ length: 24 }, (_, h) => (
                  <Fragment key={`mrow-${h}`}>
                    <div className="m-h">{formatHourLabel(h, use24h)}</div>
                    {cities.map((c, i) => {
                      const st = cellState(i, h);
                      return (
                        <div key={`${c.id}-${h}`} className={`cell ${st}`}>
                          {formatDecimalLabel(results.decimals[i][h], use24h)}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </section>
          </>
        )}

        <footer className="hint">
          {mode === 'meeting'
            ? 'Green cells = everyone awake'
            : `Green cells = everyone awake with the base city (${refCity?.name ?? ''})`}
          <span className="hint-sub"> · Click a city name to make it the reference · Hours are {refCity ? `in ${refCity.name} time` : ''}</span>
        </footer>
      </div>
    </div>
  );
}
