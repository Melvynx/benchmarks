import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { City, AppMode, UserSettings, OverlapRange } from '../types';
import { CITIES_CATALOG, DEFAULT_CITY_IDS, DEFAULT_CITIES } from '../data/cities';
import {
  getCityCurrentUtcOffset,
  getCurrentLocalTime,
  isHourAwake,
  calculateLocalTimeForRefHour,
  formatCellHour,
  getOverlapRanges,
} from '../lib/timezone';

const STORAGE_KEYS = {
  CITIES: 'timezone_checker_cities',
  MODE: 'timezone_checker_mode',
  SETTINGS: 'timezone_checker_settings',
};

const DEFAULT_SETTINGS: UserSettings = {
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};

export interface GridCellData {
  refHour: number;
  localHour: number;
  localMinute: number;
  dayOffset: number;
  isAwake: boolean;
  isOverlap: boolean;
  formattedShort: string;
  formattedFull: string;
}

export interface CityRowData {
  city: City;
  isReference: boolean;
  currentUtcOffset: { offsetMinutes: number; formatted: string };
  currentLocalTime: string;
  cells: GridCellData[];
}

export interface BaseModeCityOverlap {
  city: City;
  overlapHours: number[];
  overlapCount: number;
  overlapRanges: OverlapRange[];
  hasOverlap: boolean;
}

