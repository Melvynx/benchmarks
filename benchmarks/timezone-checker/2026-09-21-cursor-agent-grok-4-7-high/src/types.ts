export type Mode = "meeting" | "base";
export type TimeFormat = "12" | "24";
export type CellState = "sleep" | "awake" | "overlap";

export type AppState = {
  cityIds: string[];
  mode: Mode;
  wake: number;
  sleep: number;
  format: TimeFormat;
};

export type TimeRange = {
  start: number;
  end: number;
};

export type LocalTime = {
  hour: number;
  minute: number;
};
