import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './scene/Scene.jsx';
import { FOOD_LIST } from './game/foods.js';
import { useGame } from './game/useGame.js';

const MOOD_LABEL = {
  happy: 'Happy',
  hungry: 'Hungry',
  sad: 'Sad',
  tired: 'Tired',
  dirty: 'Dirty',
  sleeping: 'Sleeping',
};

const BARS = [
  { key: 'fullness', label: 'Full', color: '#ff8a5c' },
  { key: 'joy', label: 'Joy', color: '#ff5c8a' },
  { key: 'energy', label: 'Energy', color: '#ffd23f' },
  { key: 'clean', label: 'Clean', color: '#5ac8fa' },
];

export default function App() {
  const { state, feed, play, wash, pet, toggleSleep } = useGame();
  const { stats, sleeping, mood, msg } = state;
  const busy = state.busyUntil > state.clock;

  // Keep the clock fresh so the busy state updates between game ticks.
  const [, force] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const id = setTimeout(() => force((n) => n + 1), state.busyUntil - state.clock + 20);
    return () => clearTimeout(id);
  }, [busy, state.busyUntil, state.clock]);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Claude Haiku 5.5</h1>
        <span className={`mood mood-${mood}`}>{MOOD_LABEL[mood]}</span>
      </header>

      <Canvas
        className="stage"
        dpr={[1, 2]}
        shadows
        camera={{ position: [0, 3.2, 9], fov: 40, near: 0.1, far: 100 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.6, 0.8)}
        gl={{ antialias: true }}
      >
        <Scene
          mood={mood}
          sleeping={sleeping}
          cleanliness={stats.clean}
          onFeed={feed}
          onPet={pet}
        />
      </Canvas>

      {msg && (
        <div className="bubble" key={msg.id}>
          {msg.text}
        </div>
      )}

      <aside className="panel">
        {BARS.map((b) => (
          <div className="bar" key={b.key}>
            <div className="bar-head">
              <span>{b.label}</span>
              <span>{Math.round(stats[b.key])}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${stats[b.key]}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
        <p className="hint">Tap Cowdie to pet. Tap food on the table or below.</p>
      </aside>

      <nav className="actions">
        <div className="group">
          {FOOD_LIST.map((f) => (
            <button
              key={f.id}
              className="action food"
              onClick={() => feed(f.id)}
              disabled={busy || sleeping}
              title={`Feed ${f.label}`}
            >
              <span className="icon">{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
        <div className="group">
          <button className="action" onClick={play} disabled={busy || sleeping}>
            <span className="icon">🎾</span>
            <span>Play</span>
          </button>
          <button className="action" onClick={wash} disabled={busy || sleeping}>
            <span className="icon">🫧</span>
            <span>Wash</span>
          </button>
          <button className="action" onClick={toggleSleep}>
            <span className="icon">{sleeping ? '☀️' : '🌙'}</span>
            <span>{sleeping ? 'Wake' : 'Sleep'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
