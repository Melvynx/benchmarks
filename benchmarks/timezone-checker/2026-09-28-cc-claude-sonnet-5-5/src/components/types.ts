import type { City } from "../lib/cities";
import type { CityView, Settings } from "../lib/time";

export interface GridCity extends City {
  offset: number;
}

export interface GridProps {
  cities: GridCity[];
  views: CityView[];
  settings: Settings;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}
