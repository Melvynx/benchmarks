import { CityPicker } from './components/controls/CityPicker';
import { ModeToggle } from './components/controls/ModeToggle';
import { SettingsPopover } from './components/controls/SettingsPopover';
import { DesktopGrid } from './components/grid/DesktopGrid';
import { EmptyState } from './components/grid/EmptyState';
import { GridLegend } from './components/grid/GridLegend';
import { MobileGrid } from './components/grid/MobileGrid';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { OverlapSummary } from './components/summary/OverlapSummary';
import { Toaster } from './components/ui/Toaster';
import { useMediaQuery } from './hooks/use-media-query';
import { useOverlapModel } from './hooks/use-overlap-model';
import { useAppStore } from './store/app-store';

export function App() {
  const model = useOverlapModel();
  const format = useAppStore((state) => state.settings.timeFormat);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { reference } = model;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-[28rem]" />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-8 pb-20 sm:px-6 sm:pt-12 lg:px-8">
        <Header />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ModeToggle referenceName={reference?.city.name} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CityPicker />
            <SettingsPopover />
          </div>
        </div>

        <OverlapSummary model={model} format={format} />

        <section aria-label="Timezone grid" className="card p-3 sm:p-5">
          {reference ? (
            <>
              {isDesktop ? (
                <DesktopGrid model={model} reference={reference} format={format} />
              ) : (
                <MobileGrid model={model} reference={reference} format={format} />
              )}
              <GridLegend model={model} isDesktop={isDesktop} />
            </>
          ) : (
            <EmptyState />
          )}
        </section>

        <Footer />
      </main>

      <Toaster />
    </div>
  );
}
