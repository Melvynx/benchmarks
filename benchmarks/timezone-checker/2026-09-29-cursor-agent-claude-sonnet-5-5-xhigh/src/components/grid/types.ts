import type { Grid } from '../../lib/overlap'
import type { Mode, TimeFormat } from '../../lib/types'

export interface GridViewProps {
  grid: Grid
  mode: Mode
  format: TimeFormat
  now: Date
  onPromote: (cityId: string) => void
  onRemove: (cityId: string) => void
}
