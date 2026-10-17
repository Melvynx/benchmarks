import {
  LoaderCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CoinsIcon,
  Columns2Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderIcon,
  Grid2X2Icon,
  Maximize2Icon,
  Minimize2Icon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  Rows3Icon,
  XIcon,
  ZapIcon,
} from "lucide-react"
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"

import { entryCost } from "@/components/compare/app-tile"
import { EvidencePanel } from "@/components/evidence-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { MAX_COMPARED, laneKey, shortModel } from "@/lib/benchmark-groups"
import type { BenchmarkGroup } from "@/lib/benchmark-groups"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import {
  chipEffort,
  configLabel,
  formatDuration,
  statusDotClassName,
  statusInfo,
  statusTextClassName,
} from "@/lib/format"
import { shortcutBlocked } from "@/lib/keyboard"
import { cn } from "@/lib/utils"

const AUTO_SCROLL_SPEED_PIXELS_PER_SECOND = 90
const COPY_CONFIRMATION_DURATION_MS = 1_200

export type CompareLayout = "grid" | "columns" | "stack"

const LAYOUTS = [
  ["stack", Rows3Icon, "Stack"],
  ["columns", Columns2Icon, "Side by side"],
  ["grid", Grid2X2Icon, "Grid"],
] as const

function minId(entries: BenchmarkEntry[], value: (entry: BenchmarkEntry) => number | null) {
  if (entries.length < 2) return null
  let best: string | null = null
  let bestValue = Number.POSITIVE_INFINITY
  for (const entry of entries) {
    const candidate = value(entry)
    if (candidate !== null && candidate < bestValue) {
      best = entry.id
      bestValue = candidate
    }
  }
  return best
}

/**
 * Up to four apps, full size, side by side. When they come from one run and
 * one task, the context bar steps through the run's tasks with the same
 * models, and toggles models in or out.
 */
