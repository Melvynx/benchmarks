import { useState, useCallback } from "react";
import { useClock } from "./useClock";
import { useSettings } from "./useSettings";
import { TimezoneCard } from "./TimezoneCard";
import { CitySearch } from "./CitySearch";
import { SettingsPanel } from "./SettingsPanel";
import "./App.css";

function makeDefaultCards() {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const id1 = crypto.randomUUID();
  const id2 = crypto.randomUUID();
  const secondary = userTz === "America/New_York" ? "Asia/Tokyo" : "America/New_York";
  return {
    cards: [
      { id: id1, timezone: userTz, city: "Your Location", country: "Local" },
      {
        id: id2,
        timezone: secondary,
        city: secondary === "Asia/Tokyo" ? "Tokyo" : "New York",
        country: secondary === "Asia/Tokyo" ? "Japan" : "USA",
      },
    ],
    primaryId: id1,
  };
}

const defaults = makeDefaultCards();

export default function App() {
  const [cards, setCards] = useState(defaults.cards);
  const [primaryId, setPrimaryId] = useState(defaults.primaryId);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, updateSettings } = useSettings();
  const now = useClock();

  const primaryCard = cards.find((c) => c.id === primaryId) || cards[0];

  const addCard = useCallback(
    (city) => {
      if (cards.length >= 5) return;
      setCards((prev) => [...prev, { id: crypto.randomUUID(), ...city }]);
    },
    [cards.length]
  );

  const removeCard = useCallback(
    (id) => {
      setCards((prev) => prev.filter((c) => c.id !== id));
      setPrimaryId((prev) => {
        if (prev !== id) return prev;
        const remaining = cards.filter((c) => c.id !== id);
        return remaining[0]?.id ?? null;
      });
    },
    [cards]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Claude Sonnet 4.6</h1>
          <span className="app-subtitle">Timezone Overlap Checker</span>
        </div>
        <div className="header-right">
          <CitySearch onAdd={addCard} disabled={cards.length >= 5} existing={cards} />
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="cards-container">
        {cards.map((card) => (
          <TimezoneCard
            key={card.id}
            card={card}
            isPrimary={card.id === primaryCard?.id}
            onSetPrimary={() => setPrimaryId(card.id)}
            onRemove={() => removeCard(card.id)}
            primaryTimezone={primaryCard?.timezone}
            settings={settings}
            now={now}
          />
        ))}
        {cards.length < 5 && (
          <div className="add-hint">
            <span>Search a city above to add up to {5 - cards.length} more</span>
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
