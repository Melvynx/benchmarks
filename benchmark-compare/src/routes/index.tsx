import { Link, createFileRoute } from "@tanstack/react-router"
import {
  CalendarDaysIcon,
  Columns2Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FilterIcon,
  FlaskConicalIcon,
  FolderIcon,
  Grid2X2Icon,
  Maximize2Icon,
  Minimize2Icon,
  MonitorUpIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  Rows3Icon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TranscriptAnalysis } from "@/components/transcript-phase-chart"
import { TranscriptViewer } from "@/components/transcript-viewer"
import { EvidenceOverview } from "@/components/evidence-overview"
import { getBenchmarkCatalog } from "@/lib/catalog"
import { effortLabel } from "@/lib/effort-label"
import type { SessionUsage } from "@/lib/session-usage"
import type { IntegrityAnalysis } from "@/lib/integrity-analysis"

const integerFormatter = new Intl.NumberFormat("en")
const currencyFormatter = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
})
const AUTO_SCROLL_SPEED_PIXELS_PER_SECOND = 90
const COPY_CONFIRMATION_DURATION_MS = 1_200

const comparisonSearchParams = {
  compare: parseAsArrayOf(parseAsString, ",").withDefault([]),
  task: parseAsString.withDefault("all"),
  date: parseAsString.withDefault("all"),
  run: parseAsString.withDefault("all"),
  model: parseAsString.withDefault(""),
  harness: parseAsString.withDefault(""),
  layout: parseAsStringLiteral(["grid", "columns", "stack"]).withDefault(
    "grid"
  ),
}

export const Route = createFileRoute("/")({
  loader: () => getBenchmarkCatalog(),
  component: BenchmarkCompare,
})

function harnessLabel(harness: string) {
  switch (harness) {
    case "cc":
    case "ccx":
      return "Claude Code"
    case "cckimi":
      return "Claude Code · Kimi"
    case "codex":
      return "Codex"
    case "cursor-agent":
      return "Cursor Agent"
    default:
      return harness
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "harness-verified":
      return "Completed"
    case "failed":
      return "Failed"
    case "interrupted":
      return "Interrupted"
    default:
      return status === "unknown" ? "Unverified" : status
  }
}

function statusClassName(status: string) {
  if (status === "harness-verified")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (status === "failed")
    return "border-destructive/30 bg-destructive/10 text-destructive"
  if (status === "interrupted")
    return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  return ""
}

