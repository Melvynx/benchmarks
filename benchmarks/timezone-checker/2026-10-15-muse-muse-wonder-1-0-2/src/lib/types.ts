import type { City } from '../data/cities'

export type CellState = 'sleeping' | 'awake' | 'overlap'

export interface CellData {
  refHour: number
  localMinutes: number
  label: string
  awake: boolean
  isOverlap: boolean
  state: CellState
}

export interface RowData {
  city: City
  offset: number
  cells: CellData[]
}
