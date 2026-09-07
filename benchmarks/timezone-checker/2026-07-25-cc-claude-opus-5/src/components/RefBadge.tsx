export function RefBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Reference city — every hour column is anchored to this timezone"
      className={
        compact
          ? 'rounded-sm bg-ref/15 px-1 text-[9px] font-bold tracking-[0.08em] text-ref'
          : 'rounded-full border border-ref/35 bg-ref/12 px-1.5 py-px text-[10px] font-bold tracking-[0.1em] text-ref'
      }
    >
      REF
    </span>
  )
}
