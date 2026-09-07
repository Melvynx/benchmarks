import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { RunThumbnail } from "@/components/run-thumbnail"
import { Badge } from "@/components/ui/badge"
import type { RunGroupDetail, RunTask } from "@/lib/runs"
import {
  formatBytes,
  formatDuration,
  loadRunGroup,
  runGroupLabel,
} from "@/lib/runs"

const REFRESH_INTERVAL_MS = 2_500

export const Route = createFileRoute("/runs/$id")({
  loader: async ({ params }) => {
    const group = await loadRunGroup({ data: params.id })
    if (!group) throw notFound()
    return group
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `Run ${loaderData.id}` : "Run" }],
  }),
  component: RunDetail,
})

function RunDetail() {
  const initial = Route.useLoaderData()
  const { id } = Route.useParams()
  const [group, setGroup] = useState<RunGroupDetail>(initial)

  useEffect(() => setGroup(initial), [initial])

  // Only a group still executing needs polling; a finished one never changes.
  useEffect(() => {
    if (!group.live) return
    let cancelled = false
    const timer = setInterval(async () => {
      const next = await loadRunGroup({ data: id })
      if (!cancelled && next) setGroup(next)
    }, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [group.live, id])

  const elapsed = group.live
    ? Date.now() - Date.parse(group.startedAt)
    : group.durationMs
  const running = group.tasks.filter(
    (task) => !task.done && !task.stale
  ).length
  const abandoned = group.tasks.filter((task) => task.stale).length

  return (
    <main className="mx-auto min-h-svh w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-10 flex items-center justify-between gap-4">
        <Link
          to="/runs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All runs
        </Link>
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Benchmark Compare
        </Link>
      </nav>

      <header className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          {group.live ? (
            <Badge className="gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Live
            </Badge>
          ) : (
            <Badge variant="secondary">Complete</Badge>
          )}
          {group.models.map((model) => (
            <Badge key={model} variant="secondary">
              {model}
            </Badge>
          ))}
          {group.efforts.map((effort) => (
            <Badge key={effort} variant="outline">
              {effort}
            </Badge>
          ))}
        </div>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {group.taskNames.length}{" "}
          {group.taskNames.length === 1 ? "task" : "tasks"} ·{" "}
          {group.models.join(", ")}
        </h1>
        <p className="mt-3 font-mono text-xs break-all text-muted-foreground">
          {runGroupLabel(group)}
        </p>
      </header>

      <section
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Overview"
      >
        <Stat label="Completed" value={`${group.done} / ${group.total}`} />
        <Stat
          label={abandoned ? `Running · ${abandoned} abandoned` : "Running"}
          value={String(running)}
        />
        <Stat label="Elapsed" value={formatDuration(elapsed)} mono />
        <Stat
          label="Transcript volume"
          value={formatBytes(group.transcriptBytes)}
          mono
        />
        <Stat
          label="Write throughput"
          value={`${(group.bytesPerSecond / 1024).toFixed(1)} KB/s`}
          mono
        />
      </section>

      <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <Th>App</Th>
              <Th>Task</Th>
              <Th>Model</Th>
              <Th>Effort</Th>
              <Th>Status</Th>
              <Th className="text-right">Transcript</Th>
              <Th className="text-right">Files</Th>
              <Th className="text-right">Duration</Th>
              <Th>Latest activity</Th>
            </tr>
          </thead>
          <tbody>
            {group.tasks.map((task) => (
              <TaskRow key={task.key} task={task} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p
        className={`text-2xl tracking-tight ${mono ? "font-mono text-xl" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`} scope="col">
      {children}
    </th>
  )
}

function TaskRow({ task }: { task: RunTask }) {
  const failed =
    task.done && task.verification && task.verification !== "harness-verified"

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/40">
      <td className="py-3 pl-4">
        <RunThumbnail
          src={task.thumbnail}
          alt={`${task.task} rendered by ${task.model}`}
          className="w-32"
        />
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${
              task.done
                ? failed
                  ? "bg-destructive"
                  : "bg-emerald-400"
                : task.stale
                  ? "bg-muted-foreground/40"
                  : "animate-pulse bg-primary"
            }`}
          />
          <span className={task.done ? "text-muted-foreground" : "font-medium"}>
            {task.task}
          </span>
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary">{task.model}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{task.effort}</Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {task.done
          ? failed
            ? task.verification
            : "Ready"
          : task.stale
            ? "Abandoned"
            : "Building"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
        {formatBytes(task.transcriptBytes)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
        {task.appFiles}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
        {formatDuration(task.durationMs)}
      </td>
      <td className="max-w-md px-4 py-3">
        <ActivityCell task={task} />
      </td>
    </tr>
  )
}

function ActivityCell({ task }: { task: RunTask }) {
  if (task.done) return <span className="text-muted-foreground">—</span>
  if (!task.activity) {
    return (
      <span className="text-xs text-muted-foreground">
        Waiting for output…
      </span>
    )
  }

  const { activity } = task
  const prefix = activity.kind === "tool" ? activity.name : activity.kind
  return (
    <span
      className="flex items-baseline gap-2 truncate font-mono text-xs text-muted-foreground"
      title={`${prefix} ${activity.value}`}
    >
      <span className={activity.kind === "tool" ? "text-foreground" : ""}>
        {prefix}
      </span>
      <span className="truncate">{activity.value}</span>
      <span className="ml-auto shrink-0 tabular-nums">
        {task.idleSeconds < 120
          ? `${task.idleSeconds}s`
          : formatDuration(task.idleSeconds * 1000)}
      </span>
    </span>
  )
}
