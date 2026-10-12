import { getCity } from '../lib/cities';
import { snapshotAppState, useAppStore } from './app-store';
import { showToast } from './toast-store';

export function removeCityWithUndo(cityId: string): void {
  const { cityIds, removeCity, insertCity } = useAppStore.getState();
  const index = cityIds.indexOf(cityId);
  if (index === -1) return;

  removeCity(cityId);
  showToast({
    message: `${getCity(cityId)?.name ?? 'City'} removed`,
    action: { label: 'Undo', run: () => insertCity(cityId, index) },
  });
}

export function resetWithUndo(): void {
  const previous = snapshotAppState();
  useAppStore.getState().reset();
  showToast({
    message: 'Restored defaults',
    action: { label: 'Undo', run: () => useAppStore.getState().replaceState(previous) },
  });
}
