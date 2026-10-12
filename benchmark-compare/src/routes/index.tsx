import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ActivityIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  CopyIcon,
  FileTextIcon,
  HomeIcon,
  KeyboardIcon,
  LinkIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react"
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs"
import { useEffect, useEffectEvent, useMemo, useState } from "react"

import { CommandPalette } from "@/components/compare/command-palette"
import type { PaletteItem } from "@/components/compare/command-palette"
import { CompareTray } from "@/components/compare/compare-tray"
import { CompareView } from "@/components/compare/compare-view"
import { HomeOverview } from "@/components/compare/home-overview"
import { Navigator } from "@/components/compare/navigator"
import type { NavigatorTab } from "@/components/compare/navigator"
import { RunOverview } from "@/components/compare/run-overview"
import { ShortcutsDialog } from "@/components/compare/shortcuts-dialog"
import { TaskOverview } from "@/components/compare/task-overview"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { setCompareMode, toggleCompareMode, useCompareMode } from "@/hooks/use-compare-mode"
import {
  LANE_COLORS,
  MAX_COMPARED,
  buildBenchmarkGroups,
  buildTaskSummaries,
  groupTitle,
  isComparable,
  laneKey,
  shortModel,
} from "@/lib/benchmark-groups"
import type { BenchmarkGroup } from "@/lib/benchmark-groups"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import { getBenchmarkCatalog } from "@/lib/catalog"
import {
  configLabel,
  formatAbsoluteDay,
  formatClock,
  formatDay,
  formatDuration,
  formatShortDay,
} from "@/lib/format"
import { shortcutBlocked } from "@/lib/keyboard"
import { cn } from "@/lib/utils"

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

type View = "compare" | "run" | "task" | "home"

function runLabel(group: BenchmarkGroup) {
  if (group.startedAtMs === null) return formatDay(group.day)
  return `${formatShortDay(group.startedAtMs)} · ${formatClock(group.startedAtMs)}`
}

/** A model setup independent of the run it happened in. */
function setupKey(entry: BenchmarkEntry) {
  return laneKey(entry).split("|").slice(1).join("|")
}

/**
 * Colors for a set of apps: a single run keeps its lane colors so the matrix
 * and the comparison agree; a mix of runs colors each setup in the order it
 * first appears, so the same model keeps one color across runs.
 */
function colorsFor(list: BenchmarkEntry[], groupById: Map<string, BenchmarkGroup>) {
  const shared =
    list.length && list.every((entry) => entry.benchmarkId === list[0].benchmarkId)
      ? groupById.get(list[0].benchmarkId)
      : undefined
  const setups = [...new Set(list.map(setupKey))]
  return (entry: BenchmarkEntry) => {
    if (shared) return shared.lanes.find((lane) => lane.key === laneKey(entry))?.color ?? null
    const index = setups.indexOf(setupKey(entry))
    return index === -1 ? null : LANE_COLORS[index % LANE_COLORS.length]
  }
}

function BenchmarkCompare() {
  const router = useRouter()
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void router.invalidate() }, 15000)
    return () => window.clearInterval(timer)
  }, [router])

  return (
    <SidebarProvider style={{ "--sidebar-width": "20rem" } as React.CSSProperties}>
      <Workspace />
    </SidebarProvider>
  )
}