export function CompareView({
  entries,
  group,
  colorFor,
  backLabel,
  layout,
  onLayoutChange,
  onBack,
  onChange,
  onAddApp,
}: {
  entries: BenchmarkEntry[]
  /** The run every compared app belongs to, when they share one. */
  group: BenchmarkGroup | undefined
  colorFor: (entry: BenchmarkEntry) => string | null
  backLabel: string
  layout: CompareLayout
  onLayoutChange: (layout: CompareLayout) => void
  onBack: () => void
  onChange: (ids: string[]) => void
  onAddApp: (query: string) => void
}) {
  const frameRefs = useRef(new Map<string, HTMLIFrameElement>())
  const [frameVersion, setFrameVersion] = useState(0)
  const [autoScrolling, setAutoScrolling] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [evidenceIds, setEvidenceIds] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const ids = useMemo(() => entries.map((entry) => entry.id), [entries])
  const focused = focusedId && ids.includes(focusedId) ? focusedId : null
  const activeFrameIds = useMemo(() => (focused ? [focused] : ids), [focused, ids])
  const tasks = [...new Set(entries.map((entry) => entry.task))]
  const sharedTask = tasks.length === 1 ? tasks[0] : null
  const context = group && sharedTask ? { group, task: sharedTask } : null
  const fastest = minId(entries, (entry) => entry.durationMs)
  const cheapest = minId(entries, (entry) =>
    entry.accounting?.complete === false ? null : entry.costUsd
  )

  useEffect(() => {
    if (!autoScrolling) return
    let animationFrame = 0
    let previousTime = performance.now()

    const scrollFrames = (time: number) => {
      const elapsedSeconds = Math.min(time - previousTime, 100) / 1_000
      previousTime = time
      let controlledFrames = 0
      let everyFrameAtEnd = true

      for (const id of activeFrameIds) {
        const frame = frameRefs.current.get(id)
        const frameWindow = frame?.contentWindow
        const frameDocument = frame?.contentDocument
        if (!frameWindow || !frameDocument) continue
        try {
          controlledFrames += 1
          const root = frameDocument.documentElement
          const body = frameDocument.body
          const scrollHeight = Math.max(
            root.scrollHeight,
            root.offsetHeight,
            body.scrollHeight,
            body.offsetHeight
          )
          const end = Math.max(0, scrollHeight - frameWindow.innerHeight)
          const next = Math.min(
            end,
            frameWindow.scrollY + AUTO_SCROLL_SPEED_PIXELS_PER_SECOND * elapsedSeconds
          )
          frameWindow.scrollTo({ top: next, behavior: "instant" })
          if (next < end - 1) everyFrameAtEnd = false
        } catch {
          // Generated apps are normally same-origin. Ignore an unavailable frame.
        }
      }

      if (controlledFrames > 0 && everyFrameAtEnd) {
        setAutoScrolling(false)
        return
      }
      animationFrame = window.requestAnimationFrame(scrollFrames)
    }

    animationFrame = window.requestAnimationFrame(scrollFrames)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [activeFrameIds, autoScrolling])

  const toggleAutoScroll = () => {
    if (autoScrolling) {
      setAutoScrolling(false)
      return
    }
    const frames = activeFrameIds
      .map((id) => frameRefs.current.get(id))
      .filter((frame): frame is HTMLIFrameElement =>
        Boolean(frame?.contentWindow && frame.contentDocument)
      )
    const allAtEnd =
      frames.length > 0 &&
      frames.every((frame) => {
        const frameWindow = frame.contentWindow
        const frameDocument = frame.contentDocument
        if (!frameWindow || !frameDocument) return true
        const scrollHeight = Math.max(
          frameDocument.documentElement.scrollHeight,
          frameDocument.body.scrollHeight
        )
        return frameWindow.scrollY >= scrollHeight - frameWindow.innerHeight - 1
      })
    if (allAtEnd) {
      for (const frame of frames) frame.contentWindow?.scrollTo({ top: 0, behavior: "instant" })
    }
    setAutoScrolling(true)
  }

  const change = (next: string[]) => {
    setAutoScrolling(false)
    setFocusedId(null)
    setEvidenceIds((current) => current.filter((id) => next.includes(id)))
    onChange(next.slice(0, MAX_COMPARED))
  }
  const reload = () => {
    setAutoScrolling(false)
    setFrameVersion((value) => value + 1)
  }
  const toggleFocus = (id: string) => {
    setAutoScrolling(false)
    setFocusedId((current) => (current === id ? null : id))
  }
  const toggleEvidence = (id: string) => {
    setAutoScrolling(false)
    setEvidenceIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]
    )
  }
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_DURATION_MS)
  }

  /** Same models, another task of the run; the whole task when none carry over. */
  const switchTask = (task: string) => {
    if (!context) return
    const carried = entries.flatMap((entry) => {
      const lane = context.group.lanes.find((item) => item.key === laneKey(entry))
      const match = lane?.entries.find((item) => item.task === task)
      return match ? [match.id] : []
    })
    change(
      carried.length
        ? carried
        : context.group.entries.filter((entry) => entry.task === task).map((entry) => entry.id)
    )
  }
  const stepTask = (direction: 1 | -1) => {
    if (!context || context.group.tasks.length < 2) return
    const list = context.group.tasks
    const index = list.indexOf(context.task)
    switchTask(list[(index + direction + list.length) % list.length])
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shortcutBlocked(event)) return
    const key = event.key
    if (key === "Escape") {
      if (focused) setFocusedId(null)
      else onBack()
    } else if (/^[1-6]$/.test(key)) {
      const entry = entries[Number(key) - 1] as BenchmarkEntry | undefined
      if (entry && entries.length > 1) toggleFocus(entry.id)
    } else if (key === "s" || key === "S") {
      toggleAutoScroll()
    } else if (key === "r" || key === "R") {
      reload()
    } else if (key === "l" || key === "L") {
      const order: CompareLayout[] = ["grid", "columns", "stack"]
      onLayoutChange(order[(order.indexOf(layout) + 1) % order.length])
    } else if (key === "ArrowLeft") {
      stepTask(-1)
    } else if (key === "ArrowRight") {
      stepTask(1)
    } else {
      return
    }
    event.preventDefault()
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])

  const title = sharedTask ?? `${tasks.length} tasks`
  const count = focused ? 1 : entries.length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-2 sm:px-3">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" onClick={onBack} className="max-w-48 text-muted-foreground hover:text-foreground" title="Back (Esc)">
          <ChevronLeftIcon data-icon="inline-start" />
          <span className="truncate">{backLabel}</span>
        </Button>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        <h1 className="min-w-0 truncate px-1.5 text-sm font-semibold" aria-live="polite">
          {title}
          <span className="ml-2 font-normal text-muted-foreground">
            {entries.length} {entries.length === 1 ? "app" : "apps"}
          </span>
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {entries.length > 1 && (
            <div role="group" aria-label="Comparison layout" className="hidden items-center rounded-lg border bg-muted/30 p-0.5 md:flex">
              {LAYOUTS.map(([value, Icon, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={layout === value ? "secondary" : "ghost"}
                  className="h-7 px-2"
                  aria-pressed={layout === value}
                  aria-label={label}
                  title={`${label} (L)`}
                  onClick={() => onLayoutChange(value)}
                >
                  <Icon />
                </Button>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant={autoScrolling ? "secondary" : "ghost"}
            size="icon-sm"
            aria-pressed={autoScrolling}
            title={autoScrolling ? "Stop scrolling (S)" : "Auto-scroll every app (S)"}
            onClick={toggleAutoScroll}
          >
            <span className="relative size-4" aria-hidden="true">
              <PlayIcon className={cn("absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200", autoScrolling ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none")} />
              <PauseIcon className={cn("absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200", autoScrolling ? "scale-100 opacity-100 blur-none" : "scale-25 opacity-0 blur-[4px]")} />
            </span>
            <span className="sr-only">{autoScrolling ? "Stop scrolling" : "Auto-scroll"}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" title="Reload every app (R)" onClick={reload}>
            <RefreshCwIcon />
            <span className="sr-only">Reload every app</span>
          </Button>
          <Button variant="ghost" size="icon-sm" title={copied ? "Link copied" : "Copy a link to this comparison"} onClick={copyLink}>
            {copied ? <CheckIcon className="text-emerald-400" /> : <CopyIcon />}
            <span className="sr-only">{copied ? "Link copied" : "Copy link"}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" title="Close the comparison (Esc)" onClick={onBack}>
            <XIcon />
            <span className="sr-only">Close the comparison</span>
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-2 overflow-hidden border-b px-2 py-1.5 sm:px-3">
        {context && context.group.tasks.length > 1 && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={() => stepTask(-1)} title="Previous task (←)">
              <ChevronLeftIcon />
              <span className="sr-only">Previous task</span>
            </Button>
            <Select value={context.task} onValueChange={switchTask}>
              <SelectTrigger size="sm" className="max-w-52 min-w-0" aria-label="Task">
                <SelectValue>
                  <span className="truncate">{context.task}</span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {context.group.tasks.indexOf(context.task) + 1}/{context.group.tasks.length}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {context.group.tasks.map((task) => (
                    <SelectItem key={task} value={task}>
                      {task}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon-sm" onClick={() => stepTask(1)} title="Next task (→)">
              <ChevronRightIcon />
              <span className="sr-only">Next task</span>
            </Button>
          </div>
        )}
        {context && (
          <div
            role="group"
            aria-label="Models in this comparison"
            className="scroll-rail flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2"
            onWheel={(event) => {
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY
            }}
          >
            {context.group.lanes.map((lane) => {
              const laneEntry = lane.entries.find((entry) => entry.task === context.task)
              const active = laneEntry ? ids.includes(laneEntry.id) : false
              const disabled =
                !laneEntry ||
                (active && ids.length === 1) ||
                (!active && ids.length >= MAX_COMPARED)
              return (
                <button
                  key={lane.key}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  title={
                    !laneEntry
                      ? `${lane.model} did not run ${context.task}`
                      : active
                        ? `Remove ${lane.model}`
                        : `Add ${lane.model}`
                  }
                  onClick={() => {
                    if (!laneEntry) return
                    change(active ? ids.filter((id) => id !== laneEntry.id) : [...ids, laneEntry.id])
                  }}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed",
                    active
                      ? "border-foreground/20 bg-secondary text-foreground"
                      : "border-dashed text-muted-foreground hover:border-foreground/30 hover:text-foreground disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
                  )}
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", !active && "opacity-50")}
                    style={{ backgroundColor: lane.color }}
                    aria-hidden="true"
                  />
                  <span className="max-w-36 truncate">{shortModel(lane.model)}</span>
                  {chipEffort(lane) && (
                    <span className="shrink-0 text-muted-foreground">{chipEffort(lane)}</span>
                  )}
                  {active ? (
                    <CheckIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <PlusIcon className="size-3" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          disabled={entries.length >= MAX_COMPARED}
          onClick={() => onAddApp(sharedTask ?? "")}
          title={entries.length >= MAX_COMPARED ? `${MAX_COMPARED} apps is the limit` : "Add any app (⌘K)"}
        >
          <PlusIcon data-icon="inline-start" />
          Add app
        </Button>
      </div>

      <section
        className="comparison-stage p-2"
        data-count={count}
        data-layout={layout}
        style={{ "--comparison-count": count } as React.CSSProperties}
      >
        {entries.map((entry, index) => {
          const status = statusInfo(entry.status)
          const color = colorFor(entry)
          const showEvidence = evidenceIds.includes(entry.id)
          return (
            <Card
              key={`${entry.id}-${frameVersion}`}
              className={cn("comparison-panel gap-0 overflow-hidden py-0", focused && focused !== entry.id && "hidden")}
            >
              <div className="flex h-11 shrink-0 items-center gap-2 border-b pr-1 pl-2.5">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold text-white"
                  style={{ backgroundColor: color ?? "var(--muted)" }}
                  title={entries.length > 1 ? `Press ${index + 1} to focus` : undefined}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="truncate text-sm font-medium" title={entry.model}>
                    {entry.model}
                  </span>
                  {chipEffort(entry) && (
                    <span className="shrink-0 rounded border px-1 text-[11px] text-muted-foreground">
                      {chipEffort(entry)}
                    </span>
                  )}
                  <span className="panel-harness truncate text-xs text-muted-foreground">
                    {!sharedTask && `${entry.task} · `}
                    {configLabel(entry)}
                  </span>
                </div>
                <span
                  className="panel-duration flex shrink-0 items-center gap-2.5 font-mono text-xs text-muted-foreground tabular-nums"
                  title={`${status.label} · model time ${formatDuration(entry.durationMs)} · known cost ${entryCost(entry)}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", statusDotClassName[status.tone])} />
                    {status.tone !== "success" && (
                      <span className={cn("font-sans", statusTextClassName[status.tone])}>{status.label}</span>
                    )}
                  </span>
                  <span className={cn("flex items-center gap-1", fastest === entry.id && "text-emerald-300")}>
                    {fastest === entry.id && <ZapIcon className="size-3" aria-label="Fastest" />}
                    {formatDuration(entry.durationMs)}
                  </span>
                  <span className={cn("flex items-center gap-1", cheapest === entry.id && "text-emerald-300")}>
                    {cheapest === entry.id && <CoinsIcon className="size-3" aria-label="Cheapest" />}
                    {entryCost(entry)}
                  </span>
                </span>
                <div className="flex shrink-0 items-center">
                  {entries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-pressed={focused === entry.id}
                      aria-label={focused === entry.id ? `Restore the comparison` : `Focus ${entry.model}`}
                      title={focused === entry.id ? `Restore (${index + 1})` : `Focus (${index + 1})`}
                      onClick={() => toggleFocus(entry.id)}
                    >
                      {focused === entry.id ? <Minimize2Icon /> : <Maximize2Icon />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${showEvidence ? "Show the app" : "Show evidence"} for ${entry.model}`}
                    aria-pressed={showEvidence}
                    title={showEvidence ? "Back to the app" : "Transcript, cost & evidence"}
                    className={showEvidence ? "bg-secondary text-foreground" : undefined}
                    onClick={() => toggleEvidence(entry.id)}
                  >
                    <FileTextIcon />
                  </Button>
                  <Button variant="ghost" size="icon-sm" asChild title="Open in a new tab">
                    <a href={entry.url} target="_blank" rel="noreferrer" aria-label={`Open ${entry.model} in a new tab`}>
                      <ExternalLinkIcon />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    aria-label={`Remove ${entry.model}`}
                    title="Remove from the comparison"
                    onClick={() => change(ids.filter((id) => id !== entry.id))}
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
              <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
                {showEvidence ? (
                  <EvidencePanel entry={entry} />
                ) : entry.hasPreview ? (
                  <AppFrame
                    key={entry.url}
                    frameRef={(frame) => {
                      if (frame) frameRefs.current.set(entry.id, frame)
                      else frameRefs.current.delete(entry.id)
                    }}
                    src={entry.url}
                    title={`${entry.task} by ${entry.model}`}
                  />
                ) : (
                  <Empty className="min-h-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FolderIcon />
                      </EmptyMedia>
                      <EmptyTitle>No result files</EmptyTitle>
                      <EmptyDescription>
                        The model did not write a previewable app. The evidence
                        button shows its cost and session.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

/** A compared app: dark and spinning while it boots, instead of a white flash. */
function AppFrame({
  src,
  title,
  frameRef,
}: {
  src: string
  title: string
  frameRef: (frame: HTMLIFrameElement | null) => void
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative size-full">
      <iframe
        ref={frameRef}
        onLoad={() => setLoaded(true)}
        className={cn("size-full border-0 bg-white transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        src={src}
        title={title}
        sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          Loading app…
        </div>
      )}
    </div>
  )
}
