import { useMemo } from 'react';
import { resolveCities } from '../lib/cities';
import { buildOverlapModel, type OverlapModel } from '../lib/overlap';
import { useAppStore } from '../store/app-store';
import { useNow } from './use-now';

export function useOverlapModel(): OverlapModel {
  const cityIds = useAppStore((state) => state.cityIds);
  const mode = useAppStore((state) => state.mode);
  const wakeHour = useAppStore((state) => state.settings.wakeHour);
  const sleepHour = useAppStore((state) => state.settings.sleepHour);
  const now = useNow();

  return useMemo(
    () => buildOverlapModel({ cities: resolveCities(cityIds), mode, window: { wakeHour, sleepHour }, now }),
    [cityIds, mode, wakeHour, sleepHour, now],
  );
}
