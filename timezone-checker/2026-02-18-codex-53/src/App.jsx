import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { CITY_DATA } from './data/cities';
import {
  buildPrimaryUtcRange,
  computeOverlapHours,
  formatHourLabel,
  formatLocalTime,
  formatUtcOffset,
  getOffsetMinutes,
  normalizeSearch,
  isHourInWindow,
} from './utils/timezone';

const SETTINGS_STORAGE_KEY = 'gpt5-timezone-settings-v1';
const MAX_CARDS = 5;
const MIN_CARDS = 2;

const DEFAULT_SETTINGS = {
  timeFormat: '24',
  workStart: 9,
  workEnd: 18,
  wakeStart: 7,
  wakeEnd: 9,
};

function makeCityKey(city) {
  return `${city.city}|${city.country}|${city.timeZone}`;
}

function getHourOptions() {
  return Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: formatHourLabel(hour),
  }));
}

function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_SETTINGS;
  }

  const readHour = (value, fallback) => {
    const number = Number(value);
    if (Number.isInteger(number) && number >= 0 && number <= 23) {
      return number;
    }
    return fallback;
  };

  return {
    timeFormat: raw.timeFormat === '12' ? '12' : '24',
    workStart: readHour(raw.workStart, DEFAULT_SETTINGS.workStart),
    workEnd: readHour(raw.workEnd, DEFAULT_SETTINGS.workEnd),
    wakeStart: readHour(raw.wakeStart, DEFAULT_SETTINGS.wakeStart),
    wakeEnd: readHour(raw.wakeEnd, DEFAULT_SETTINGS.wakeEnd),
  };
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }
    return sanitizeSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getDetectedTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function findPreferredCityByTimeZone(timeZone) {
  const major = CITY_DATA.find((city) => city.timeZone === timeZone && city.tags?.includes('major'));
  if (major) {
    return major;
  }

  const fallback = CITY_DATA.find((city) => city.timeZone === timeZone);
  if (fallback) {
    return fallback;
  }

  return {
    city: timeZone.split('/').at(-1)?.replace(/_/g, ' ') ?? 'Detected Zone',
    country: 'Detected',
    timeZone,
    tags: ['major'],
  };
}

function createInitialCards() {
  const userTimeZone = getDetectedTimeZone();
  const primary = findPreferredCityByTimeZone(userTimeZone);

  const secondaryZone = userTimeZone === 'America/New_York' ? 'Asia/Tokyo' : 'America/New_York';
  let secondary = findPreferredCityByTimeZone(secondaryZone);

  if (secondary.timeZone === primary.timeZone) {
    secondary = findPreferredCityByTimeZone('Asia/Tokyo');
  }

  return [
    { id: 1, ...primary },
    { id: 2, ...secondary },
  ];
}

