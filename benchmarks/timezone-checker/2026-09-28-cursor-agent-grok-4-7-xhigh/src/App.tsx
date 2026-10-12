import { useMemo } from 'react';
import { DesktopBoard } from './components/DesktopBoard';
import { Hero } from './components/Hero';
import { MobileBoard } from './components/MobileBoard';
import { CityPicker } from './components/CityPicker';
import { SettingsPanel } from './components/SettingsPanel';
import { Summary } from './components/Summary';
import { useBoardState } from './hooks/useBoardState';
import { useMaxWidth, useNow } from './hooks/useUi';
import { buildBoard } from './lib/board';

export function App() {
  const { state, dispatch } = useBoardState();
  const now = useNow();
  const mobile = useMaxWidth(767);
  const board = useMemo(() => buildBoard(state, now), [state, now]);

  return (
    <div className="app" data-mode={state.mode} data-layout={mobile ? 'mobile' : 'desktop'}>
      <Hero mode={state.mode} onChange={(mode) => dispatch({ type: 'mode', mode })} />
      <main className="shell">
        <section className="panel" aria-label="Overlap board">
          <div className="controls">
            <CityPicker
              selectedIds={state.cityIds}
              now={now}
              onAdd={(id) => dispatch({ type: 'add', id })}
            />
            <SettingsPanel
              wake={state.wake}
              sleep={state.sleep}
              format={state.format}
              windowLabel={board.windowLabel}
              onWake={(hour) => dispatch({ type: 'wake', hour })}
              onSleep={(hour) => dispatch({ type: 'sleep', hour })}
              onFormat={(format) => dispatch({ type: 'format', format })}
              onReset={() => dispatch({ type: 'reset' })}
            />
          </div>
          <Summary summary={board.summary} />
          {board.rows.length === 0 ? (
            <div className="empty">
              <p>Add a city to build the day.</p>
            </div>
          ) : mobile ? (
            <MobileBoard
              board={board}
              onPromote={(id) => dispatch({ type: 'promote', id })}
              onRemove={(id) => dispatch({ type: 'remove', id })}
            />
          ) : (
            <DesktopBoard
              board={board}
              onPromote={(id) => dispatch({ type: 'promote', id })}
              onRemove={(id) => dispatch({ type: 'remove', id })}
            />
          )}
          <footer className="foot">
            <ul className="legend" aria-label="Cell states">
              <li>
                <i className="swatch" data-state="overlap" /> Overlap
              </li>
              <li>
                <i className="swatch" data-state="awake" /> Awake
              </li>
              <li>
                <i className="swatch" data-state="sleep" /> Asleep
              </li>
            </ul>
            <p className="hint">{board.hint}</p>
          </footer>
        </section>
      </main>
    </div>
  );
}
