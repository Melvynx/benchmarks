import { Link, createFileRoute } from "@tanstack/react-router"
import { ActivityIcon, ArrowRightIcon } from "lucide-react"

import { RunCoverStrip } from "@/components/run-thumbnail"
import { Badge } from "@/components/ui/badge"
import {
  formatBytes,
  formatDuration,
  loadRunGroups,
  runGroupLabel,
} from "@/lib/runs"

export const Route = createFileRoute("/runs/")({
  loader: () => loadRunGroups(),
  head: () => ({
    meta: [
      { title: "Benchmark Runs" },
      {
        name: "description",
        content:
          "Every benchmark group recorded in this repository, live while it runs.",
      },
    ],
  }),
  component: RunIndex,
})

function RunIndex() {
  const groups = Route.useLoaderData()
  const liveGroups = groups.filter((group) => group.live)

  return (
    <main className="mx-auto min-h-svh w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-10 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Benchmark Compare
        </Link>
        <Link
          to="/prompts"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Prompts
        </Link>
      </nav>

      <header className="max-w-3xl">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-card">
          <ActivityIcon className="size-5 text-primary" />
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Benchmark runs
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Every comparison group recorded under <code>runs/</code>, newest
          first. A group still executing updates live, task by task.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{groups.length} groups</span>
          <span aria-hidden="true">·</span>
          <span>
            {liveGroups.length
              ? `${liveGroups.length} running now`
              : "Nothing running"}
          </span>
        </div>
      </header>

      <section className="mt-12 flex flex-col gap-3" aria-label="Run groups">
        {groups.map((group) => (
          <Link
            key={group.id}
            to="/runs/$id"
            params={{ id: group.id }}
            className="group flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-5 sm:p-5"
          >
            <RunCoverStrip
              covers={group.covers}
              extra={group.taskNames.length - group.covers.length}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {group.live ? (
                  <Badge className="gap-1.5">
                    <span className="size-1.5 animate-pulse rounded-full bg-current" />
                    Live
                  </Badge>
                ) : null}
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
                {group.failed ? (
                  <Badge variant="destructive">{group.failed} failed</Badge>
                ) : null}
              </div>
              <p className="mt-3 truncate font-mono text-xs text-muted-foreground">
                {runGroupLabel(group)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {group.taskNames.length}{" "}
                {group.taskNames.length === 1 ? "task" : "tasks"} ·{" "}
                {group.harnesses.join(", ")} ·{" "}
                {formatBytes(group.transcriptBytes)} of transcripts
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <div className="text-right">
                <p className="font-mono text-lg">
                  {group.done}
                  <span className="text-muted-foreground">/{group.total}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(group.durationMs)}
                </p>
              </div>
              <ArrowRightIcon className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}
