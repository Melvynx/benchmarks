export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Remove ${label}`}
      title={`Remove ${label}`}
      className="inline-flex size-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-700 hover:text-white focus-visible:outline-2 focus-visible:outline-glow-400"
    >
      <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="m5 5 10 10M15 5 5 15" />
      </svg>
    </button>
  )
}
