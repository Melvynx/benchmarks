export const SERIES_KEYS = [
  "t",
  "fruit",
  "blue",
  "red",
  "blueSpeed",
  "blueVision",
  "redSpeed",
  "redVision",
  "blueEnergy",
  "redEnergy",
] as const;

export type SeriesKey = (typeof SERIES_KEYS)[number];
export type Sample = Record<SeriesKey, number>;
export type Columns = Record<SeriesKey, number[]>;

const emptyColumns = (): Columns =>
  Object.fromEntries(SERIES_KEYS.map((k) => [k, [] as number[]])) as unknown as Columns;

/**
 * Whole-run history at a resolution that halves whenever it grows past `maxLength`,
 * plus a full-resolution window of the most recent samples.
 */
export class History {
  full: Columns = emptyColumns();
  recent: Columns = emptyColumns();
  interval: number;
  readonly baseInterval: number;
  nextAt = 0;
  version = 0;
  private sinceKeep = 0;

  constructor(
    baseInterval: number,
    readonly maxLength = 2400,
    readonly recentLength = 360,
  ) {
    this.baseInterval = baseInterval;
    this.interval = baseInterval;
  }

  get length() {
    return this.full.t.length;
  }

  push(sample: Sample) {
    for (const k of SERIES_KEYS) {
      const r = this.recent[k];
      r.push(sample[k]);
      if (r.length > this.recentLength) r.shift();
    }

    this.sinceKeep++;
    const stride = Math.round(this.interval / this.baseInterval);
    if (this.full.t.length === 0 || this.sinceKeep >= stride) {
      this.sinceKeep = 0;
      for (const k of SERIES_KEYS) this.full[k].push(sample[k]);
      if (this.full.t.length > this.maxLength) this.compact();
    }
    this.nextAt += this.baseInterval;
    this.version++;
  }

  private compact() {
    for (const k of SERIES_KEYS) {
      const col = this.full[k];
      const kept: number[] = [];
      for (let i = 0; i < col.length; i += 2) kept.push(col[i]);
      this.full[k] = kept;
    }
    this.interval *= 2;
  }

  last(): Sample | null {
    const n = this.recent.t.length;
    if (n === 0) return null;
    return Object.fromEntries(SERIES_KEYS.map((k) => [k, this.recent[k][n - 1]])) as Sample;
  }
}
