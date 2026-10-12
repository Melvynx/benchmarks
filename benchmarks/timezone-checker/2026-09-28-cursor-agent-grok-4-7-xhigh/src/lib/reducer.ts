import { CITY_BY_ID } from '../data/cities';
import { DEFAULT_STATE, type AppState, type Mode, type TimeFormat } from '../types';
import { cloneState } from './storage';

export type Action =
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'promote'; id: string }
  | { type: 'mode'; mode: Mode }
  | { type: 'wake'; hour: number }
  | { type: 'sleep'; hour: number }
  | { type: 'format'; format: TimeFormat }
  | { type: 'hydrate'; state: AppState }
  | { type: 'reset' };

function isHour(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 23;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add': {
      if (!CITY_BY_ID.has(action.id) || state.cityIds.includes(action.id)) return state;
      return { ...state, cityIds: [...state.cityIds, action.id] };
    }
    case 'remove': {
      if (!state.cityIds.includes(action.id)) return state;
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.id) };
    }
    case 'promote': {
      const index = state.cityIds.indexOf(action.id);
      if (index <= 0) return state;
      return { ...state, cityIds: [action.id, ...state.cityIds.filter((id) => id !== action.id)] };
    }
    case 'mode':
      return action.mode === state.mode ? state : { ...state, mode: action.mode };
    case 'wake':
      return isHour(action.hour) && action.hour !== state.wake ? { ...state, wake: action.hour } : state;
    case 'sleep':
      return isHour(action.hour) && action.hour !== state.sleep ? { ...state, sleep: action.hour } : state;
    case 'format':
      return action.format === state.format ? state : { ...state, format: action.format };
    case 'hydrate':
      return cloneState(action.state);
    case 'reset':
      return cloneState(DEFAULT_STATE);
    default:
      return state;
  }
}
