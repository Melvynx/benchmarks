import type { City } from '../data/cities'

export interface HourCell {
  refHour: number
  localMins: number
  label: string
  awake: boolean
  overlap: boolean
}

export interface EnrichedCity {
  city: City
  offsetMinutes: number
  offsetLabel: string
  currentTime: string
  isRef: boolean
  cells: HourCell[]
}

export function cellClass(cell: HourCell): string {
  if (cell.overlap) return 'cell overlap'
  if (cell.awake) return 'cell awake'
  return 'cell sleeping'
}

export function cellStateLabel(cell: HourCell): string {
  if (cell.overlap) return 'overlap'
  if (cell.awake) return 'awake'
  return 'sleeping'
}
