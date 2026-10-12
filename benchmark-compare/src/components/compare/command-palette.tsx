import { CornerDownLeftIcon, SearchIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type PaletteGroup = "Actions" | "Runs" | "Tasks" | "Apps"

export type PaletteItem = {
  id: string
  group: PaletteGroup
  label: string
  hint?: string
  /** Extra words that should match without being shown. */
  keywords?: string
  color?: string | null
  icon?: LucideIcon
  shortcut?: string
  /** The row's trailing detail, e.g. a duration or a day. */
  meta?: string
  onSelect: () => void
}

const GROUP_ORDER: PaletteGroup[] = ["Actions", "Runs", "Tasks", "Apps"]
const LIMITS: Record<"idle" | "search", Record<PaletteGroup, number>> = {
  idle: { Actions: 8, Runs: 6, Tasks: 6, Apps: 0 },
  search: { Actions: 4, Runs: 8, Tasks: 8, Apps: 40 },
}

function score(item: PaletteItem, terms: string[], query: string) {
  const label = item.label.toLowerCase()
  const haystack = `${label} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase()
  if (!terms.every((term) => haystack.includes(term))) return null
  if (label.startsWith(query)) return 0
  if (label.includes(query)) return 1
  if (label.startsWith(terms[0])) return 2
  return 3
}

/**
 * ⌘K: jump to any run, task, or app, or run an action, from anywhere. Arrow
 * keys move, Enter picks; the list is a listbox the input drives.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  initialQuery = "",
  appCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: PaletteItem[]
  initialQuery?: string
  appCount: number
}) {
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setActive(0)
    }
  }, [initialQuery, open])

  const sections = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const terms = normalized.split(/\s+/).filter(Boolean)
    const limits = LIMITS[terms.length ? "search" : "idle"]
    const byGroup = new Map<PaletteGroup, Array<{ item: PaletteItem; rank: number }>>()
    for (const item of items) {
      const rank = terms.length ? score(item, terms, normalized) : 0
      if (rank === null) continue
      byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), { item, rank }])
    }
    let start = 0
    return GROUP_ORDER.flatMap((group) => {
      const matches = (byGroup.get(group) ?? [])
        .sort((left, right) => left.rank - right.rank)
        .slice(0, limits[group])
        .map(({ item }) => item)
      if (!matches.length) return []
      const section = { group, items: matches, start }
      start += matches.length
      return [section]
    })
  }, [items, query])
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections])
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0))

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return
    onOpenChange(false)
    item.onSelect()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="sr-only">Search runs, tasks, and apps</DialogTitle>
        <div className="flex items-center gap-2.5 border-b px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat.length ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActive((activeIndex + 1) % Math.max(flat.length, 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActive((activeIndex - 1 + flat.length) % Math.max(flat.length, 1))
              } else if (event.key === "PageDown") {
                event.preventDefault()
                setActive(Math.min(activeIndex + 8, flat.length - 1))
              } else if (event.key === "PageUp") {
                event.preventDefault()
                setActive(Math.max(activeIndex - 8, 0))
              } else if (event.key === "Enter") {
                event.preventDefault()
                choose(flat[activeIndex])
              }
            }}
            placeholder="Search runs, tasks, models, apps…"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="hidden rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Results"
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {sections.map((section) => (
            <div key={section.group} role="group" aria-label={section.group} className="pb-1">
              <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
                {section.group}
              </p>
              {section.items.map((item, offset) => {
                const current = section.start + offset
                const Icon = item.icon
                const selected = current === activeIndex
                return (
                  <div
                    key={item.id}
                    id={`${listId}-${current}`}
                    data-index={current}
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => {
                      if (!selected) setActive(current)
                    }}
                    onClick={() => choose(item)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                      selected ? "bg-accent text-accent-foreground" : "text-foreground/90"
                    )}
                  >
                    {Icon ? (
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color ?? "var(--muted-foreground)" }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="max-w-[70%] shrink-0 truncate font-medium">{item.label}</span>
                      {item.hint && (
                        <span className="truncate text-xs text-muted-foreground">{item.hint}</span>
                      )}
                    </span>
                    {item.meta && (
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {item.meta}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {item.shortcut}
                      </kbd>
                    )}
                    {selected && !item.shortcut && (
                      <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {!flat.length && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nothing matches “{query}”.
            </p>
          )}
          {!query.trim() && (
            <p className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
              Type a model, task, or day to search all {appCount} apps.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
