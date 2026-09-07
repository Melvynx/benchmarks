import { createServerFn } from "@tanstack/react-start"

export type RunActivity =
  | { kind: "tool"; name: string; value: string }
  | { kind: "text" | "thinking"; name: null; value: string }

export type RunTask = {
  key: string
  runId: string
  task: string
  model: string
  harness: string
  effort: string
  done: boolean
  /** Never finished, and the transcript stopped growing long ago. */
  stale: boolean
  verification: string | null
  transcriptBytes: number
  appFiles: number
  idleSeconds: number
  bytesPerSecond: number
  durationMs: number
  activity: RunActivity | null
  port: number | null
  /** WebP preview of the captured screenshot, null until a run is captured. */
  thumbnail: string | null
}

export type RunGroupSummary = {
  id: string
  startedAt: string
  models: string[]
  harnesses: string[]
  efforts: string[]
  taskNames: string[]
  total: number
  done: number
  failed: number
  live: boolean
  transcriptBytes: number
  durationMs: number
  /** Thumbnails of the captured apps, used as the group's visual identity. */
  covers: RunCover[]
}

export type RunCover = {
  task: string
  thumbnail: string
}

export type RunGroupDetail = RunGroupSummary & {
  tasks: RunTask[]
  bytesPerSecond: number
}

export const loadRunGroups = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listRunGroups } = await import("./runs.server")
    return listRunGroups()
  }
)

export const loadRunGroup = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const { getRunGroup } = await import("./runs.server")
    return getRunGroup(data)
  })

export function runGroupLabel(group: Pick<RunGroupSummary, "id" | "startedAt">) {
  if (!group.id.startsWith("pending-")) return group.id
  return `Started ${group.startedAt.slice(0, 16).replace("T", " ")} UTC`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
}
