import { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, Check, Clock3, Globe2, MapPin, Sun, Users } from 'lucide-react';
import { CITIES, DEFAULTS, formatTime, calculate, restore } from './time';
import WorldArtwork from './components/WorldArtwork';
import Preferences from './components/Preferences';
import CityPicker from './components/CityPicker';
import OverlapSummary from './components/OverlapSummary';
import TimeGrid from './components/TimeGrid';

export default function App() {
  const [settings, setSettings] = useState(restore);
  const [now, setNow] = useState(() => new Date());
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('common-hours-v1', JSON.stringify(settings));
      setSaved(true);
    } catch { setSaved(false); }
  }, [settings]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const cities = useMemo(() => settings.cityIds.map(id => CITIES.find(city => city.id === id)), [settings.cityIds]);
  const { rows, windows } = useMemo(() => calculate(cities, settings, now), [cities, settings, now]);
  const reference = rows[0];
  const update = patch => setSettings(current => ({ ...current, ...patch }));
  const date = now.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', ...(reference ? { timeZone: reference.zone } : {}),
  });

  function addCity(id) {
    setSettings(current => current.cityIds.includes(id) ? current : { ...current, cityIds: [...current.cityIds, id] });
  }
  function removeCity(id) {
    setSettings(current => ({ ...current, cityIds: current.cityIds.filter(cityId => cityId !== id) }));
  }
  function promoteCity(id) {
    setSettings(current => ({ ...current, cityIds: [id, ...current.cityIds.filter(cityId => cityId !== id)] }));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="./" className="brand" aria-label="GPT-6 home">
          <span className="brand-symbol"><Globe2 size={22} /></span>
          <span className="brand-wordmark">a little time in common<span className="brand-period">.</span></span>
        </a>
        <div className="header-note"><span className="status-dot" /> A smaller world, one meeting at a time <Globe2 size={15} /></div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span />GOOD TIMING. GREAT CONNECTIONS.</div>
            <h1>GPT-6</h1>
            <p>Different places. <span>A little time in common.</span><br />Find the hours that bring your world together.</p>
            <div className="hero-footnote"><span className="tiny-globes"><Globe2 size={13} /></span>Made for teams without borders.</div>
          </div>
          <WorldArtwork />
        </section>
        <section className="workspace" aria-label="Timezone overlap checker">
          <div className="workspace-toolbar">
            <div className="mode-switch" aria-label="Comparison mode">
              <button className={settings.mode === 'meeting' ? 'active' : ''} aria-pressed={settings.mode === 'meeting'} onClick={() => update({ mode: 'meeting' })}>
                <Users size={16} />Meeting mode
              </button>
              <button className={settings.mode === 'base' ? 'active' : ''} aria-pressed={settings.mode === 'base'} onClick={() => update({ mode: 'base' })}>
                <MapPin size={16} />Base mode
              </button>
            </div>
            <div className="toolbar-actions">
              <span className="schedule-caption"><Sun size={15} />{formatTime(settings.wake * 60, settings.format)} <span>–</span> {formatTime(settings.sleep * 60, settings.format)}</span>
              <Preferences settings={settings} onChange={update} />
            </div>
          </div>
          <div className="mode-description">
            {settings.mode === 'meeting' ? <><Users size={14} />Find a shared window when everyone is awake.</> : (
              <><MapPin size={14} />Find each city’s shared availability with {reference?.name || 'your reference city'}.</>
            )}
          </div>
          <OverlapSummary rows={rows} windows={windows} mode={settings.mode} format={settings.format} />
          <div className="grid-section">
            <div className="grid-titlebar">
              <div>
                <h2>Your world, aligned <span>{cities.length} {cities.length === 1 ? 'city' : 'cities'}</span></h2>
                <p>Click a city’s name to make it your reference.</p>
              </div>
              <CityPicker cityIds={settings.cityIds} onAdd={addCity} />
            </div>
            <TimeGrid rows={rows} settings={settings} onPromote={promoteCity} onRemove={removeCity} onRestore={() => update({ cityIds: DEFAULTS.cityIds })} />
          </div>
          <div className="workspace-bottom">
            <span><span className="green-dot" />{settings.mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = awake together with your base'}</span>
            <span><Check size={13} />{saved ? 'Changes saved automatically' : 'Browser storage unavailable'}</span>
          </div>
        </section>
        <section className="below-workspace">
          <div className="help-tip">
            <span className="tip-icon"><Sun size={18} /></span>
            <p>A good meeting starts with a good time.<br /><span>Adjust your awake hours in Preferences to find your perfect overlap.</span></p>
          </div>
          <div className="date-note"><Clock3 size={13} /><span>{date}<small>Daylight saving, taken care of.</small></span></div>
        </section>
      </main>
      <footer className="site-footer">
        <span>Less calculating. <span>More connecting.</span></span>
        <span>Built for a world that works together <ArrowUpRight size={13} /></span>
      </footer>
    </div>
  );
}
