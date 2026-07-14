import { CitySearch } from './components/CitySearch';
import { SettingsPanel } from './components/SettingsPanel';
import { Grid } from './components/Grid';
import { OverlapSummary } from './components/OverlapSummary';
import { Header } from './components/Header';
import { useStore } from './store';
import { getCityById, type City } from './data/cities';

function App() {
  const { cities } = useStore();
  const activeCities = cities.map(getCityById).filter(Boolean) as City[];

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <OverlapSummary activeCities={activeCities} />
            <Grid activeCities={activeCities} />
            <CitySearch />
            {activeCities.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                Add a city below to get started.
              </div>
            )}
            <div className="text-sm text-zinc-500 flex items-center gap-2 mt-4 ml-2">
              <span className="inline-block w-3 h-3 bg-primary-500 rounded-sm"></span>
              Green cells = everyone in overlap
            </div>
          </div>
          <div className="lg:col-span-1">
            <SettingsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
