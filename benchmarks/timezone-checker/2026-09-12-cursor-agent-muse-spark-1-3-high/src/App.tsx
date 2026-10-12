import { useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, CITY_MAP } from './cities';
import {
  HourFormat,
  Mode,
  formatHour,
  formatOffset,
  formatRange,
  getOffsetMinutes,
  isAwake,
  localHourAt,
  toRanges,
} from './tz';

const STORAGE_KEY = 'tz-overlap-checker-v1';
const DEFAULT_CITIES = ['san-francisco', 'denpasar', 'geneva'];

interface Persisted {
  cities: string[];
  wake: number;
  sleep: number;
  format: HourFormat;
  mode: Mode;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      const cities = (p.cities || []).filter((id) => CITY_MAP[id]);
      if (cities.length > 0) {
        return {
          cities,
          wake: clampHour(p.wake ?? 7),
          sleep: clampHour(p.sleep ?? 23),
          format: p.format === '24h' ? '24h' : '12h',
          mode: p.mode === 'base' ? 'base' : 'meeting',
        };
      }
    }
  } catch {
    /* fresh defaults */
  }
  return { cities: [...DEFAULT_CITIES], wake: 7, sleep: 23, format: '12h', mode: 'meeting' };
}

function clampHour(v: number): number {
  if (!Number.isFinite(v)) return 7;
  return Math.min(23, Math.max(0, Math.round(v)));
}

function awakeLabel(wake: number, sleep: number, fmt: HourFormat): string {
  return `${formatHour(wake, fmt)} – ${formatHour(sleep, fmt)}`;
}

