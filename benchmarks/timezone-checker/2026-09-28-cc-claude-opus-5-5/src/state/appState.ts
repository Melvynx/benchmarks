import { CITY_BY_ID, DEFAULT_CITY_IDS } from "../lib/cities";
import type { Mode } from "../lib/schedule";
import type { TimeFormat } from "../lib/time";

export interface Settings {
  wake: number;
  sleep: number;
  timeFormat: TimeFormat;
}

export interface AppState {
  /** Ordered city ids; the first one is the reference city. */
  cityIds: string[];
  mode: Mode;
  settings: Settings;
}

export type Action =
  | { type: "city/add"; id: string }
  | { type: "city/remove"; id: string }
  | { type: "city/promote"; id: string }
  | { type: "mode/set"; mode: Mode }
  | { type: "settings/update"; patch: Partial<Settings> }
  | { type: "reset" };

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: "meeting",
  settings: { wake: 7, sleep: 23, timeFormat: "12h" },
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "city/add":
      if (!CITY_BY_ID.has(action.id) || state.cityIds.includes(action.id)) return state;
      return { ...state, cityIds: [...state.cityIds, action.id] };
    case "city/remove":
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.id) };
    case "city/promote":
      if (!state.cityIds.includes(action.id) || state.cityIds[0] === action.id) return state;
      return { ...state, cityIds: [action.id, ...state.cityIds.filter((id) => id !== action.id)] };
    case "mode/set":
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return DEFAULT_STATE;
  }
}