function Workspace() {
  const entries = Route.useLoaderData()
  const { setOpenMobile } = useSidebar()
  const [compare, setCompare] = useQueryState(
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
  const { task, date, run, model: appQuery } = filters
  const [layout, setLayout] = useQueryState(
    "layout",
    comparisonSearchParams.layout.withOptions({ history: "replace" })
  )
  const [picks, setPicks] = useState<string[]>([])
  const [navTabChoice, setNavTabChoice] = useState<NavigatorTab | null>(null)
  const [palette, setPalette] = useState<{ open: boolean; query: string }>({ open: false, query: "" })
  const [helpOpen, setHelpOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const compareMode = useCompareMode()

  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries])
  const groups = useMemo(() => buildBenchmarkGroups(entries), [entries])
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])
  const navGroups = useMemo(
    () => groups.filter((group) => isComparable(group) || group.running > 0),
    [groups]
  )
  const taskSummaries = useMemo(() => buildTaskSummaries(entries), [entries])
  const newestEntries = useMemo(
    () => [...entries].sort((left, right) => right.date.localeCompare(left.date)),
    [entries]
  )

  const selectedGroup = run !== "all" ? groupById.get(run) : undefined
  const activeSummary = task !== "all" ? taskSummaries.find((item) => item.task === task) : undefined
  const compareEntries = compare
    .map((id) => entryById.get(id))
    .filter((entry): entry is BenchmarkEntry => entry !== undefined)
  const pickEntries = picks
    .map((id) => entryById.get(id))
    .filter((entry): entry is BenchmarkEntry => entry !== undefined)
  const view: View = compare.length
    ? "compare"
    : selectedGroup
      ? "run"
      : activeSummary
        ? "task"
        : "home"
  const compareGroup =
    compareEntries.length &&
    compareEntries.every((entry) => entry.benchmarkId === compareEntries[0].benchmarkId)
      ? groupById.get(compareEntries[0].benchmarkId)
      : undefined
  const navTab = navTabChoice ?? (task !== "all" && run === "all" ? "tasks" : "runs")
  const runList = selectedGroup && !navGroups.includes(selectedGroup) ? groups : navGroups
  const runIndex = selectedGroup ? runList.indexOf(selectedGroup) : -1
  const olderRun = runIndex === -1 ? undefined : runList.at(runIndex + 1)
  const newerRun = runIndex > 0 ? runList[runIndex - 1] : undefined
  const backLabel = selectedGroup
    ? runLabel(selectedGroup)
    : activeSummary
      ? activeSummary.task
      : "Overview"

  const selectRun = (id: string) => {
    const group = groupById.get(id)
    if (!group) return
    setNavTabChoice(null)
    setOpenMobile(false)
    void setCompare([])
    void setFilters({
      run: id,
      task: group.tasks.length === 1 ? group.tasks[0] : "all",
      date: group.day === "unknown" ? "all" : group.day,
      model: "",
      harness: "",
    })
  }
  const selectTask = (name: string) => {
    setNavTabChoice(null)
    setOpenMobile(false)
    void setCompare([])
    void setFilters({ task: name, run: "all", date: "all", model: "", harness: "" })
  }
  const goHome = () => {
    setNavTabChoice(null)
    setOpenMobile(false)
    void setCompare([])
    void setFilters({ task: "all", run: "all", date: "all", model: "", harness: "" })
  }
  const openApps = (ids: string[]) => {
    if (ids.length) void setCompare(ids.slice(0, MAX_COMPARED))
  }
  const comparePicks = () => {
    if (!pickEntries.length) return
    openApps(pickEntries.map((entry) => entry.id))
    setPicks([])
    setCompareMode(false)
  }
  const togglePick = (id: string) => {
    setPicks((current) => {
      if (current.includes(id)) return current.filter((candidate) => candidate !== id)
      if (current.length >= MAX_COMPARED) return current
      return [...current, id]
    })
  }
  const addToComparison = (id: string) => {
    void setCompare((current) =>
      [...current.filter((candidate) => candidate !== id), id].slice(-MAX_COMPARED)
    )
  }
  const openPalette = (query = "") => setPalette({ open: true, query })
  const stepRun = (direction: "older" | "newer") => {
    if (!selectedGroup) {
      if (direction === "older" && navGroups[0]) selectRun(navGroups[0].id)
      return
    }
    const target = direction === "older" ? olderRun : newerRun
    if (target) selectRun(target.id)
  }
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_DURATION_MS)
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault()
      setPalette((current) => ({ open: !current.open, query: "" }))
      return
    }
    if (shortcutBlocked(event)) return
    if (event.key === "/") openPalette()
    else if (event.key === "?") setHelpOpen(true)
    // The comparison owns every other key while it is open.
    else if (view === "compare") return
    else if (event.key === "[") stepRun("older")
    else if (event.key === "]") stepRun("newer")
    else if (event.key === "m" || event.key === "M") toggleCompareMode()
    else if ((event.key === "c" || event.key === "C") && pickEntries.length) comparePicks()
    else if (event.key === "Escape" && (picks.length || compareMode)) {
      setPicks([])
      setCompareMode(false)
    }
    else return
    event.preventDefault()
  })
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])

  const laneColor = useMemo(() => {
    const colors = new Map<string, string>()
    for (const group of groups) {
      for (const lane of group.lanes) {
        for (const entry of lane.entries) colors.set(entry.id, lane.color)
      }
    }
    return colors
  }, [groups])

  const paletteItems = ((): PaletteItem[] => {
    const actions: PaletteItem[] = [
      { id: "home", group: "Actions", label: "Go to the overview", icon: HomeIcon, onSelect: goHome },
    ]
    if (navGroups[0]) {
      actions.push({
        id: "latest",
        group: "Actions",
        label: "Open the latest run",
        hint: runLabel(navGroups[0]),
        icon: ActivityIcon,
        shortcut: "[",
        onSelect: () => selectRun(navGroups[0].id),
      })
    }
    if (olderRun) {
      actions.push({ id: "older", group: "Actions", label: "Older run", hint: runLabel(olderRun), icon: ChevronLeftIcon, shortcut: "[", onSelect: () => selectRun(olderRun.id) })
    }
    if (newerRun) {
      actions.push({ id: "newer", group: "Actions", label: "Newer run", hint: runLabel(newerRun), icon: ChevronRightIcon, shortcut: "]", onSelect: () => selectRun(newerRun.id) })
    }
    if (pickEntries.length) {
      actions.push({
        id: "compare-picks",
        group: "Actions",
        label: `Compare ${pickEntries.length} picked ${pickEntries.length === 1 ? "app" : "apps"}`,
        icon: Columns2Icon,
        shortcut: "C",
        onSelect: comparePicks,
      })
    }
    actions.push(
      {
        id: "compare-mode",
        group: "Actions",
        label: compareMode ? "Leave compare mode" : "Compare mode: click apps to pick them",
        keywords: "compare mode pick select",
        icon: Columns2Icon,
        shortcut: "M",
        onSelect: toggleCompareMode,
      },
      { id: "copy", group: "Actions", label: "Copy a link to this view", icon: LinkIcon, onSelect: () => void copyLink() },
      { id: "help", group: "Actions", label: "Keyboard shortcuts", icon: KeyboardIcon, shortcut: "?", onSelect: () => setHelpOpen(true) }
    )

    const runs: PaletteItem[] = navGroups.map((group) => ({
      id: `run:${group.id}`,
      group: "Runs",
      label: runLabel(group),
      hint: `${groupTitle(group)} · ${group.lanes.map((lane) => shortModel(lane.model)).join(", ")}`,
      keywords: [group.id, group.day, formatDay(group.day), ...group.tasks, ...group.lanes.map((lane) => `${lane.harness} ${lane.effort}`)].join(" "),
      meta: `${group.entries.length} apps`,
      onSelect: () => selectRun(group.id),
    }))
    const tasks: PaletteItem[] = taskSummaries.map((item) => ({
      id: `task:${item.task}`,
      group: "Tasks",
      label: item.task,
      hint: `${item.entries.length} apps · ${item.models} models`,
      meta: item.latestDay === "unknown" ? undefined : formatShortDay(item.latestDay),
      onSelect: () => selectTask(item.task),
    }))
    const apps: PaletteItem[] = newestEntries.map((entry) => ({
      id: `app:${entry.id}`,
      group: "Apps",
      label: entry.model,
      hint: [entry.task, entry.date === "unknown" ? null : formatShortDay(entry.date), configLabel(entry)].filter(Boolean).join(" · "),
      keywords: `${entry.harness} ${entry.date} ${entry.benchmarkId}`,
      color: laneColor.get(entry.id),
      meta: formatDuration(entry.durationMs),
      onSelect: () => (view === "compare" ? addToComparison(entry.id) : openApps([entry.id])),
    }))
    return [...actions, ...runs, ...tasks, ...apps]
  })()

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="p-3 pr-14 md:pr-3">
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <Link
              to="/"
              search={{}}
              className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => {
                setPicks([])
                setNavTabChoice(null)
                setOpenMobile(false)
              }}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Columns2Icon className="size-4" />
              </span>
              <span className="truncate font-heading text-base font-semibold tracking-tight">
                Benchmarks
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden md:inline-flex"
              title="Search everything (⌘K)"
              onClick={() => openPalette()}
            >
              <SearchIcon />
              <span className="sr-only">Search</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-0 overflow-hidden">
          <Navigator
            groups={navGroups}
            tasks={taskSummaries}
            tab={navTab}
            activeRunId={view === "run" ? (selectedGroup?.id ?? null) : (compareGroup?.id ?? null)}
            activeTask={view === "task" ? task : null}
            onTabChange={setNavTabChoice}
            onSelectRun={selectRun}
            onSelectTask={selectTask}
          />
        </SidebarContent>
        <SidebarFooter className="gap-1 border-t p-2">
          <nav className="grid grid-cols-2 gap-1">
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <Link to="/runs">
                <ActivityIcon data-icon="inline-start" />
                Run log
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <Link to="/prompts">
                <FileTextIcon data-icon="inline-start" />
                Prompts
              </Link>
            </Button>
          </nav>
          <div className="flex items-center justify-between gap-2 px-2 pb-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5" title="The catalog reloads every 15 seconds while this tab is visible">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-sky-400" />
              </span>
              Live · refreshes every 15s
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="hidden items-center gap-1 rounded px-1 hover:text-foreground sm:inline-flex"
            >
              <kbd className="rounded border bg-muted px-1 font-mono">?</kbd>
              Shortcuts
            </button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="relative flex h-svh min-w-0 flex-col overflow-hidden">
        {view === "compare" ? (
          compareEntries.length ? (
            <CompareView
              entries={compareEntries}
              group={compareGroup}
              colorFor={colorsFor(compareEntries, groupById)}
              backLabel={backLabel}
              layout={layout}
              onLayoutChange={(value) => void setLayout(value)}
              onBack={() => void setCompare([])}
              onChange={(ids) => void setCompare(ids)}
              onAddApp={openPalette}
            />
          ) : (
            <MissingComparison backLabel={backLabel} onBack={() => void setCompare([])} />
          )
        ) : (
          <>
            <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-2 sm:gap-2 sm:px-3">
              <SidebarTrigger />
              <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0.5 text-sm">
                <button
                  type="button"
                  onClick={goHome}
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-1 transition-colors hover:bg-muted hover:text-foreground",
                    view === "home" && date === "all" ? "font-medium" : "text-muted-foreground"
                  )}
                  aria-current={view === "home" && date === "all" ? "page" : undefined}
                >
                  Benchmarks
                </button>
                {view !== "home" || date !== "all" ? (
                  <>
                    <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                    <span className="truncate px-1 font-medium" aria-current="page">
                      {view === "run" && selectedGroup
                        ? runLabel(selectedGroup)
                        : view === "task"
                          ? task
                          : formatAbsoluteDay(date)}
                    </span>
                  </>
                ) : null}
              </nav>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 justify-start gap-2 text-muted-foreground sm:w-60 lg:w-72"
                onClick={() => openPalette()}
                title="Search runs, tasks, and apps (⌘K)"
              >
                <SearchIcon data-icon="inline-start" />
                <span className="hidden flex-1 text-left font-normal sm:inline">Search runs, tasks, apps…</span>
                <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
                <span className="sr-only sm:hidden">Search</span>
              </Button>
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                aria-pressed={compareMode}
                title="Compare mode: click apps to pick up to 4, then Compare (M)"
                onClick={toggleCompareMode}
              >
                <Columns2Icon data-icon="inline-start" />
                <span className="hidden sm:inline">{compareMode ? `Comparing · ${picks.length}/${MAX_COMPARED}` : "Compare mode"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title={copied ? "Link copied" : "Copy a link to this view"}
                onClick={copyLink}
              >
                {copied ? <CheckIcon className="text-emerald-400" /> : <CopyIcon />}
                <span className="sr-only">{copied ? "Link copied" : "Copy view link"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden shrink-0 sm:inline-flex"
                title="Keyboard shortcuts (?)"
                onClick={() => setHelpOpen(true)}
              >
                <KeyboardIcon />
                <span className="sr-only">Keyboard shortcuts</span>
              </Button>
            </header>

            <main className="min-h-0 flex-1">
              {view === "run" && selectedGroup ? (
                <RunOverview
                  group={selectedGroup}
                  picks={picks}
                  pickFull={picks.length >= MAX_COMPARED}
                  onOpen={(id) => openApps([id])}
                  onTogglePick={togglePick}
                  onCompare={openApps}
                  onSelectTask={selectTask}
                  onOlder={olderRun ? () => selectRun(olderRun.id) : undefined}
                  onNewer={newerRun ? () => selectRun(newerRun.id) : undefined}
                />
              ) : view === "task" && activeSummary ? (
                <TaskOverview
                  summary={activeSummary}
                  query={appQuery}
                  onQueryChange={(value) => void setFilters({ model: value })}
                  picks={picks}
                  pickFull={picks.length >= MAX_COMPARED}
                  onOpen={(id) => openApps([id])}
                  onTogglePick={togglePick}
                  onOpenApps={openApps}
                />
              ) : (
                <HomeOverview
                  groups={navGroups}
                  tasks={taskSummaries}
                  date={date}
                  appCount={entries.length}
                  onSelectRun={selectRun}
                  onSelectTask={selectTask}
                  onClearDate={() => void setFilters({ date: "all" })}
                  onOpenApps={openApps}
                />
              )}
            </main>

            <CompareTray
              entries={pickEntries}
              colorFor={colorsFor(pickEntries, groupById)}
              onRemove={togglePick}
              onClear={() => setPicks([])}
              onCompare={comparePicks}
            />
          </>
        )}

        <CommandPalette
          open={palette.open}
          onOpenChange={(open) => setPalette((current) => ({ ...current, open }))}
          items={paletteItems}
          initialQuery={palette.query}
          appCount={entries.length}
        />
        <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
      </SidebarInset>
    </>
  )
}

function MissingComparison({ backLabel, onBack }: { backLabel: string; onBack: () => void }) {
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeftIcon data-icon="inline-start" />
          {backLabel}
        </Button>
      </header>
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>These apps are gone</EmptyTitle>
          <EmptyDescription>
            The link points to apps that are no longer in the catalog. They may
            have been renamed or are still being recorded.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={onBack}>Back to {backLabel}</Button>
      </Empty>
    </>
  )
}
