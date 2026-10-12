import type { CityView } from '../hooks/useBoard'
import type { Board } from '../lib/overlap'
import type { TimeFormat } from '../types'

export interface GridProps {
  views: CityView[]
  board: Board
  nowHour: number | null
  format: TimeFormat
  onPromote: (id: string) => void
  onRemove: (id: string) => void
}