function App() {
  const hourOptions = useMemo(() => getHourOptions(), []);
  const indexedCities = useMemo(
    () =>
      CITY_DATA.map((city) => ({
        ...city,
        searchText: normalizeSearch(`${city.city} ${city.country}`),
      })),
    [],
  );

  const initialCards = useMemo(() => createInitialCards(), []);
  const nextIdRef = useRef(initialCards.length + 1);
  const removalTimersRef = useRef(new Map());

  const [now, setNow] = useState(() => new Date());
  const [cards, setCards] = useState(initialCards);
  const [primaryId, setPrimaryId] = useState(initialCards[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [removingCardIds, setRemovingCardIds] = useState(() => new Set());

  const selectedCardKeys = useMemo(() => new Set(cards.map(makeCityKey)), [cards]);

  const filteredCities = useMemo(() => {
    const needle = normalizeSearch(search);
    const source =
      needle.length === 0
        ? indexedCities.filter((city) => city.tags?.includes('major'))
        : indexedCities;

    return source
      .filter((city) => !selectedCardKeys.has(makeCityKey(city)))
      .filter((city) => city.searchText.includes(needle))
      .slice(0, 12);
  }, [indexedCities, search, selectedCardKeys]);

  const primaryCard = cards.find((card) => card.id === primaryId) ?? cards[0];

  const primaryRange = useMemo(() => {
    if (!primaryCard) {
      return null;
    }
    return buildPrimaryUtcRange(primaryCard.timeZone, settings.workStart, settings.workEnd, now);
  }, [primaryCard, settings.workStart, settings.workEnd, now]);

  const overlapMap = useMemo(() => {
    const map = new Map();
    if (!primaryRange) {
      return map;
    }

    for (const card of cards) {
      map.set(card.id, computeOverlapHours(card.timeZone, primaryRange, now));
    }

    return map;
  }, [cards, now, primaryRange]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(
    () => () => {
      for (const timeoutId of removalTimersRef.current.values()) {
        clearTimeout(timeoutId);
      }
      removalTimersRef.current.clear();
    },
    [],
  );

  const canAddCard = cards.length < MAX_CARDS && filteredCities.length > 0;

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAddCity(city) {
    if (!city || cards.length >= MAX_CARDS) {
      return;
    }

    const key = makeCityKey(city);
    if (selectedCardKeys.has(key)) {
      return;
    }

    const next = { ...city, id: nextIdRef.current };
    nextIdRef.current += 1;
    setCards((current) => [...current, next]);
    setSearch('');
  }

  function handleRemoveCard(cardId) {
    if (cards.length <= MIN_CARDS || removingCardIds.has(cardId)) {
      return;
    }

    setRemovingCardIds((current) => {
      const next = new Set(current);
      next.add(cardId);
      return next;
    });

    const timeoutId = window.setTimeout(() => {
      setCards((current) => current.filter((card) => card.id !== cardId));
      setRemovingCardIds((current) => {
        const next = new Set(current);
        next.delete(cardId);
        return next;
      });
      removalTimersRef.current.delete(cardId);
    }, 220);

    removalTimersRef.current.set(cardId, timeoutId);
  }

  return (
    <div className="app-shell">
      <div className="aura aura-left" aria-hidden="true" />
      <div className="aura aura-right" aria-hidden="true" />

      <header className="topbar">
        <div>
          <h1>GPT-5</h1>
          <p className="subtitle">Timezone overlap checker for distributed teams</p>
        </div>

        <button
          type="button"
          className={`settings-toggle ${settingsOpen ? 'is-open' : ''}`}
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Toggle settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <section className="search-panel">
        <div className="search-headline">
          <span>City search</span>
          <small>{cards.length} / {MAX_CARDS} cards active</small>
        </div>

        <div className="search-controls">
          <label htmlFor="city-search" className="visually-hidden">
            Search city or country
          </label>
          <input
            id="city-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search city or country"
            className="city-input"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddCity(filteredCities[0]);
              }
            }}
          />

          <button type="button" className="add-button" onClick={() => handleAddCity(filteredCities[0])} disabled={!canAddCard}>
            Add timezone
          </button>
        </div>

        {filteredCities.length > 0 && (
          <div className="search-results" role="listbox" aria-label="City suggestions">
            {filteredCities.map((city) => (
              <button
                key={makeCityKey(city)}
                type="button"
                className="search-result-item"
                onClick={() => handleAddCity(city)}
              >
                <strong>{city.city}</strong>
                <span>
                  {city.country} • {city.timeZone}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {settingsOpen && (
        <section className="settings-panel" aria-label="Settings panel">
          <div className="setting-row compact">
            <label>Time format</label>
            <div className="segmented-control" role="group" aria-label="Time format">
              <button
                type="button"
                className={settings.timeFormat === '12' ? 'is-active' : ''}
                onClick={() => updateSetting('timeFormat', '12')}
              >
                12h
              </button>
              <button
                type="button"
                className={settings.timeFormat === '24' ? 'is-active' : ''}
                onClick={() => updateSetting('timeFormat', '24')}
              >
                24h
              </button>
            </div>
          </div>

          <div className="setting-row">
            <label>Working hours</label>
            <div className="hour-range">
              <select
                value={settings.workStart}
                onChange={(event) => updateSetting('workStart', Number(event.target.value))}
              >
                {hourOptions.map((option) => (
                  <option key={`work-start-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span>to</span>
              <select
                value={settings.workEnd}
                onChange={(event) => updateSetting('workEnd', Number(event.target.value))}
              >
                {hourOptions.map((option) => (
                  <option key={`work-end-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="setting-row">
            <label>Wake-up window</label>
            <div className="hour-range">
              <select
                value={settings.wakeStart}
                onChange={(event) => updateSetting('wakeStart', Number(event.target.value))}
              >
                {hourOptions.map((option) => (
                  <option key={`wake-start-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span>to</span>
              <select
                value={settings.wakeEnd}
                onChange={(event) => updateSetting('wakeEnd', Number(event.target.value))}
              >
                {hourOptions.map((option) => (
                  <option key={`wake-end-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      <section className="legend" aria-label="Legend">
        <span className="legend-item overlap">Overlap</span>
        <span className="legend-item wake">Wake-up window</span>
        <span className="legend-item day">Daylight</span>
        <span className="legend-item night">Night</span>
      </section>

      <section className="cards-rack" aria-label="Timezone cards">
        {cards.map((card) => {
          const overlap = overlapMap.get(card.id) ?? { hours: Array(24).fill(false), hasOverlap: false };
          const offset = formatUtcOffset(getOffsetMinutes(card.timeZone, now));
          const isPrimary = card.id === primaryCard?.id;
          const cannotDelete = cards.length <= MIN_CARDS;

          return (
            <article
              key={card.id}
              className={`timezone-card ${isPrimary ? 'is-primary' : ''} ${removingCardIds.has(card.id) ? 'is-removing' : ''}`}
            >
              <header className="card-header">
                <button type="button" className="card-main" onClick={() => setPrimaryId(card.id)}>
                  <span className="card-city">{card.city}</span>
                  <span className="card-country">{card.country}</span>
                  <span className="card-timezone">{card.timeZone}</span>
                </button>

                <button
                  type="button"
                  className="card-delete"
                  onClick={() => handleRemoveCard(card.id)}
                  disabled={cannotDelete}
                  aria-label={`Remove ${card.city}`}
                  title={cannotDelete ? 'At least two cards are required' : `Remove ${card.city}`}
                >
                  ×
                </button>
              </header>

              <div className="card-meta">
                <span className="live-time">{formatLocalTime(now, card.timeZone, settings.timeFormat)}</span>
                <span className="offset">{offset}</span>
                {isPrimary && <span className="primary-pill">Primary</span>}
              </div>

              {!overlap.hasOverlap && <p className="no-overlap">No overlap</p>}

              <div className="hour-grid" role="img" aria-label={`24-hour overlap grid for ${card.city}`}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const night = hour <= 6 || hour >= 20;
                  const wake = isHourInWindow(hour, settings.wakeStart, settings.wakeEnd);
                  const overlapsPrimary = overlap.hours[hour];

                  const classNames = [
                    'hour-cell',
                    overlapsPrimary ? 'is-overlap' : wake ? 'is-wake' : night ? 'is-night' : 'is-day',
                  ];

                  return (
                    <div
                      key={`${card.id}-${hour}`}
                      className={classNames.join(' ')}
                      title={`${formatHourLabel(hour)} • ${overlapsPrimary ? 'Overlaps primary work hours' : wake ? 'Wake-up window' : night ? 'Night time' : 'Day time'}`}
                    >
                      {hour}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default App;
