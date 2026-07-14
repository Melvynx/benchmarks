import { CityPicker } from "./components/CityPicker";
import { Grid } from "./components/grid/Grid";
import { Header } from "./components/Header";
import { Hint } from "./components/Hint";
import { ModeToggle } from "./components/ModeToggle";
import { OverlapSummary } from "./components/OverlapSummary";
import { SettingsPanel } from "./components/SettingsPanel";
import { useOverlapData } from "./hooks/useOverlapData";

function App() {
  const data = useOverlapData();

  return (
    <div className="min-h-screen pb-16">
      <Header />

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <ModeToggle />
          <div className="flex items-center gap-2">
            <CityPicker />
            <SettingsPanel />
          </div>
        </div>

        <OverlapSummary data={data} />
        <Grid data={data} />
        <Hint mode={data.mode} />
      </main>
    </div>
  );
}

export default App;
