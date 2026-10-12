import type { City } from './lib/cities';
import type { Slot } from './lib/time';

/** Everything a grid row needs, precomputed by the App. */
export interface CityRow {
  city: City;
  offset: number;
  slots: Slot[];
  overlap: boolean[];
}
