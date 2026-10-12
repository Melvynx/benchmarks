import { DEFAULT_CITY_IDS, getCity } from '../data/cities'
import type { AppState, Mode, TimeFormat } from '../types'

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  settings: { wake: 7, sleep: 23, timeFormat: '12h' },
}

export type Action =
  | { type: 'addCity'; id: string }
  | { type: 'removeCity'; id: string }
  | { type: 'promoteCity'; id: string }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setWake'; hour: number }
  | { type: 'setSleep'; hour: number }
  | { type: 'setTimeFormat'; format: TimeFormat }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addCity':
      if (!getCity(action.id) || state.cityIds.includes(action.id)) return state
      return { ...state, cityIds: [...state.cityIds, action.id] }
    case 'removeCity':
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.id) }
    case 'promoteCity': {
      if (!state.cityIds.includes(action.id) || state.cityIds[0] === action.id) return state
      return { ...state, cityIds: [action.id, ...state.cityIds.filter((id) => id !== action.id)] }
    }
    case 'setMode':
      return { ...state, mode: action.mode }
    case 'setWake':
      return { ...state, settings: { ...state.settings, wake: action.hour } }
    case 'setSleep':
      return { ...state, settings: { ...state.settings, sleep: action.hour } }
    case 'setTimeFormat':
      return { ...state, settings: { ...state.settings, timeFormat: action.format } }
  }
}
