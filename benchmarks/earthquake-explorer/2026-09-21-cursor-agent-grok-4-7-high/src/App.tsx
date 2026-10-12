import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { EventList } from './EventList';
import { depthNumber, formatStampUtc } from './format';
import { Inspector } from './Inspector';
import { inBand, MAG_STOPS, magColor, type MagStop } from './magnitude';
import { QuakeMap } from './QuakeMap';
import { regionById, REGIONS } from './regions';
import { Seismograph } from './Seismograph';
import type { DepthId, Quake, SortId, WindowId } from './types';
import { useQuakeFeed } from './useQuakeFeed';

const WINDOWS: ReadonlyArray<{ id: WindowId; label: string }> = [
  { id: 'hour', label: 'Past hour' },
  { id: 'day', label: 'Past day' },
  { id: 'week', label: 'Past week' },
  { id: 'month', label: 'Past month' },
];

const DEPTHS: ReadonlyArray<{ id: DepthId; label: string }> = [
  { id: 'any', label: 'Any depth' },
  { id: 'shallow', label: 'Shallow, under 70 km' },
  { id: 'intermediate', label: 'Intermediate, 70 to 300 km' },
  { id: 'deep', label: 'Deep, over 300 km' },
];

const SORTS: ReadonlyArray<{ id: SortId; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'largest', label: 'Largest' },
  { id: 'shallowest', label: 'Shallowest' },
  { id: 'deepest', label: 'Deepest' },
];

function matchesDepth(depth: number, id: DepthId): boolean {
  if (id === 'shallow') return depth < 70;
  if (id === 'intermediate') return depth >= 70 && depth <= 300;
  if (id === 'deep') return depth > 300;
  return true;
}

function compareQuakes(sort: SortId) {
  return (a: Quake, b: Quake) => {
    if (sort === 'largest') return b.mag - a.mag || b.time - a.time;
    if (sort === 'shallowest') return a.depth - b.depth || b.mag - a.mag;
    if (sort === 'deepest') return b.depth - a.depth || b.mag - a.mag;
    return b.time - a.time;
  };
}

