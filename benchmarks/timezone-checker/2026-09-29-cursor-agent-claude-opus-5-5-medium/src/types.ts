export type Mode = "meeting" | "base";

export type TimeFormat = "12h" | "24h";

export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Middle East"
  | "Asia"
  | "Oceania";

export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: Region;
  timeZone: string;
}

export interface Settings {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export interface AppState {
  cityIds: string[];
  mode: Mode;
  settings: Settings;
}
