import type { TimeFormat } from "../../lib/time";
import type { ScheduleView } from "../../state/useScheduleView";

export interface GridProps {
  view: ScheduleView;
  timeFormat: TimeFormat;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}
