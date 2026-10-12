import type { Row } from "../../lib/grid";
import type { TimeFormat } from "../../types";

export interface GridViewProps {
  rows: Row[];
  refNowHour: number | null;
  format: TimeFormat;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}
