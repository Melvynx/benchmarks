import { useEffect, useMemo, useState } from 'react';
import { Globe, PlusCircle } from 'lucide-react';
import { CITY_BY_ID, DEFAULT_CITY_IDS } from './data/cities';
import { useScheduleState } from './hooks/useScheduleState';
import { computeScheduleGrid } from './utils/timezone';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { OverlapSummary } from './components/OverlapSummary';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';
import { LegendFooter } from './components/LegendFooter';
import { City } from './types';

export function App() {
  const {
    state,
    setMode,
    updateSettings,
    addCity,
    removeCity,
    promoteCityToRef,
    resetToDefaults,
  } = useScheduleState();

  const [now, setNow] = useState<Date>(() => new Date());

  // Keep live clocks fresh every 30 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedCities = useMemo<City[]>(() => {
    return state.cityIds
      .map((id) => CITY_BY_ID.get(id))
      .filter((c): c is City => Boolean(c));
  }, [state.cityIds]);

  const {
    offsetsByCityId,
    cellsByCityId,
    meetingOverlapHours,
    meetingRanges,
    baseSummaries,
  } = useMemo(
    () => computeScheduleGrid(selectedCities, state.mode, state.settings, now),
    [selectedCities, state.mode, state.settings, now]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        mode={state.mode}
        onModeChange={setMode}
        onResetDefaults={resetToDefaults}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <ControlsBar
          selectedCityIds={state.cityIds}
          settings={state.settings}
          onAddCity={addCity}
          onUpdateSettings={updateSettings}
          now={now}
        />

        <OverlapSummary
          cities={selectedCities}
          mode={state.mode}
          meetingOverlapHours={meetingOverlapHours}
          meetingRanges={meetingRanges}
          baseSummaries={baseSummaries}
        />

        {selectedCities.length === 0 ? (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">No cities selected</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Search and add cities from the dropdown above, or restore the default global trio (San Francisco, Denpasar, Geneva).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                for (const id of DEFAULT_CITY_IDS) {
                  addCity(id);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Restore Default Cities
            </button>
          </div>
        ) : (
          <>
            <DesktopGrid
              cities={selectedCities}
              mode={state.mode}
              settings={state.settings}
              offsetsByCityId={offsetsByCityId}
              cellsByCityId={cellsByCityId}
              meetingOverlapHours={meetingOverlapHours}
              onPromoteCity={promoteCityToRef}
              onRemoveCity={removeCity}
              now={now}
            />

            <MobileGrid
              cities={selectedCities}
              mode={state.mode}
              settings={state.settings}
              offsetsByCityId={offsetsByCityId}
              cellsByCityId={cellsByCityId}
              meetingOverlapHours={meetingOverlapHours}
              onPromoteCity={promoteCityToRef}
              onRemoveCity={removeCity}
            />
          </>
        )}

        <LegendFooter mode={state.mode} />
      </main>
    </div>
  );
}
export default App;