interface TimezoneContextType {
  cities: City[];
  referenceCity: City;
  mode: AppMode;
  settings: UserSettings;
  setMode: (mode: AppMode) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  addCity: (cityId: string) => boolean;
  removeCity: (cityId: string) => void;
  setReferenceCity: (cityId: string) => void;
  reorderCities: (startIndex: number, endIndex: number) => void;
  resetToDefaults: () => void;
  availableCities: City[];
  gridRows: CityRowData[];
  meetingOverlapHours: number[];
  meetingOverlapRanges: OverlapRange[];
  baseModeOverlaps: BaseModeCityOverlap[];
  activeHoverHour: number | null;
  setActiveHoverHour: (hour: number | null) => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage or defaults
  const [cityIds, setCityIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CITIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify valid IDs
          const valid = parsed.filter((id) => CITIES_CATALOG.some((c) => c.id === id));
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {
      console.warn('Failed to load cities from localStorage', e);
    }
    return DEFAULT_CITY_IDS;
  });

  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODE);
      if (saved === 'meeting' || saved === 'base') return saved;
    } catch (e) {
      console.warn('Failed to load mode from localStorage', e);
    }
    return 'meeting';
  });

  const [settings, setSettingsState] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          wakeHour: typeof parsed.wakeHour === 'number' ? parsed.wakeHour : DEFAULT_SETTINGS.wakeHour,
          sleepHour: typeof parsed.sleepHour === 'number' ? parsed.sleepHour : DEFAULT_SETTINGS.sleepHour,
          timeFormat: parsed.timeFormat === '24h' ? '24h' : '12h',
        };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Current live time ticker (updates every 15s)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [activeHoverHour, setActiveHoverHour] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CITIES, JSON.stringify(cityIds));
  }, [cityIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // City list mapped to catalog objects
  const cities: City[] = useMemo(() => {
    const list: City[] = [];
    for (const id of cityIds) {
      const found = CITIES_CATALOG.find((c) => c.id === id);
      if (found) list.push(found);
    }
    return list.length > 0 ? list : DEFAULT_CITIES;
  }, [cityIds]);

  const referenceCity: City = cities[0] || DEFAULT_CITIES[0];

  const availableCities: City[] = useMemo(() => {
    const selectedSet = new Set(cities.map((c) => c.id));
    return CITIES_CATALOG.filter((c) => !selectedSet.has(c.id));
  }, [cities]);

  // Actions
  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettingsState((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  const addCity = (cityId: string): boolean => {
    if (cityIds.includes(cityId)) return false;
    const exists = CITIES_CATALOG.some((c) => c.id === cityId);
    if (!exists) return false;
    setCityIds((prev) => [...prev, cityId]);
    return true;
  };

  const removeCity = (cityId: string) => {
    if (cities.length <= 1) {
      return; // Keep at least one city
    }
    setCityIds((prev) => prev.filter((id) => id !== cityId));
  };

  const setReferenceCity = (cityId: string) => {
    setCityIds((prev) => {
      if (!prev.includes(cityId)) return prev;
      const filtered = prev.filter((id) => id !== cityId);
      return [cityId, ...filtered];
    });
  };

  const reorderCities = (startIndex: number, endIndex: number) => {
    setCityIds((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const resetToDefaults = () => {
    setCityIds(DEFAULT_CITY_IDS);
    setModeState('meeting');
    setSettingsState(DEFAULT_SETTINGS);
  };

  // 2. Compute 24-hour state for each city across all columns (0..23)
  const rawCityHours = useMemo(() => {
    const refCity = cities[0];
    if (!refCity) return [];

    return cities.map((city) => {
      const cells: {
        refHour: number;
        localHour: number;
        localMinute: number;
        dayOffset: number;
        isAwake: boolean;
        formattedShort: string;
        formattedFull: string;
      }[] = [];

      for (let refHour = 0; refHour < 24; refHour++) {
        const local = calculateLocalTimeForRefHour(
          refCity.timezone,
          city.timezone,
          refHour,
          currentDate
        );
        const awake = isHourAwake(local.localHour, settings.wakeHour, settings.sleepHour);
        const formatted = formatCellHour(local.localHour, local.localMinute, settings.timeFormat);

        cells.push({
          refHour,
          localHour: local.localHour,
          localMinute: local.localMinute,
          dayOffset: local.dayOffset,
          isAwake: awake,
          formattedShort: formatted.short,
          formattedFull: formatted.full,
        });
      }

      return {
        city,
        cells,
      };
    });
  }, [cities, settings.wakeHour, settings.sleepHour, settings.timeFormat, currentDate]);

  // 3. Compute Meeting Mode Overlap
  const meetingOverlapHours = useMemo(() => {
    if (rawCityHours.length < 2) {
      if (rawCityHours.length === 1) {
        return rawCityHours[0].cells.filter((c) => c.isAwake).map((c) => c.refHour);
      }
      return [];
    }

    const commonHours: number[] = [];
    for (let refHour = 0; refHour < 24; refHour++) {
      const allAwake = rawCityHours.every((cData) => cData.cells[refHour].isAwake);
      if (allAwake) {
        commonHours.push(refHour);
      }
    }
    return commonHours;
  }, [rawCityHours]);

  const meetingOverlapRanges = useMemo(() => {
    return getOverlapRanges(meetingOverlapHours, settings.timeFormat);
  }, [meetingOverlapHours, settings.timeFormat]);

  // 4. Compute Base Mode Overlap for each non-reference city
  const baseModeOverlaps = useMemo<BaseModeCityOverlap[]>(() => {
    if (rawCityHours.length < 2) return [];
    const refData = rawCityHours[0];
    const nonRefCitiesData = rawCityHours.slice(1);

    return nonRefCitiesData.map((cityData) => {
      const overlapHours: number[] = [];
      for (let refHour = 0; refHour < 24; refHour++) {
        const refAwake = refData.cells[refHour].isAwake;
        const cityAwake = cityData.cells[refHour].isAwake;
        if (refAwake && cityAwake) {
          overlapHours.push(refHour);
        }
      }

      const overlapRanges = getOverlapRanges(overlapHours, settings.timeFormat);
      return {
        city: cityData.city,
        overlapHours,
        overlapCount: overlapHours.length,
        overlapRanges,
        hasOverlap: overlapHours.length > 0,
      };
    });
  }, [rawCityHours, settings.timeFormat]);

  // 5. Final assembled grid rows with visual state flags (Sleeping, Awake no overlap, Overlap)
  const gridRows = useMemo<CityRowData[]>(() => {
    if (rawCityHours.length === 0) return [];
    const refData = rawCityHours[0];

    return rawCityHours.map((cityData, cityIndex) => {
      const isReference = cityIndex === 0;
      const currentUtcOffset = getCityCurrentUtcOffset(cityData.city.timezone, currentDate);
      const currentLocalTime = getCurrentLocalTime(
        cityData.city.timezone,
        settings.timeFormat,
        currentDate
      );

      const finalCells: GridCellData[] = cityData.cells.map((cell) => {
        let isOverlap = false;

        if (mode === 'meeting') {
          // In meeting mode: all cities in overlap hours are highlighted
          isOverlap = meetingOverlapHours.includes(cell.refHour);
        } else {
          // In Base mode
          if (isReference) {
            // Reference city shows overlap if reference is awake and at least one other city is awake
            if (rawCityHours.length > 1) {
              const anyOtherAwake = rawCityHours
                .slice(1)
                .some((other) => other.cells[cell.refHour].isAwake);
              isOverlap = cell.isAwake && anyOtherAwake;
            } else {
              isOverlap = cell.isAwake;
            }
          } else {
            // Non-reference city shows overlap if both this city and reference city are awake
            const refAwake = refData.cells[cell.refHour].isAwake;
            isOverlap = cell.isAwake && refAwake;
          }
        }

        return {
          ...cell,
          isOverlap,
        };
      });

      return {
        city: cityData.city,
        isReference,
        currentUtcOffset,
        currentLocalTime,
        cells: finalCells,
      };
    });
  }, [rawCityHours, mode, meetingOverlapHours, settings.timeFormat, currentDate]);

  return (
    <TimezoneContext.Provider
      value={{
        cities,
        referenceCity,
        mode,
        settings,
        setMode,
        updateSettings,
        addCity,
        removeCity,
        setReferenceCity,
        reorderCities,
        resetToDefaults,
        availableCities,
        gridRows,
        meetingOverlapHours,
        meetingOverlapRanges,
        baseModeOverlaps,
        activeHoverHour,
        setActiveHoverHour,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};
