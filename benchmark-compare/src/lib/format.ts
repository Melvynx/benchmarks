// One vocabulary for time, money, dates, harnesses, and status across the
// comparison surfaces. Every date renders in UTC because run IDs are UTC.

const integerFormatter = new Intl.NumberFormat("en")
const dayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const dayWithYearFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const shortDayFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
})
const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
})

export function formatInteger(value: number) {
  return integerFormatter.format(value)
}

/** 8.2s · 34m 12s · 1h 25m. Precision shrinks as the value grows. */
export function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "—"
  if (durationMs < 1_000) return `${Math.round(durationMs)}ms`
  const totalSeconds = durationMs / 1_000
  if (totalSeconds < 60)
    return `${totalSeconds < 10 ? totalSeconds.toFixed(1) : Math.round(totalSeconds)}s`
  const roundedSeconds = Math.round(totalSeconds)
  const hours = Math.floor(roundedSeconds / 3_600)
  const minutes = Math.floor((roundedSeconds % 3_600) / 60)
  const seconds = roundedSeconds % 60
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}m`
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`
}

/** $12.29 · $0.281 · $0.0034. Small costs keep three significant digits. */
export function formatCost(value: number | null) {
  if (value === null) return "—"
  if (value === 0) return "$0"
  if (value >= 100) return `$${Math.round(value)}`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toPrecision(3).replace(/0+$/, "")}`
}

function toDate(value: string | number | Date) {
  if (value instanceof Date) return value
  if (typeof value === "number") return new Date(value)
  // Plain YYYY-MM-DD values are days, not instants: pin them to UTC midnight.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value)
}

function isValid(date: Date) {
  return !Number.isNaN(date.getTime())
}

const DAY_MS = 86_400_000

function utcDayIndex(date: Date) {
  return Math.floor(date.getTime() / DAY_MS)
}

/** "Today", "Yesterday", "Wed, Sep 23" or "Wed, Sep 23, 2025". */
export function formatDay(value: string | number | Date, now = new Date()) {
  const date = toDate(value)
  if (!isValid(date)) return "Undated"
  const difference = utcDayIndex(now) - utcDayIndex(date)
  if (difference === 0) return "Today"
  if (difference === 1) return "Yesterday"
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? dayFormatter.format(date)
    : dayWithYearFormatter.format(date)
}

/** "Today", "Yesterday" or "Sep 23": for narrow columns. */
export function formatShortDay(value: string | number | Date, now = new Date()) {
  const date = toDate(value)
  if (!isValid(date)) return "Undated"
  const difference = utcDayIndex(now) - utcDayIndex(date)
  if (difference === 0) return "Today"
  if (difference === 1) return "Yesterday"
  return shortDayFormatter.format(date)
}

/** "00:03", the UTC clock time without a zone suffix, for dense lists. */
export function formatClock(value: string | number | Date) {
  const date = toDate(value)
  return isValid(date) ? timeFormatter.format(date) : ""
}

/** Always the absolute day, for titles where "Today" would age badly. */
export function formatAbsoluteDay(value: string | number | Date) {
  const date = toDate(value)
  return isValid(date) ? dayWithYearFormatter.format(date) : "Undated"
}

export function formatTime(value: string | number | Date) {
  const date = toDate(value)
  return isValid(date) ? `${timeFormatter.format(date)} UTC` : ""
}

export function formatRelative(value: string | number | Date, now = new Date()) {
  const date = toDate(value)
  if (!isValid(date)) return ""
  const seconds = Math.round((date.getTime() - now.getTime()) / 1_000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size)
      return relativeFormatter.format(Math.round(seconds / size), unit)
  }
  return "just now"
}

export function harnessLabel(harness: string) {
  switch (harness) {
    case "cc":
      return "Claude Code"
    case "ccx":
      return "Claude Code · GPT"
    case "cckimi":
      return "Claude Code · Kimi"
    case "codex":
      return "Codex"
    case "cursor-agent":
      return "Cursor Agent"
    case "opencode":
      return "OpenCode"
    case "muse":
      return "Muse Code"
    default:
      return harness
  }
}

const effortNames: Record<string, string | undefined> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "X-High",
  max: "Max",
  ultra: "Ultra",
}

/** The bare effort name, or null when the run never recorded one. */
export function effortName(effort: string) {
  return effortNames[effort.trim().toLowerCase()] ?? null
}

const modelEffortSuffix = /-(extra-high|xhigh|high|medium|low|minimal|max)$/

/**
 * The effort to print beside a model chip, or null when the model name
 * already ends with it ("opus-5.5-300k-medium") or none was recorded.
 */
export function chipEffort(item: { model: string; effort: string }) {
  const effort = effortName(item.effort)
  const suffix = modelEffortSuffix.exec(item.model)?.[1]
  if (!effort || !suffix) return effort
  return effortName(suffix === "extra-high" ? "xhigh" : suffix) === effort ? null : effort
}

export type StatusTone = "success" | "danger" | "warning" | "running" | "neutral"

export function statusInfo(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case "harness-verified":
      return { label: "Completed", tone: "success" }
    case "terminated":
      return { label: "Terminated", tone: "success" }
    case "failed":
      return { label: "Failed", tone: "danger" }
    case "interrupted":
      return { label: "Interrupted", tone: "warning" }
    case "running":
      return { label: "Running", tone: "running" }
    case "unknown":
      return { label: "Unverified", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

export const statusDotClassName: Record<StatusTone, string> = {
  success: "bg-emerald-400",
  danger: "bg-red-400",
  warning: "bg-amber-400",
  running: "animate-pulse bg-sky-400",
  neutral: "bg-muted-foreground/50",
}

export const statusTextClassName: Record<StatusTone, string> = {
  success: "text-emerald-300",
  danger: "text-red-300",
  warning: "text-amber-300",
  running: "text-sky-300",
  neutral: "text-muted-foreground",
}

/** "Claude Code · X-High": the configuration line under a model name. */
export function configLabel(item: { harness: string; effort: string }) {
  return [harnessLabel(item.harness), effortName(item.effort)]
    .filter(Boolean)
    .join(" · ")
}
