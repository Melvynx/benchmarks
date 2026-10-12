import { CityPicker } from "@/components/CityPicker";
import { Legend } from "@/components/Legend";
import { Logo } from "@/components/Logo";
import { ModeToggle } from "@/components/ModeToggle";
import { OverlapSummary } from "@/components/OverlapSummary";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TimeGrid } from "@/components/grid/TimeGrid";
import { usePlannerView } from "@/hooks/usePlannerView";

export function App() {
  const view = usePlannerView();

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pt-6 pb-10 sm:gap-6 sm:px-6 sm:pt-10 lg:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Logo className="size-11 shrink-0" />
          <div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-[28px]">Claude Opus 5.5</h1>
            <p className="text-sm text-ink-2">Find the hours when everyone is awake.</p>
          </div>
        </div>
        <ModeToggle referenceName={view.reference?.name} />
      </header>

      <main className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <CityPicker />
          <SettingsPanel />
        </div>

        <OverlapSummary view={view} />
        <TimeGrid view={view} />
      </main>

      <Legend mode={view.mode} referenceName={view.reference?.name} />
    </div>
  );
}