export function App() {
  const [windowId, setWindowId] = useState<WindowId>('week');
  const [minMag, setMinMag] = useState(0);
  const [bandId, setBandId] = useState<string | null>(null);
  const [depth, setDepth] = useState<DepthId>('any');
  const [sort, setSort] = useState<SortId>('newest');
  const [query, setQuery] = useState('');
  const [quakesOnly, setQuakesOnly] = useState(true);
  const [tsunamiOnly, setTsunamiOnly] = useState(false);
  const [regionId, setRegionId] = useState('world');
  const [viewToken, setViewToken] = useState(0);
  const [frameToken, setFrameToken] = useState(0);
  const skipFrame = useRef(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { status, quakes, meta, error, refresh } = useQuakeFeed(windowId);

  const region = regionById(regionId);
  const band = MAG_STOPS.find((stop) => stop.id === bandId) ?? null;
  const windowLabel = WINDOWS.find((item) => item.id === windowId)?.label ?? 'Past week';

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (skipFrame.current) {
      skipFrame.current = false;
      return;
    }
    const timer = window.setTimeout(() => setFrameToken((token) => token + 1), 280);
    return () => window.clearTimeout(timer);
  }, [query, minMag, bandId, depth, quakesOnly, tsunamiOnly, windowId]);

  const scoped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return quakes.filter((quake) => {
      if (quakesOnly && quake.type.toLowerCase() !== 'earthquake') return false;
      if (tsunamiOnly && !quake.tsunami) return false;
      if (!region.contains(quake.lon, quake.lat)) return false;
      if (!matchesDepth(quake.depth, depth)) return false;
      if (needle && !quake.place.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [quakes, quakesOnly, tsunamiOnly, region, depth, query]);

  const visible = useMemo(() => {
    return scoped.filter((quake) => {
      if (quake.mag < minMag) return false;
      if (band && !inBand(quake.mag, band)) return false;
      return true;
    });
  }, [scoped, minMag, band]);

  const ordered = useMemo(() => [...visible].sort(compareQuakes(sort)), [visible, sort]);

  const summary = useMemo(() => {
    let strongest: Quake | null = null;
    let deepest: Quake | null = null;
    const counts: Record<string, number> = {};
    for (const stop of MAG_STOPS) counts[stop.id] = 0;
    for (const quake of scoped) {
      const stop = MAG_STOPS.find((item) => inBand(quake.mag, item));
      if (stop) counts[stop.id] += 1;
    }
    for (const quake of visible) {
      if (!strongest || quake.mag > strongest.mag) strongest = quake;
      if (!deepest || quake.depth > deepest.depth) deepest = quake;
    }
    return { strongest, deepest, counts };
  }, [scoped, visible]);

  const selected = useMemo(
    () => visible.find((quake) => quake.id === selectedId) ?? null,
    [visible, selectedId],
  );

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  const selectQuake = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const filtersDirty =
    minMag > 0 ||
    bandId !== null ||
    depth !== 'any' ||
    sort !== 'newest' ||
    query.trim() !== '' ||
    !quakesOnly ||
    tsunamiOnly ||
    regionId !== 'world';

  function resetFilters() {
    setMinMag(0);
    setBandId(null);
    setDepth('any');
    setSort('newest');
    setQuery('');
    setQuakesOnly(true);
    setTsunamiOnly(false);
    setRegionId('world');
    setViewToken((token) => token + 1);
  }

  function chooseBand(stop: MagStop) {
    if (bandId === stop.id) {
      setBandId(null);
      setMinMag(0);
      return;
    }
    setBandId(stop.id);
    setMinMag(stop.min);
  }

  function chooseRegion(id: string) {
    setRegionId(id);
    setSelectedId(null);
    setViewToken((token) => token + 1);
  }

  return (
    <div className="app" aria-busy={status === 'loading'}>
      <aside className="rail">
        <header className="mast">
          <div className="mast-row">
            <h1>Grok 4.7</h1>
            <button type="button" className="text-btn" onClick={refresh} disabled={status === 'loading'}>
              {status === 'loading' ? <span className="loading-word">Loading</span> : 'Refresh'}
            </button>
          </div>
          <p className="lede">
            {meta ? `${meta.title}. Generated ${formatStampUtc(meta.generated)}.` : 'Live earthquakes from USGS.'}
          </p>
          {error ? (
            <p className="error-line" role="alert">
              {error}{' '}
              <button type="button" className="text-btn" onClick={refresh}>
                Try again
              </button>
            </p>
          ) : null}
        </header>

        <div className="stats">
          <div className="stat">
            <span className="stat-k">On map</span>
            <span className="stat-v">{visible.length.toLocaleString()}</span>
          </div>
          <button
            type="button"
            className="stat"
            disabled={!summary.strongest}
            onClick={() => summary.strongest && selectQuake(summary.strongest.id)}
            aria-label={
              summary.strongest
                ? `Show strongest, magnitude ${summary.strongest.mag.toFixed(1)}`
                : 'Strongest'
            }
          >
            <span className="stat-k">Strongest</span>
            <span
              className="stat-v"
              style={{ color: summary.strongest ? magColor(summary.strongest.mag) : undefined }}
            >
              {summary.strongest ? summary.strongest.mag.toFixed(1) : '—'}
            </span>
          </button>
          <button
            type="button"
            className="stat"
            disabled={!summary.deepest}
            onClick={() => summary.deepest && selectQuake(summary.deepest.id)}
            aria-label={summary.deepest ? `Show deepest, ${depthNumber(summary.deepest.depth)} kilometers` : 'Deepest'}
          >
            <span className="stat-k">Deepest</span>
            <span className="stat-v">
              {summary.deepest ? depthNumber(summary.deepest.depth) : '—'}
              {summary.deepest ? <span className="stat-u"> km</span> : null}
            </span>
          </button>
        </div>

        <Seismograph quakes={visible} selectedId={selected?.id ?? null} onSelect={selectQuake} onHover={setHoverId} />

        <div className="controls">
          <div className="field">
            <span>Time window</span>
            <div className="segment" role="group" aria-label="Time window">
              {WINDOWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === windowId}
                  onClick={() => setWindowId(item.id)}
                >
                  {item.label.replace('Past ', '')}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field-top">
              <span>Minimum magnitude</span>
              <span className="field-value">{minMag.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={8}
              step={0.1}
              value={Math.min(minMag, 8)}
              aria-valuetext={minMag.toFixed(1)}
              onChange={(event) => {
                setBandId(null);
                setMinMag(Math.round(Number(event.target.value) * 10) / 10);
              }}
            />
          </label>
          {band ? <p className="hint">Color filter is {band.label.toLowerCase()}, {band.hint}. Move the slider to clear it.</p> : null}

          <div className="pair">
            <label className="field">
              <span>Depth</span>
              <select value={depth} onChange={(event) => setDepth(event.target.value as DepthId)}>
                {DEPTHS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Map region</span>
            <select value={regionId} onChange={(event) => chooseRegion(event.target.value)}>
              {REGIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Place</span>
            <input
              type="search"
              value={query}
              placeholder="Search place"
              aria-label="Search place"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="checks">
            <label className="check">
              <input type="checkbox" checked={quakesOnly} onChange={(event) => setQuakesOnly(event.target.checked)} />
              Earthquakes only
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={tsunamiOnly}
                onChange={(event) => setTsunamiOnly(event.target.checked)}
              />
              Tsunami flag
            </label>
          </div>
          {filtersDirty ? (
            <button type="button" className="text-btn" onClick={resetFilters}>
              Clear filters
            </button>
          ) : null}
        </div>

        <p className="shown" aria-live="polite">
          {status === 'loading' && quakes.length === 0
            ? `Fetching the ${windowLabel.toLowerCase()} from USGS.`
            : `${ordered.length.toLocaleString()} shown${
                quakes.length !== ordered.length ? ` · ${quakes.length.toLocaleString()} in the feed` : ''
              }`}
        </p>

        {status === 'loading' && quakes.length === 0 ? (
          <p className="empty">Fetching the {windowLabel.toLowerCase()} from USGS.</p>
        ) : status === 'error' && quakes.length === 0 ? (
          <div className="empty">
            <p>{error}</p>
            <button type="button" className="text-btn" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : (
          <EventList
            quakes={ordered}
            selectedId={selected?.id ?? null}
            hoverId={hoverId}
            now={now}
            onSelect={selectQuake}
            onHover={setHoverId}
            onReset={resetFilters}
            canReset={filtersDirty}
          />
        )}
      </aside>

      <main className={selected ? 'stage has-selection' : 'stage'}>
        <QuakeMap
          quakes={visible}
          selected={selected}
          hoverId={hoverId}
          onSelect={selectQuake}
          onHover={setHoverId}
          viewToken={viewToken}
          viewCenter={region.center}
          viewZoom={region.zoom}
          frameToken={frameToken}
        />
        <div className="legend">
          <p>
            Color is magnitude. Colder means smaller. White is 7 or above. A ring marks the last 3 hours.
            {minMag > 0 || band ? ' Totals skip the magnitude cut.' : ''}
          </p>
          <div className="swatches" role="group" aria-label="Magnitude colors">
            {MAG_STOPS.map((stop) => (
              <button
                key={stop.id}
                type="button"
                className="swatch"
                style={{ '--c': stop.color } as CSSProperties}
                aria-pressed={bandId === stop.id}
                aria-label={`${stop.label}, ${stop.hint}, ${summary.counts[stop.id] ?? 0} events`}
                onClick={() => chooseBand(stop)}
              >
                <i />
                <span>{stop.label}</span>
                <b>{(summary.counts[stop.id] ?? 0).toLocaleString()}</b>
              </button>
            ))}
          </div>
        </div>
        {selected ? <Inspector quake={selected} onClose={() => setSelectedId(null)} /> : null}
      </main>
    </div>
  );
}
