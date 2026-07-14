import { useEffect, useState } from 'react';

import { CITY_BY_ID, DEFAULT_STATE } from '../data/cities';
import type { PlannerState } from '../types';

const STORAGE_KEY = 'gpt-5-6-timezone-planner';

function isHour(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23;
}

function loadPlannerState(): PlannerState {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) return DEFAULT_STATE;

    const parsedState: unknown = JSON.parse(rawState);
    if (!parsedState || typeof parsedState !== 'object') return DEFAULT_STATE;

    const candidate = parsedState as Partial<PlannerState>;
    const cityIds = Array.isArray(candidate.cityIds)
      ? candidate.cityIds.filter(
          (cityId): cityId is string =>
            typeof cityId === 'string' && CITY_BY_ID.has(cityId),
        )
      : DEFAULT_STATE.cityIds;

    return {
      cityIds: [...new Set(cityIds)],
      mode: candidate.mode === 'base' ? 'base' : 'meeting',
      wakeHour: isHour(candidate.wakeHour) ? candidate.wakeHour : DEFAULT_STATE.wakeHour,
      sleepHour: isHour(candidate.sleepHour)
        ? candidate.sleepHour
        : DEFAULT_STATE.sleepHour,
      timeFormat: candidate.timeFormat === '24h' ? '24h' : '12h',
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function usePersistentPlanner() {
  const [state, setState] = useState<PlannerState>(loadPlannerState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function updateState(patch: Partial<PlannerState>) {
    setState((currentState) => ({ ...currentState, ...patch }));
  }

  return { state, updateState };
}
