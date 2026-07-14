export type AppMode = "meeting" | "base";
export type TimeFormat = "12h" | "24h";

export type CatalogCity = {
  id: string;
  name: string;
  country: string;
  timeZone: string;
};

export type AppState = {
  cityIds: string[];
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
};

export type HourCell = {
  referenceHour: number;
  referenceLabel: string;
  label: string;
  dayShiftLabel: string | null;
  isAwake: boolean;
  isOverlap: boolean;
};

export type CityRow = {
  city: CatalogCity;
  isReference: boolean;
  offsetLabel: string;
  cells: HourCell[];
};

export type SummaryEntry = {
  cityId: string;
  cityName: string;
  count: number;
  ranges: string[];
};
