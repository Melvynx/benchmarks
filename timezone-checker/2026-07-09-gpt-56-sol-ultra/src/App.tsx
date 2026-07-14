import { ArrowRight, CircleHelp } from 'lucide-react';

import { AppHeader } from './components/AppHeader';
import { CityCombobox } from './components/CityCombobox';
import { DesktopTimeGrid } from './components/DesktopTimeGrid';
import { EmptyBoard } from './components/EmptyBoard';
import { GridLegend } from './components/GridLegend';
import { MobileTimeGrid } from './components/MobileTimeGrid';
import { ModeSwitch } from './components/ModeSwitch';
import { OverlapSummary } from './components/OverlapSummary';
import { SettingsControl } from './components/SettingsControl';
import { CITY_BY_ID } from './data/cities';
import { useCurrentDate } from './hooks/useCurrentDate';
import { DEFAULT_APP_STATE, usePersistentAppState } from './hooks/usePersistentAppState';
import { buildComparisonModel } from './lib/timezone';
import type { AppState, City } from './types';

function App() {
  const [state, setState] = usePersistentAppState();
  const currentDate = useCurrentDate();
  const selectedCities = state.cityIds.flatMap((cityId) => {
    const city = CITY_BY_ID.get(cityId);
    return city ? [city] : [];
  });
  const comparisonModel = buildComparisonModel(
    selectedCities,
    state.mode,
    state.wakeHour,
    state.sleepHour,
    currentDate,
  );

  const updateState = <Key extends keyof AppState>(key: Key, value: AppState[Key]) => {
    setState((currentState) => ({ ...currentState, [key]: value }));
  };

  const addCity = (city: City) => {
    setState((currentState) => {
      if (currentState.cityIds.includes(city.id)) return currentState;
      return { ...currentState, cityIds: [...currentState.cityIds, city.id] };
    });
  };

  const removeCity = (cityId: string) => {
    setState((currentState) => ({
      ...currentState,
      cityIds: currentState.cityIds.filter((id) => id !== cityId),
    }));
  };

  const promoteCity = (cityId: string) => {
    setState((currentState) => {
      if (currentState.cityIds[0] === cityId) return currentState;
      return {
        ...currentState,
        cityIds: [cityId, ...currentState.cityIds.filter((id) => id !== cityId)],
      };
    });
  };

  return (
    <div className="app">
      <AppHeader currentDate={currentDate} />

      <main className="page-shell workspace">
        <section className="intro-row" aria-labelledby="workspace-title">
          <div>
            <p className="eyebrow">Humane hours, across the world</p>
            <h2 id="workspace-title">Find the hours that work.</h2>
            <p>Every column is the same moment. Add your people, then scan the green.</p>
          </div>
          <div className="intro-row__hint">
            <CircleHelp size={16} aria-hidden="true" />
            Select any city name to make it the reference.
          </div>
        </section>

        <section className="control-deck" aria-label="Timezone comparison controls">
          <ModeSwitch mode={state.mode} onChange={(mode) => updateState('mode', mode)} />
          <span className="control-deck__divider" aria-hidden="true" />
          <CityCombobox selectedCityIds={state.cityIds} onSelect={addCity} />
          <span className="control-deck__spacer" />
          <SettingsControl
            wakeHour={state.wakeHour}
            sleepHour={state.sleepHour}
            timeFormat={state.timeFormat}
            onWakeHourChange={(hour) => updateState('wakeHour', hour)}
            onSleepHourChange={(hour) => updateState('sleepHour', hour)}
            onTimeFormatChange={(format) => updateState('timeFormat', format)}
            onReset={() => setState({ ...DEFAULT_APP_STATE, cityIds: [...DEFAULT_APP_STATE.cityIds] })}
          />
        </section>

        <div className="mode-explainer" aria-live="polite">
          <ArrowRight size={14} aria-hidden="true" />
          {state.mode === 'meeting'
            ? 'One shared window: a cell turns green only when every selected city is awake.'
            : 'Pairwise windows: each city is compared only with the reference city.'}
        </div>

        {comparisonModel ? (
          <>
            {comparisonModel.timelines.length === 1 && (
              <div className="solo-prompt">
                Add one more city to reveal your first overlap window.
              </div>
            )}
            <OverlapSummary model={comparisonModel} mode={state.mode} timeFormat={state.timeFormat} />
            <section className="grid-card" aria-label="Timezone availability grid">
              <DesktopTimeGrid
                model={comparisonModel}
                timeFormat={state.timeFormat}
                onPromote={promoteCity}
                onRemove={removeCity}
              />
              <MobileTimeGrid
                model={comparisonModel}
                timeFormat={state.timeFormat}
                onPromote={promoteCity}
                onRemove={removeCity}
              />
              <GridLegend mode={state.mode} referenceCityName={comparisonModel.referenceCity.name} />
            </section>
          </>
        ) : (
          <EmptyBoard />
        )}
      </main>
    </div>
  );
}

export default App;
