import { create } from 'zustand'
import type { HourRange } from '../domain/schedule'

interface UiState {
  /** Reference hours to spotlight in the grid (hovered column or summary badge). */
  focus: HourRange | null
  setFocus: (focus: HourRange | null) => void
  pickerOpen: boolean
  setPickerOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  focus: null,
  setFocus: (focus) =>
    set((s) => (s.focus?.start === focus?.start && s.focus?.length === focus?.length ? s : { focus })),
  pickerOpen: false,
  setPickerOpen: (pickerOpen) => set({ pickerOpen }),
}))
