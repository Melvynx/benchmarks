import type { CellState } from '../lib/overlap'

/** The three-state visual language shared by both layouts. */
export const CELL_STATE_CLASS: Record<CellState, string> = {
  sleeping: 'border-line/70 bg-surface/50 text-ink-faint',
  awake: 'border-line-strong/60 bg-raised text-ink-muted',
  overlap: 'cell-overlap font-semibold',
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
