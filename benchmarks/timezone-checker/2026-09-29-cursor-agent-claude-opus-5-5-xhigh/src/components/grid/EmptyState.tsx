import { Globe } from 'lucide-react';
import { useAppStore } from '../../store/app-store';

export function EmptyState() {
  const restoreDefaultCities = useAppStore((state) => state.restoreDefaultCities);
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-line bg-sunken text-ink-3">
        <Globe className="size-6" aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-ink">No cities yet</h2>
      <p className="max-w-sm text-sm text-ink-3">
        Search for a city above — or press <kbd className="kbd">/</kbd> — to start comparing timezones.
      </p>
      <button
        type="button"
        onClick={restoreDefaultCities}
        className="mt-1 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        Restore default cities
      </button>
    </div>
  );
}
