import { useState, useCallback, useRef } from "react";
import type { City, SelectedCity } from "../types";
import { cities } from "../data/cities";
import { detectUserTimezone } from "../utils/timezone";

const STORAGE_KEY = "tz-checker-cities";
const PRIMARY_KEY = "tz-checker-primary";
const MAX_CITIES = 5;

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function buildDefaults(): { cities: SelectedCity[]; primaryId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SelectedCity[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const storedPrimary = localStorage.getItem(PRIMARY_KEY);
        const primaryId = storedPrimary && parsed.some((c) => c.id === storedPrimary)
          ? storedPrimary
          : parsed[0].id;
        return { cities: parsed, primaryId };
      }
    }
  } catch {}

  const userTz = detectUserTimezone();
  const userCity = cities.find((c) => c.timezone === userTz);
  const fallback = cities.find((c) => c.name === "New York")!;

  const initial: SelectedCity[] = [];
  if (userCity) {
    initial.push({ ...userCity, id: generateId() });
    if (userCity.timezone !== "Asia/Tokyo") {
      const tokyo = cities.find((c) => c.name === "Tokyo")!;
      initial.push({ ...tokyo, id: generateId() });
    } else {
      initial.push({ ...fallback, id: generateId() });
    }
  } else {
    initial.push({ ...fallback, id: generateId() });
    const tokyo = cities.find((c) => c.name === "Tokyo")!;
    initial.push({ ...tokyo, id: generateId() });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  localStorage.setItem(PRIMARY_KEY, initial[0].id);

  return { cities: initial, primaryId: initial[0].id };
}

function persist(selected: SelectedCity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
}

export function useSelectedCities() {
  const defaults = useRef(buildDefaults());
  const [selected, setSelected] = useState<SelectedCity[]>(defaults.current.cities);
  const [primaryId, setPrimaryIdState] = useState<string>(defaults.current.primaryId);

  const setPrimaryId = useCallback((id: string) => {
    setPrimaryIdState(id);
    localStorage.setItem(PRIMARY_KEY, id);
  }, []);

  const addCity = useCallback(
    (city: City) => {
      if (selected.length >= MAX_CITIES) return;
      const newCity: SelectedCity = { ...city, id: generateId() };
      const next = [...selected, newCity];
      setSelected(next);
      persist(next);
      if (next.length === 1) setPrimaryId(newCity.id);
    },
    [selected, setPrimaryId]
  );

  const removeCity = useCallback(
    (id: string) => {
      const next = selected.filter((c) => c.id !== id);
      setSelected(next);
      persist(next);
      if (primaryId === id && next.length > 0) {
        setPrimaryId(next[0].id);
      }
    },
    [selected, primaryId, setPrimaryId]
  );

  const canAdd = selected.length < MAX_CITIES;

  return { selected, primaryId, setPrimaryId, addCity, removeCity, canAdd };
}
