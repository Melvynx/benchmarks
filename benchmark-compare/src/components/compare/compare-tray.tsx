import { Columns2Icon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import { MAX_COMPARED, shortModel } from "@/lib/benchmark-groups"
import { chipEffort } from "@/lib/format"

/** Floating picks: what "Compare" will open, one click from anywhere. */
export function CompareTray({
  entries,
  colorFor,
  onRemove,
  onClear,
  onCompare,
}: {
  entries: BenchmarkEntry[]
  colorFor: (entry: BenchmarkEntry) => string | null
  onRemove: (id: string) => void
  onClear: () => void
  onCompare: () => void
}) {
  if (!entries.length) return null
  const tasks = new Set(entries.map((entry) => entry.task))

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div
        role="region"
        aria-label="Picked apps"
        className="pointer-events-auto flex max-w-full animate-in items-center gap-2 rounded-2xl border bg-popover/95 p-1.5 pl-2 shadow-2xl ring-1 ring-black/20 backdrop-blur duration-200 fade-in-0 slide-in-from-bottom-4"
      >
        <ol className="hidden min-w-0 items-center gap-1 md:flex">
          {entries.map((entry, index) => {
            const color = colorFor(entry)
            return (
              <li
                key={entry.id}
                className="flex min-w-0 items-center gap-1.5 rounded-lg border bg-background/60 py-1 pr-1 pl-1.5"
              >
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold text-white"
                  style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="max-w-36 truncate text-xs font-medium" title={entry.model}>
                  {shortModel(entry.model)}
                </span>
                {chipEffort(entry) && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {chipEffort(entry)}
                  </span>
                )}
                {tasks.size > 1 && (
                  <span className="max-w-24 truncate text-[11px] text-muted-foreground">
                    {entry.task}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Unpick ${entry.model} on ${entry.task}`}
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            )
          })}
        </ol>
        <span className="px-1 text-sm font-medium md:hidden" aria-live="polite">
          {entries.length} picked
        </span>
        <span className="hidden font-mono text-[11px] text-muted-foreground tabular-nums sm:inline md:hidden lg:inline">
          {entries.length}/{MAX_COMPARED}
        </span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
          <kbd className="ml-1 hidden rounded border px-1 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </Button>
        <Button size="sm" onClick={onCompare} disabled={entries.length < 1}>
          <Columns2Icon data-icon="inline-start" />
          {entries.length === 1 ? "Open" : `Compare ${entries.length}`}
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] sm:inline">
            C
          </kbd>
        </Button>
      </div>
    </div>
  )
}
