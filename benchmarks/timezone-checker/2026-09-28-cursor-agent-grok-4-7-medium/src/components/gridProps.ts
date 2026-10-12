import type { CityRow } from '../lib/schedule';
import type { TimeFormat } from '../types';

export type GridProps = {
  rows: CityRow[];
  format: TimeFormat;
  nowHour: number | null;
  hoverHour: number | null;
  onHover: (hour: number | null) => void;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  referenceDateLabel: string;
};
