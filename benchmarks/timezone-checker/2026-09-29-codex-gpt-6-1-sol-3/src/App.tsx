import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Globe2,
  Heart,
  MapPin,
  Moon,
  Sparkles,
  Sun,
  Users,
  Waypoints,
} from 'lucide-react';
import CityPicker from './components/CityPicker';
import Preferences from './components/Preferences';
import OverlapSummary from './components/OverlapSummary';
import TimeGrid from './components/TimeGrid';
import WorldIllustration from './components/WorldIllustration';
import { CITIES } from './lib/cities';
import { buildSchedules, formatTime, type Mode } from './lib/time';
import { loadState, saveState } from './lib/storage';

export default function App() {
  const [state, setState] = useState(loadState);
  const [now, setNow] = useState(() => new Date());
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    setSaved(saveState(state));
  }, [state]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const cities = useMemo(
    () => state.cityIds.map((id) => CITIES.find((city) => city.id === id)!).filter(Boolean),
    [state.cityIds],
  );
  const schedules = useMemo(
    () => buildSchedules(cities, state.settings, state.mode, now),
    [cities, state.settings, state.mode, now],
  );
  const addCity = (id: string) =>
    setState((previous) =>
      previous.cityIds.includes(id)
        ? previous
        : { ...previous, cityIds: [...previous.cityIds, id] },
    );
  const removeCity = (id: string) =>
    setState((previous) => ({
      ...previous,
      cityIds: previous.cityIds.filter((cityId) => cityId !== id),
    }));
  const promoteCity = (id: string) =>
    setState((previous) => ({
      ...previous,
      cityIds: [id, ...previous.cityIds.filter((cityId) => cityId !== id)],
    }));
  const changeMode = (mode: Mode) => setState((previous) => ({ ...previous, mode }));
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(now);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="#" className="brand" aria-label="GPT-6 home">
          <span className="brand-mark">
            <Globe2 size={23} strokeWidth={1.6} />
          </span>
          <span className="brand-name">GPT-6</span>
          <span className="brand-divider" />
          <span className="brand-description">A timezone companion</span>
        </a>
        <div className="header-right">
          <span className="today-date">{date}</span>
          <span className="local-first">
            <span className="status-dot" />
            Your world, in sync
          </span>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              LESS MATH. MORE CONNECTION.
            </div>
            <h1>GPT-6</h1>
            <h2>
              Different places. Same <span className="hero-accent">good timing.</span>
            </h2>
            <p>
              Find the hours that bring everyone together.
              <br className="desktop-break" /> For global teams, faraway friends, and life on the
              move.
            </p>
            <div className="hero-footnote">
              <Globe2 size={14} />
              <span>Across the world. On the same page.</span>
            </div>
          </div>
          <WorldIllustration />
        </section>

        <section className="planner" aria-label="Timezone overlap planner">
          <div className="planner-toolbar">
            <div className="mode-toggle" role="group" aria-label="Planner mode">
              <button
                className={state.mode === 'meeting' ? 'active' : ''}
                aria-pressed={state.mode === 'meeting'}
                onClick={() => changeMode('meeting')}
              >
                <Users size={16} />
                Meeting mode
              </button>
              <button
                className={state.mode === 'base' ? 'active' : ''}
                aria-pressed={state.mode === 'base'}
                onClick={() => changeMode('base')}
              >
                <Waypoints size={16} />
                Base mode
              </button>
            </div>
            <div className="toolbar-right">
              <span className="awake-window">
                <Sun size={15} />
                {formatTime(state.settings.wake * 60, state.settings.format)}
                <span className="window-dash">—</span>
                {formatTime(state.settings.sleep * 60, state.settings.format)}
                <Moon size={13} />
              </span>
              <span className="toolbar-divider" />
              <Preferences
                settings={state.settings}
                onChange={(settings) => setState((previous) => ({ ...previous, settings }))}
              />
            </div>
          </div>
          <div className="planner-content">
            <div className="planner-heading">
              <div>
                <div className="planner-title-line">
                  <h3>
                    {state.mode === 'meeting'
                      ? 'A time that works for everyone'
                      : 'Your city. Their availability.'}
                  </h3>
                  <span className="city-count">
                    {cities.length} {cities.length === 1 ? 'city' : 'cities'}
                  </span>
                </div>
                <p>
                  {state.mode === 'meeting'
                    ? 'Find a shared window across all your cities.'
                    : 'Find a separate shared window between your base and each city.'}
                </p>
              </div>
              <CityPicker selected={state.cityIds} onAdd={addCity} now={now} />
            </div>
            <OverlapSummary
              schedules={schedules}
              mode={state.mode}
              format={state.settings.format}
            />
            {cities.length === 1 && (
              <div className="single-city-note">
                <MapPin size={17} />
                <span>A good start. Add another city to find your common hours.</span>
              </div>
            )}
            {cities.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">
                  <Globe2 size={32} />
                </span>
                <h3>Your world starts with one city.</h3>
                <p>Add a city above to build your timezone planner.</p>
              </div>
            )}
            <TimeGrid
              schedules={schedules}
              format={state.settings.format}
              mode={state.mode}
              now={now}
              onPromote={promoteCity}
              onRemove={removeCity}
            />
            {!!cities.length && (
              <div className="grid-footer">
                <div className="grid-legend">
                  <span>
                    <i className="legend-dot overlap-dot" />
                    {state.mode === 'meeting' ? 'Everyone awake' : 'Shared with base'}
                  </span>
                  <span>
                    <i className="legend-dot awake-dot" />
                    Awake
                  </span>
                  <span>
                    <i className="legend-dot sleeping-dot" />
                    Sleeping
                  </span>
                </div>
                <span className="reference-hint">
                  <ArrowUpRight size={13} />
                  Click a city name to make it your reference
                </span>
              </div>
            )}
          </div>
          <div className="planner-bottom">
            <span>
              <span className="status-dot" />
              {state.mode === 'meeting'
                ? 'Green cells = everyone awake'
                : 'Green cells = awake together with your base'}
            </span>
            <span className="saved-label">
              {saved ? <Check size={13} /> : <Moon size={13} />}{' '}
              {saved ? 'Your setup is saved automatically' : 'Your setup is saved for this visit'}
            </span>
          </div>
        </section>

        <section className="guide-section" aria-label="How it works">
          <div className="guide-intro">
            <span className="guide-eyebrow">A LITTLE FIELD GUIDE</span>
            <h3>
              Good meetings
              <br />
              start with good timing.
            </h3>
            <a href="#planner-tip" className="guide-link">
              Make yourself at home
              <ArrowDown size={13} />
            </a>
          </div>
          <div className="guide-card">
            <span className="guide-icon">
              <Users size={20} strokeWidth={1.6} />
            </span>
            <h4>Bring everyone together.</h4>
            <p>
              Meeting mode finds the hours when every city is awake. One shared window for the whole
              crew.
            </p>
          </div>
          <div className="guide-card">
            <span className="guide-icon">
              <MapPin size={20} strokeWidth={1.6} />
            </span>
            <h4>Make somewhere your base.</h4>
            <p>
              Base mode compares each city with yours. Perfect for finding time with people, one by
              one.
            </p>
          </div>
          <div className="guide-card">
            <span className="guide-icon">
              <Sun size={20} strokeWidth={1.6} />
            </span>
            <h4>Work with your rhythm.</h4>
            <p>
              Early bird or night owl? Set your waking hours in Preferences. We’ll take care of the
              timezone math.
            </p>
          </div>
        </section>
        <div className="bottom-tip" id="planner-tip">
          <Sparkles size={15} />
          <p>
            A small tip: your reference city sets the grid’s clock. Click any city name to change
            your point of view.
          </p>
        </div>
      </main>
      <footer className="site-footer">
        <span>
          <Globe2 size={14} />
          Less timezone math. More human connection.
        </span>
        <span>
          Built for a world that works together.
          <Heart size={13} />
        </span>
      </footer>
    </div>
  );
}