export default function App() {
  const [initial] = useState<Persisted>(load);
  const [cityIds, setCityIds] = useState<string[]>(initial.cities);
  const [wake, setWake] = useState(initial.wake);
  const [sleep, setSleep] = useState(initial.sleep);
  const [format, setFormat] = useState<HourFormat>(initial.format);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [query, setQuery] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cities: cityIds, wake, sleep, format, mode }));
  }, [cityIds, wake, sleep, format, mode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const offsets = useMemo(() => {
    const now = new Date();
    const m: Record<string, number> = {};
    for (const c of CITIES) {
      try {
        m[c.id] = getOffsetMinutes(c.timeZone, now);
      } catch {
        m[c.id] = 0;
      }
    }
    return m;
  }, []);

  const refId = cityIds[0];
  const refCity = refId ? CITY_MAP[refId] : undefined;

  const q = query.trim().toLowerCase();
  const candidates = useMemo(() => {
    const added = new Set(cityIds);
    return CITIES.filter(
      (c) =>
        !added.has(c.id) &&
        (q === '' || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)),
    ).slice(0, 12);
  }, [cityIds, q]);

  const grid = useMemo(() => {
    if (!refId) return null;
    const refOff = offsets[refId] ?? 0;
    const rows = cityIds.map((id) => {
      const diff = (offsets[id] ?? 0) - refOff;
      const locals: number[] = [];
      const awake: boolean[] = [];
      for (let h = 0; h < 24; h++) {
        const lh = localHourAt(h, diff);
        locals.push(lh);
        awake.push(isAwake(lh, wake, sleep));
      }
      return { id, diff, locals, awake };
    });
    const meeting = Array.from({ length: 24 }, (_, h) => rows.every((r) => r.awake[h]));
    const refAwake = rows[0]?.awake ?? [];
    const base: Record<string, boolean[]> = {};
    for (const r of rows) {
      base[r.id] = r.awake.map((a, h) => (r.id === refId ? false : a && refAwake[h]));
    }
    return { rows, meeting, base };
  }, [cityIds, offsets, refId, wake, sleep]);

  const meetingRanges = grid ? toRanges(grid.meeting) : [];
  const meetingCount = grid ? grid.meeting.filter(Boolean).length : 0;

  const addCity = (id: string) => {
    if (cityIds.includes(id)) return;
    setCityIds((p) => [...p, id]);
    setQuery('');
    setDropOpen(false);
  };

  const removeCity = (id: string) => setCityIds((p) => p.filter((c) => c !== id));
  const promote = (id: string) => {
    if (id === refId) return;
    setCityIds((p) => [id, ...p.filter((c) => c !== id)]);
  };

  const cellState = (rowId: string, h: number): 'sleep' | 'awake' | 'overlap' => {
    if (!grid) return 'awake';
    const row = grid.rows.find((r) => r.id === rowId);
    if (!row) return 'awake';
    if (!row.awake[h]) return 'sleep';
    if (mode === 'meeting') return grid.meeting[h] ? 'overlap' : 'awake';
    if (rowId === refId) return 'awake';
    return grid.base[rowId][h] ? 'overlap' : 'awake';
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-inner">
          <div>
            <h1 className="title">Muse Spark 1.3</h1>
            <p className="subtitle">
              Timezone overlap checker for distributed teams — find hours when everyone is awake.
            </p>
          </div>
          <div className="mode-switch" role="tablist" aria-label="Mode">
            <button
              role="tab"
              aria-selected={mode === 'meeting'}
              className={mode === 'meeting' ? 'active' : ''}
              onClick={() => setMode('meeting')}
            >
              Meeting Mode
            </button>
            <button
              role="tab"
              aria-selected={mode === 'base'}
              className={mode === 'base' ? 'active' : ''}
              onClick={() => setMode('base')}
            >
              Base Mode
            </button>
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="card controls">
          <div className="add-city" ref={dropRef}>
            <label htmlFor="city-search">Add city</label>
            <input
              id="city-search"
              type="text"
              placeholder="Search city or country…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropOpen(true);
              }}
              onFocus={() => setDropOpen(true)}
            />
            {dropOpen && (
              <ul className="dropdown">
                {candidates.length === 0 && <li className="empty">No matches — try another name.</li>}
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => addCity(c.id)}>
                      <span className="d-name">{c.name}</span>
                      <span className="d-meta">
                        {c.country} · {c.region} · {formatOffset(offsets[c.id] ?? 0)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="settings">
            <div className="setting">
              <label htmlFor="wake">
                Wake <strong>{formatHour(wake, format)}</strong>
              </label>
              <input
                id="wake"
                type="range"
                min={0}
                max={23}
                value={wake}
                onChange={(e) => setWake(clampHour(Number(e.target.value)))}
              />
            </div>
            <div className="setting">
              <label htmlFor="sleep">
                Sleep <strong>{formatHour(sleep, format)}</strong>
              </label>
              <input
                id="sleep"
                type="range"
                min={0}
                max={23}
                value={sleep}
                onChange={(e) => setSleep(clampHour(Number(e.target.value)))}
              />
            </div>
            <div className="setting">
              <span className="lbl">
                Awake window <strong>{awakeLabel(wake, sleep, format)}</strong>
              </span>
              <div className="fmt-switch">
                <button className={format === '12h' ? 'active' : ''} onClick={() => setFormat('12h')}>
                  12h
                </button>
                <button className={format === '24h' ? 'active' : ''} onClick={() => setFormat('24h')}>
                  24h
                </button>
              </div>
            </div>
          </div>
        </section>

        {cityIds.length >= 2 && grid && refCity && (
          <section className="card summary">
            {mode === 'meeting' ? (
              meetingCount > 0 ? (
                <div className="sum-line">
                  <span className="dot" />
                  <strong>
                    {meetingCount}h overlap for everyone
                  </strong>
                  <span className="ranges">
                    {meetingRanges.map(([s, e]) => (
                      <span className="badge" key={`${s}-${e}`}>
                        {formatRange(s, e, format)}
                      </span>
                    ))}
                  </span>
                  <span className="ref-note">in {refCity.name} time</span>
                </div>
              ) : (
                <div className="warn">No common hour when everyone is awake. Try widening the awake window.</div>
              )
            ) : (
              <div className="base-list">
                {cityIds.slice(1).map((id) => {
                  const mask = grid.base[id];
                  const count = mask.filter(Boolean).length;
                  const ranges = toRanges(mask);
                  const city = CITY_MAP[id];
                  return (
                    <div className="sum-line" key={id}>
                      <span className={count > 0 ? 'dot' : 'dot off'} />
                      <strong>
                        {city.name} × {refCity.name}:{' '}
                        {count > 0 ? `${count}h overlap` : 'no overlap'}
                      </strong>
                      {count > 0 ? (
                        <span className="ranges">
                          {ranges.map(([s, e]) => (
                            <span className="badge" key={`${s}-${e}`}>
                              {formatRange(s, e, format)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="warn-inline">No shared awake hours — adjust the window.</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {cityIds.length === 0 && (
          <section className="card empty-state">Add at least one city to build the grid.</section>
        )}

        {grid && refCity && cityIds.length > 0 && (
          <>
            {/* Desktop: rows = cities, columns = hours */}
            <section className="card grid-desktop" aria-label="Timezone grid desktop">
              <div className="d-row d-head">
                <div className="d-city head-city">City · click name for REF</div>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className={`d-cell head-hour ${grid.meeting[h] && mode === 'meeting' ? 'head-hot' : ''}`}>
                    {formatHour(h, format)}
                  </div>
                ))}
                <div className="d-rm" />
              </div>
              {grid.rows.map((row) => {
                const city = CITY_MAP[row.id];
                const isRef = row.id === refId;
                return (
                  <div className="d-row" key={row.id}>
                    <div className="d-city">
                      <button className="city-name" onClick={() => promote(row.id)} title="Make reference city">
                        {city.name}
                      </button>
                      <div className="city-sub">
                        {isRef && <span className="ref-badge">REF</span>}
                        <span className="offset">{formatOffset(offsets[row.id] ?? 0)}</span>
                      </div>
                    </div>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className={`d-cell ${cellState(row.id, h)}`} title={`${city.name}: ${formatHour(row.locals[h], format)} local`}>
                        {formatHour(row.locals[h], format)}
                      </div>
                    ))}
                    <div className="d-rm">
                      <button className="rm" onClick={() => removeCity(row.id)} aria-label={`Remove ${city.name}`}>
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Mobile: columns = cities, rows = hours */}
            <section className="card grid-mobile" aria-label="Timezone grid mobile">
              <div className="m-table">
                <div className="m-row m-head">
                  <div className="m-hour head">Hour</div>
                  {grid.rows.map((row) => {
                    const city = CITY_MAP[row.id];
                    const isRef = row.id === refId;
                    return (
                      <div className="m-city head" key={row.id}>
                        <button className="city-name" onClick={() => promote(row.id)}>
                          {city.name}
                        </button>
                        {isRef && <span className="ref-badge">REF</span>}
                        <span className="offset">{formatOffset(offsets[row.id] ?? 0)}</span>
                        <button className="rm" onClick={() => removeCity(row.id)} aria-label={`Remove ${city.name}`}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                {Array.from({ length: 24 }, (_, h) => (
                  <div className="m-row" key={h}>
                    <div className={`m-hour ${grid.meeting[h] && mode === 'meeting' ? 'head-hot' : ''}`}>
                      {formatHour(h, format)}
                    </div>
                    {grid.rows.map((row) => (
                      <div key={row.id} className={`m-cell ${cellState(row.id, h)}`}>
                        {formatHour(row.locals[h], format)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="hint">Green cells = everyone awake · Click a city name to make it the reference · Hours in {refCity ? refCity.name : '—'} time</p>
      </main>
    </div>
  );
}
