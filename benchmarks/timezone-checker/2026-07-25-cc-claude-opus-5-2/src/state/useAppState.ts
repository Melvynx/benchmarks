import { useCallback, useEffect, useMemo, useState } from "react";
import { getCity, type City } from "../data/cities";
import type { TimeFormat } from "../lib/format";
import type { Mode } from "../lib/schedule";
import { DEFAULT_STATE, loadState, saveState, type AppState } from "../lib/storage";

export type AppActions = {
  addCity: (id: string) => void;
  removeCity: (id: string) => void;
  /** Moves a city to the front of the list, making it the reference. */
  promoteCity: (id: string) => void;
  setMode: (mode: Mode) => void;
  setWake: (hour: number) => void;
  setSleep: (hour: number) => void;
  setFormat: (format: TimeFormat) => void;
  reset: () => void;
};

export function useAppState(): { state: AppState; cities: City[]; actions: AppActions } {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const cities = useMemo(
    () => state.cityIds.map(getCity).filter((city): city is City => city !== undefined),
    [state.cityIds],
  );

  const patch = useCallback((changes: Partial<AppState>) => {
    setState((current) => ({ ...current, ...changes }));
  }, []);

  const actions = useMemo<AppActions>(
    () => ({
      addCity: (id) =>
        setState((current) =>
          current.cityIds.includes(id) || !getCity(id)
            ? current
            : { ...current, cityIds: [...current.cityIds, id] },
        ),
      removeCity: (id) =>
        setState((current) => ({
          ...current,
          cityIds: current.cityIds.filter((cityId) => cityId !== id),
        })),
      promoteCity: (id) =>
        setState((current) =>
          current.cityIds[0] === id || !current.cityIds.includes(id)
            ? current
            : { ...current, cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)] },
        ),
      setMode: (mode) => patch({ mode }),
      setWake: (wake) => patch({ wake: clampHour(wake) }),
      setSleep: (sleep) => patch({ sleep: clampHour(sleep) }),
      setFormat: (format) => patch({ format }),
      reset: () => setState({ ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] }),
    }),
    [patch],
  );

  return { state, cities, actions };
}

function clampHour(hour: number): number {
  return Math.min(23, Math.max(0, Math.trunc(hour)));
}
