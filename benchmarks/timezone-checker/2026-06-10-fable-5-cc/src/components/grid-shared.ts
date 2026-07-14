import type { Settings } from '../lib/appState';
import type { CityLane } from '../lib/overlap';

export interface GridProps {
  lanes: CityLane[];
  settings: Settings;
  now: Date;
  /** Current hour in the reference city, or null when no cities are listed. */
  nowHour: number | null;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}
