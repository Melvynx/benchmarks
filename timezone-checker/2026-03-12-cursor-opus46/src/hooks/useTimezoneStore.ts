"use client";

import { useState, useEffect, useCallback } from "react";
import { AppState, DEFAULT_STATE, loadState, saveState, Mode, TimeFormat } from "@/lib/store";

export function useTimezoneStore() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const addCity = useCallback((cityId: string) => {
    setState((prev) => {
      if (prev.cityIds.includes(cityId)) return prev;
      return { ...prev, cityIds: [...prev.cityIds, cityId] };
    });
  }, []);

  const removeCity = useCallback((cityId: string) => {
    setState((prev) => ({
      ...prev,
      cityIds: prev.cityIds.filter((id) => id !== cityId),
    }));
  }, []);

  const promoteToReference = useCallback((cityId: string) => {
    setState((prev) => {
      const idx = prev.cityIds.indexOf(cityId);
      if (idx <= 0) return prev;
      const newIds = [cityId, ...prev.cityIds.filter((id) => id !== cityId)];
      return { ...prev, cityIds: newIds };
    });
  }, []);

  const setMode = useCallback((mode: Mode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setWakeHour = useCallback((wakeHour: number) => {
    setState((prev) => ({ ...prev, wakeHour }));
  }, []);

  const setSleepHour = useCallback((sleepHour: number) => {
    setState((prev) => ({ ...prev, sleepHour }));
  }, []);

  const setTimeFormat = useCallback((timeFormat: TimeFormat) => {
    setState((prev) => ({ ...prev, timeFormat }));
  }, []);

  return {
    ...state,
    hydrated,
    addCity,
    removeCity,
    promoteToReference,
    setMode,
    setWakeHour,
    setSleepHour,
    setTimeFormat,
  };
}