function durationLabel(durationMs: number | null) {
  if (durationMs === null) return "Time: Not recorded"
  if (durationMs < 1_000) return `Time: ${Math.round(durationMs)}ms`

  const totalSeconds = durationMs / 1_000
  if (totalSeconds < 60) {
    return `Time: ${totalSeconds < 10 ? totalSeconds.toFixed(1) : Math.round(totalSeconds)}s`
  }

  const roundedSeconds = Math.round(totalSeconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60
  return `Time: ${minutes}m ${seconds}s`
}

function benchmarkGroupLabel(group: {
  id: string
  count: number
  tasks: string[]
}) {
  const timestamp = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(
    group.id
  )
  const date = timestamp
    ? `${timestamp[1]}-${timestamp[2]}-${timestamp[3]} ${timestamp[4]}:${timestamp[5]} UTC`
    : "Historical"
  const task =
    group.tasks.length === 1 ? group.tasks[0] : `${group.tasks.length} tests`
  return `${date} · ${task} · ${group.count} ${group.count === 1 ? "run" : "runs"}`
}

function benchmarkGroupTimestamp(id: string) {
  return /(\d{8}T\d{6}Z)/.exec(id)?.[1] || ""
}

function BenchmarkCompare() {
  const frameRefs = useRef(new Map<string, HTMLIFrameElement>())
  const entries = Route.useLoaderData()
  const [selectedIds, setSelectedIds] = useQueryState(
    "compare",
    comparisonSearchParams.compare.withOptions({ history: "push" })
  )
  const [filters, setFilters] = useQueryStates(
    {
      task: comparisonSearchParams.task,
      date: comparisonSearchParams.date,
      run: comparisonSearchParams.run,
      model: comparisonSearchParams.model,
      harness: comparisonSearchParams.harness,
    },
    { history: "replace" }
  )
  const { task, date, run, model: modelQuery, harness: harnessQuery } = filters
  const [layout, setLayout] = useQueryState(
    "layout",
    comparisonSearchParams.layout.withOptions({ history: "replace" })
  )
  const [frameVersion, setFrameVersion] = useState(0)
  const [autoScrolling, setAutoScrolling] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [evidenceIds, setEvidenceIds] = useState<string[]>([])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const evidenceIdSet = useMemo(() => new Set(evidenceIds), [evidenceIds])
  const selectedEntries = selectedIds
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry) => entry !== undefined)
  const activeFrameIds = useMemo(
    () =>
      focusedId && selectedIdSet.has(focusedId) ? [focusedId] : selectedIds,
    [focusedId, selectedIdSet, selectedIds]
  )
  const tasks = useMemo(
    () => [...new Set(entries.map((entry) => entry.task))].sort(),
    [entries]
  )
  const dates = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.date))]
        .filter((value) => value !== "unknown")
        .sort((left, right) => right.localeCompare(left)),
    [entries]
  )
  const benchmarkGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; count: number; tasks: Set<string> }
    >()
    for (const entry of entries) {
      const group = groups.get(entry.benchmarkId) || {
        id: entry.benchmarkId,
        count: 0,
        tasks: new Set<string>(),
      }
      group.count += 1
      group.tasks.add(entry.task)
      groups.set(entry.benchmarkId, group)
    }
    return [...groups.values()]
      .map((group) => ({ ...group, tasks: [...group.tasks].sort() }))
      .sort(
        (left, right) =>
          benchmarkGroupTimestamp(right.id).localeCompare(
            benchmarkGroupTimestamp(left.id)
          ) || right.id.localeCompare(left.id)
      )
  }, [entries])
  const selectedBenchmarkGroup = benchmarkGroups.find(
    (group) => group.id === run
  )
  const comparableBenchmarkGroups = useMemo(
    () => benchmarkGroups.filter((group) => group.count > 1),
    [benchmarkGroups]
  )
  const filteredEntries = useMemo(() => {
    const model = modelQuery.trim().toLowerCase()
    const harness = harnessQuery.trim().toLowerCase()
    return entries.filter(
      (entry) =>
        (task === "all" || entry.task === task) &&
        (date === "all" || entry.date === date) &&
        (run === "all" || entry.benchmarkId === run) &&
        (!model || entry.model.toLowerCase().includes(model)) &&
        (!harness || entry.harness.toLowerCase().includes(harness))
    )
  }, [date, entries, harnessQuery, modelQuery, run, task])

  useEffect(() => {
    if (focusedId && !selectedIdSet.has(focusedId)) setFocusedId(null)
  }, [focusedId, selectedIdSet])

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
            frameWindow.scrollY +
              AUTO_SCROLL_SPEED_PIXELS_PER_SECOND * elapsedSeconds
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
      for (const frame of frames) {
        frame.contentWindow?.scrollTo({ top: 0, behavior: "instant" })
      }
    }
    setAutoScrolling(true)
  }

  const toggleResult = (id: string) => {
    setAutoScrolling(false)
    setFocusedId(null)
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((candidate) => candidate !== id)
      }
      if (current.length >= 4) return current
      return [...current, id]
    })
  }
  const removeResult = (id: string) => {
    setAutoScrolling(false)
    setFocusedId(null)
    setEvidenceIds((current) => current.filter((candidate) => candidate !== id))
    setSelectedIds((current) => current.filter((candidate) => candidate !== id))
  }
  const clearFilters = () => {
    void setFilters(null)
  }
  const hasActiveFilters =
    task !== "all" ||
    date !== "all" ||
    run !== "all" ||
    Boolean(modelQuery) ||
    Boolean(harnessQuery)
  const selectBenchmarkGroup = (benchmarkId: string) => {
    if (benchmarkId === "all") {
      void setFilters({ run: "all" })
      return
    }

    const groupEntries = entries.filter(
      (entry) => entry.benchmarkId === benchmarkId
    )
    const groupTasks = [...new Set(groupEntries.map((entry) => entry.task))]
    const groupDates = [...new Set(groupEntries.map((entry) => entry.date))]
    const groupEntryIds = new Set(groupEntries.map((entry) => entry.id))
    setSelectedIds((current) =>
      current.filter((entryId) => groupEntryIds.has(entryId))
    )
    void setFilters({
      run: benchmarkId,
      task: groupTasks.length === 1 ? groupTasks[0] : "all",
      date: groupDates.length === 1 ? groupDates[0] : "all",
      model: "",
      harness: "",
    })
  }
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_DURATION_MS)
  }
  const toggleEvidence = (id: string) => {
    setAutoScrolling(false)
    setEvidenceIds((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id]
    )
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "21rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-3 p-4 pr-14 md:pr-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                Benchmark Compare
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Select up to four generated apps.
              </p>
              <Link
                to="/prompts"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <FileTextIcon className="size-3.5" />
                Browse prompts
              </Link>
            </div>
          </div>
          <FieldGroup className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel className="sr-only" htmlFor="task-filter">
                Test
              </FieldLabel>
              <Select
                value={task}
                onValueChange={(value) =>
                  void setFilters({ task: value, run: "all" })
                }
              >
                <SelectTrigger
                  id="task-filter"
                  className="w-full min-w-0"
                  title={task === "all" ? "All tests" : task}
                >
                  <SelectValue>
                    <FlaskConicalIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {task === "all" ? "All tests" : task}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All tests</SelectItem>
                    {tasks.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="sr-only" htmlFor="date-filter">
                Date
              </FieldLabel>
              <Select
                value={date}
                onValueChange={(value) =>
                  void setFilters({ date: value, run: "all" })
                }
              >
                <SelectTrigger id="date-filter" className="w-full min-w-0">
                  <SelectValue>
                    <CalendarDaysIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {date === "all" ? "All dates" : date}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All dates</SelectItem>
                    {dates.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field className="col-span-2">
              <FieldLabel className="sr-only" htmlFor="run-filter">
                Benchmark group
              </FieldLabel>
              <Select value={run} onValueChange={selectBenchmarkGroup}>
                <SelectTrigger
                  id="run-filter"
                  className="w-full min-w-0"
                  title={
                    selectedBenchmarkGroup
                      ? benchmarkGroupLabel(selectedBenchmarkGroup)
                      : "All benchmark groups"
                  }
                >
                  <SelectValue>
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {selectedBenchmarkGroup
                        ? benchmarkGroupLabel(selectedBenchmarkGroup)
                        : "All benchmark groups"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-w-[min(32rem,calc(100vw-2rem))]"
                >
                  <SelectGroup>
                    <SelectItem value="all">All benchmark groups</SelectItem>
                    {comparableBenchmarkGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <span className="text-xs">
                          {benchmarkGroupLabel(group)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="sr-only" htmlFor="model-filter">
                Model search
              </FieldLabel>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="model-filter"
                  value={modelQuery}
                  onChange={(event) =>
                    void setFilters({ model: event.target.value })
                  }
                  className="pl-8"
                  placeholder="Model…"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel className="sr-only" htmlFor="harness-filter">
                Harness search
              </FieldLabel>
              <div className="relative">
                <FilterIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="harness-filter"
                  value={harnessQuery}
                  onChange={(event) =>
                    void setFilters({ harness: event.target.value })
                  }
                  className="pl-8"
                  placeholder="Harness…"
                />
              </div>
            </Field>
          </FieldGroup>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span aria-live="polite">
              {filteredEntries.length} of {entries.length} results
            </span>
            <Button
              variant="ghost"
              size="xs"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
          {selectedIds.length === 4 && (
            <p
              className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary"
              role="status"
            >
              Four selected. Remove one to add another.
            </p>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="min-h-0 flex-1 px-3 pb-3">
            <ScrollArea className="h-full pr-3">
              <div className="divide-y border-y">
                {filteredEntries.map((entry) => {
                  const selected = selectedIdSet.has(entry.id)
                  const unavailable = selectedIds.length === 4 && !selected
                  return (
                    <Button
                      key={entry.id}
                      variant="ghost"
                      className={`h-auto w-full justify-start rounded-none px-3 py-3 text-left transition-[color,background-color,border-color,box-shadow,opacity] active:scale-100! ${
                        selected
                          ? "border-l-2 border-l-primary/50 bg-primary/[0.07] hover:bg-primary/10"
                          : "border-l-2 border-l-transparent hover:bg-muted/50 disabled:opacity-40"
                      }`}
                      disabled={unavailable}
                      aria-pressed={selected}
                      aria-label={`${selected ? "Remove" : unavailable ? "Selection full:" : "Add"} ${entry.model}, ${harnessLabel(entry.harness)}, ${effortLabel(entry.effort)}`}
                      onClick={() => toggleResult(entry.id)}
                    >
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {entry.task}
                        </span>
                        <span className="w-full truncate text-sm font-medium">
                          {entry.model}
                        </span>
                        <span className="flex w-full flex-wrap items-center gap-1.5">
                          <Badge variant="outline" title={entry.harness}>
                            {harnessLabel(entry.harness)}
                          </Badge>
                          <Badge className="bg-primary/15 text-primary ring-1 ring-primary/25">
                            {effortLabel(entry.effort)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={statusClassName(entry.status)}
                          >
                            {statusLabel(entry.status)}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {durationLabel(entry.durationMs).replace(
                              "Time: ",
                              ""
                            )}
                            <span aria-hidden="true"> · </span>
                            {entry.date}
                          </span>
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 text-xs font-medium text-primary">
                        {selected ? "Remove" : "Add"}
                      </span>
                    </Button>
                  )
                })}
                {!filteredEntries.length && (
                  <Empty className="border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchIcon />
                      </EmptyMedia>
                      <EmptyTitle>No matching results</EmptyTitle>
                      <EmptyDescription>
                        Try a different test, date, run, model, or harness.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </ScrollArea>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="hidden px-5 py-3 text-xs text-muted-foreground sm:flex">
          <span>Press ⌘B to toggle the sidebar</span>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-2 sm:px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <div className="min-w-0">
              <p className="hidden text-xs font-medium text-primary sm:block">
                Live comparison
              </p>
              <h2
                className="truncate font-heading text-sm font-semibold tracking-tight sm:text-lg"
                aria-live="polite"
              >
                {selectedEntries.length
                  ? `${selectedEntries.length} selected`
                  : "No selection"}
              </h2>
            </div>
          </div>
          {selectedEntries.length > 0 && (
            <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
              {selectedEntries.length > 1 && (
                <div
                  role="group"
                  aria-label="Comparison layout"
                  className="hidden items-center rounded-lg border bg-muted/30 p-0.5 md:flex"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={layout === "stack" ? "secondary" : "ghost"}
                    className="px-2"
                    aria-pressed={layout === "stack"}
                    aria-label="Stack vertically"
                    title="Stack vertically"
                    onClick={() => void setLayout("stack")}
                  >
                    <Rows3Icon />
                    <span className="hidden 2xl:inline">Stack</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={layout === "columns" ? "secondary" : "ghost"}
                    className="px-2"
                    aria-pressed={layout === "columns"}
                    aria-label="Show side by side"
                    title="Side by side"
                    onClick={() => void setLayout("columns")}
                  >
                    <Columns2Icon />
                    <span className="hidden 2xl:inline">Side by side</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={layout === "grid" ? "secondary" : "ghost"}
                    className="px-2"
                    aria-pressed={layout === "grid"}
                    aria-label="Show as grid"
                    title="Grid"
                    onClick={() => void setLayout("grid")}
                  >
                    <Grid2X2Icon />
                    <span className="hidden 2xl:inline">Grid</span>
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant={autoScrolling ? "secondary" : "outline"}
                size="icon"
                className="transition-transform active:scale-[0.96]"
                disabled={!selectedEntries.length}
                aria-pressed={autoScrolling}
                onClick={toggleAutoScroll}
              >
                <span className="relative size-4" aria-hidden="true">
                  <PlayIcon
                    className={`absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ${
                      autoScrolling
                        ? "scale-25 opacity-0 blur-[4px]"
                        : "scale-100 opacity-100 blur-none"
                    }`}
                  />
                  <PauseIcon
                    className={`absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ${
                      autoScrolling
                        ? "scale-100 opacity-100 blur-none"
                        : "scale-25 opacity-0 blur-[4px]"
                    }`}
                  />
                </span>
                <span className="sr-only">
                  {autoScrolling ? "Stop scroll" : "Auto scroll"}
                </span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={!selectedEntries.length}
                onClick={() => {
                  setAutoScrolling(false)
                  setFrameVersion((value) => value + 1)
                }}
              >
                <RefreshCwIcon data-icon="inline-start" />
                <span className="sr-only">Reload frames</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={!selectedEntries.length}
                onClick={copyLink}
              >
                <CopyIcon data-icon="inline-start" />
                <span className="sr-only">
                  {copied ? "Link copied" : "Copy view link"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!selectedEntries.length}
                onClick={() => {
                  setAutoScrolling(false)
                  setFocusedId(null)
                  void setSelectedIds([])
                }}
              >
                <XIcon data-icon="inline-start" />
                <span className="sr-only">Clear comparison</span>
              </Button>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col p-2">
          {!selectedEntries.length ? (
            <Empty className="min-h-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MonitorUpIcon />
                </EmptyMedia>
                <EmptyTitle>Choose a benchmark result</EmptyTitle>
                <EmptyDescription>
                  Start with one result, then add up to three more for a shared
                  comparison grid.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <section
              className="comparison-stage"
              data-count={focusedId ? 1 : selectedEntries.length}
              data-layout={layout}
              style={
                {
                  "--comparison-count": focusedId ? 1 : selectedEntries.length,
                } as React.CSSProperties
              }
            >
              {selectedEntries.map((entry, index) => (
                <Card
                  key={`${entry.id}-${frameVersion}`}
                  className={`comparison-panel gap-0 overflow-hidden py-0 ${
                    focusedId && focusedId !== entry.id ? "hidden" : ""
                  }`}
                >
                  <div className="panel-toolbar flex min-h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
                    <Badge variant="outline">0{index + 1}</Badge>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {entry.model}
                    </span>
                    <Badge
                      variant="outline"
                      className="panel-harness shrink-0"
                      title={entry.harness}
                    >
                      {harnessLabel(entry.harness)}
                    </Badge>
                    <Badge className="panel-effort shrink-0 bg-primary/15 text-primary ring-1 ring-primary/25">
                      {effortLabel(entry.effort)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${statusClassName(entry.status)}`}
                    >
                      {statusLabel(entry.status)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="panel-duration shrink-0"
                    >
                      {durationLabel(entry.durationMs)}
                    </Badge>
                    {selectedEntries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="transition-transform active:scale-[0.96]"
                        aria-pressed={focusedId === entry.id}
                        aria-label={
                          focusedId === entry.id
                            ? `Restore comparison for ${entry.model}`
                            : `Focus ${entry.model}`
                        }
                        title={
                          focusedId === entry.id
                            ? "Restore comparison"
                            : "Focus full canvas"
                        }
                        onClick={() => {
                          setAutoScrolling(false)
                          setFocusedId((current) =>
                            current === entry.id ? null : entry.id
                          )
                        }}
                      >
                        <span className="relative size-4" aria-hidden="true">
                          <Maximize2Icon
                            className={`absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ${
                              focusedId === entry.id
                                ? "scale-25 opacity-0 blur-[4px]"
                                : "scale-100 opacity-100 blur-none"
                            }`}
                          />
                          <Minimize2Icon
                            className={`absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ${
                              focusedId === entry.id
                                ? "scale-100 opacity-100 blur-none"
                                : "scale-25 opacity-0 blur-[4px]"
                            }`}
                          />
                        </span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${evidenceIdSet.has(entry.id) ? "Show app" : "Show transcript"} for ${entry.model}`}
                      aria-pressed={evidenceIdSet.has(entry.id)}
                      title={
                        evidenceIdSet.has(entry.id) ? "Show app" : "Transcript"
                      }
                      className={
                        evidenceIdSet.has(entry.id)
                          ? "bg-secondary text-foreground"
                          : undefined
                      }
                      onClick={() => toggleEvidence(entry.id)}
                    >
                      <FileTextIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="ml-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      aria-label={`Remove ${entry.model} ${harnessLabel(entry.harness)}`}
                      title="Remove from comparison"
                      onClick={() => removeResult(entry.id)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                  <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
                    {evidenceIdSet.has(entry.id) ? (
                      <EvidencePanel entry={entry} />
                    ) : (
                      <iframe
                        ref={(frame) => {
                          if (frame) frameRefs.current.set(entry.id, frame)
                          else frameRefs.current.delete(entry.id)
                        }}
                        className="size-full border-0 bg-white"
                        src={entry.url}
                        title={`${entry.task}: ${entry.result}`}
                        sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

type Evidence = {
  appPath: string
  command: string
  evidencePath: string
  effort: string
  durationMs: number | null
  benchmarkId: string
  final: string
  prompt: string
  resumeCommand: string
  runId: string
  sessionId: string
  transcript: string
  transcriptPaths: string[]
  transcriptAnalysis: TranscriptAnalysis | null
  integrityAnalysis: IntegrityAnalysis | null
  transcriptOriginalBytes: number
  sessionUsage: SessionUsage | null
}

function EvidencePanel({
  entry,
}: {
  entry: Awaited<ReturnType<typeof getBenchmarkCatalog>>[number]
}) {
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [error, setError] = useState("")
  const [copiedValue, markCopiedValue] = useReducer(
    (_current: string, next: string) => next,
    ""
  )

  useEffect(() => {
    const controller = new AbortController()
    setEvidence(null)
    setError("")
    const path = entry.id.split("/").map(encodeURIComponent).join("/")
    fetch(`/api/evidence/${path}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Evidence request failed: ${response.status}`)
        return response.json() as Promise<Evidence>
      })
      .then(setEvidence)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError")
          setError(reason.message)
      })
    return () => controller.abort()
  }, [entry])

  const copyToClipboard = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    markCopiedValue(label)
    window.setTimeout(() => markCopiedValue(""), COPY_CONFIRMATION_DURATION_MS)
  }

  return (
    <div className="flex size-full min-h-0 flex-col bg-background">
      {!evidence && !error && (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}
      {error && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Could not load evidence</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {evidence && (
        <Tabs
          defaultValue="overview"
          className="min-h-0 min-w-0 flex-1 gap-0 overflow-hidden"
        >
          <div className="min-w-0 shrink-0 overflow-hidden border-b px-3 py-2">
            <ScrollArea className="w-full">
              <TabsList className="w-max">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                <TabsTrigger value="final">Final</TabsTrigger>
                <TabsTrigger value="commands">Commands</TabsTrigger>
                <TabsTrigger value="extended">Extended</TabsTrigger>
              </TabsList>
            </ScrollArea>
          </div>
          <TabsContent value="overview" className="min-h-0 flex-1">
            <EvidenceOverview
              id={entry.id}
              model={entry.model}
              date={entry.date}
              effort={effortLabel(evidence.effort || entry.effort)}
              duration={durationLabel(evidence.durationMs ?? entry.durationMs)}
              usage={evidence.sessionUsage}
              analysis={evidence.transcriptAnalysis}
              integrity={evidence.integrityAnalysis}
            />
          </TabsContent>
          <TabsContent value="transcript" className="min-h-0 flex-1">
            {evidence.transcript ? (
              <TranscriptViewer
                transcript={evidence.transcript}
                prompt={evidence.prompt}
                durationMs={evidence.durationMs}
              />
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>No transcript</EmptyTitle>
                  <EmptyDescription>
                    No transcript was recorded for this historical result.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TabsContent>
          <EvidenceTab
            value="prompt"
            content={evidence.prompt}
            empty="No prompt snapshot is available."
          />
          <EvidenceTab
            value="final"
            content={evidence.final}
            empty="No final response is available."
          />
          <EvidenceTab
            value="commands"
            content={[evidence.command, evidence.resumeCommand]
              .filter(Boolean)
              .join("\n\n")}
            empty="No command evidence is available."
          />
          <TabsContent value="extended" className="min-h-0 flex-1">
            <ExtendedEvidence
              evidence={evidence}
              entry={entry}
              copiedValue={copiedValue}
              copyToClipboard={copyToClipboard}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function tokenLabel(value: number | null) {
  return value === null ? "Not recorded" : integerFormatter.format(value)
}

function costLabel(value: number | null) {
  return value === null ? "Not recorded" : currencyFormatter.format(value)
}

function ExtendedEvidence({
  evidence,
  entry,
  copiedValue,
  copyToClipboard,
}: {
  evidence: Evidence
  entry: Awaited<ReturnType<typeof getBenchmarkCatalog>>[number]
  copiedValue: string
  copyToClipboard: (label: string, value: string) => Promise<void>
}) {
  const usage = evidence.sessionUsage
  const details = [
    [
      "Cache creation",
      usage?.cache_creation_input_tokens === null ||
      usage?.cache_creation_input_tokens === undefined
        ? null
        : tokenLabel(usage.cache_creation_input_tokens),
    ],
    [
      "Reported cost",
      usage?.total_cost_usd === null || usage?.total_cost_usd === undefined
        ? null
        : costLabel(usage.total_cost_usd),
    ],
    [
      "Turns",
      usage?.num_turns === null || usage?.num_turns === undefined
        ? null
        : tokenLabel(usage.num_turns),
    ],
    [
      "API time",
      usage?.duration_api_ms === null || usage?.duration_api_ms === undefined
        ? null
        : durationLabel(usage.duration_api_ms).replace("Time: ", ""),
    ],
    ["Service tier", usage?.service_tier || null],
    ["Speed", usage?.speed || null],
    ["Usage source", usage?.source || null],
    [
      "Transcript",
      evidence.transcriptOriginalBytes > evidence.transcript.length
        ? `${(evidence.transcriptOriginalBytes / 1_000_000).toFixed(1)} MB, condensed`
        : null,
    ],
    ["Session", evidence.sessionId || null],
    ["Run", evidence.runId || null],
    ["Benchmark", evidence.benchmarkId || null],
    [
      "Transcripts",
      evidence.transcriptPaths.length
        ? `${evidence.transcriptPaths.length} recorded`
        : null,
    ],
  ].filter((detail): detail is [string, string] => detail[1] !== null)

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        <section aria-labelledby={`session-${entry.id}`}>
          <div className="mb-3">
            <h3 id={`session-${entry.id}`} className="text-sm font-semibold">
              Recorded metadata
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Only fields present in the captured evidence are shown.
            </p>
          </div>
          <dl className="divide-y rounded-lg border text-xs">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-3 py-2"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 font-mono break-all text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby={`actions-${entry.id}`}>
          <h3 id={`actions-${entry.id}`} className="mb-2 text-sm font-semibold">
            Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard("app", evidence.appPath)}
            >
              <FolderIcon data-icon="inline-start" />
              {copiedValue === "app" ? "Path copied" : "Copy app path"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={entry.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                Open generated app
              </a>
            </Button>
            {evidence.evidencePath && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard("evidence", evidence.evidencePath)
                }
              >
                <CopyIcon data-icon="inline-start" />
                {copiedValue === "evidence"
                  ? "Path copied"
                  : "Copy evidence path"}
              </Button>
            )}
            {evidence.transcriptPaths.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    "transcripts",
                    evidence.transcriptPaths.join("\n")
                  )
                }
              >
                <FileTextIcon data-icon="inline-start" />
                {copiedValue === "transcripts"
                  ? "Paths copied"
                  : "Copy transcript paths"}
              </Button>
            )}
          </div>
        </section>

        {usage && Boolean(usage.raw_usage || usage.model_usage) && (
          <details className="rounded-lg border px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium">
              Raw session data
            </summary>
            <pre className="mt-3 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(
                { usage: usage.raw_usage, modelUsage: usage.model_usage },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </ScrollArea>
  )
}

function EvidenceTab({
  value,
  content,
  empty,
}: {
  value: string
  content: string
  empty: string
}) {
  return (
    <TabsContent value={value} className="min-h-0 flex-1">
      {content ? (
        <ScrollArea className="h-full">
          <pre className="p-5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
            {content}
          </pre>
        </ScrollArea>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No evidence</EmptyTitle>
            <EmptyDescription>{empty}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </TabsContent>
  )
}
