export type TimeFormat = '12' | '24';

export type Mode = 'meeting' | 'base';

export type CellState = 'sleep' | 'awake' | 'overlap';

export type Range = {
  start: number;
  end: number;
};

export type AppState = {
  cityIds: string[];
  mode: Mode;
  wake: number;
  sleep: number;
  format: TimeFormat;
};
