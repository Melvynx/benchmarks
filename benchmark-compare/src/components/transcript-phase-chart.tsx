export type TranscriptPhaseKey =
  "context_gathering" | "planning" | "implementation" | "verification"

export type TranscriptPhase = {
  percentage: number
  activity_characters: number
  segments: number
}

export type TranscriptAnalysis = {
  status: string
  basis?: string
  classified_segments?: number
  categories: Record<TranscriptPhaseKey, TranscriptPhase>
}

const phases: Array<{
  key: TranscriptPhaseKey
  label: string
  color: string
}> = [
  {
    key: "context_gathering",
    label: "Context gathering",
    color: "bg-phase-context",
  },
  { key: "planning", label: "Planning", color: "bg-phase-planning" },
  {
    key: "implementation",
    label: "Implementation",
    color: "bg-phase-implementation",
  },
  {
    key: "verification",
    label: "Verification",
    color: "bg-phase-verification",
  },
]

function formatEstimatedDuration(durationMs: number | null) {
  if (durationMs === null) return "Time unavailable"

  const totalSeconds = Math.max(0, Math.round(durationMs / 1_000))
  if (totalSeconds < 60) return `${totalSeconds}s estimated`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s estimated`
}

export function TranscriptPhaseChart({
  id,
  analysis,
  durationMs,
}: {
  id: string
  analysis: TranscriptAnalysis
  durationMs: number | null
}) {
  const titleId = `transcript-activity-${id.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`
  const progressLabel = phases
    .map(({ key, label }) => `${label} ${analysis.categories[key].percentage}%`)
    .join(", ")

  return (
    <section
      className="shrink-0 border-b bg-muted/20 px-5 py-4"
      aria-labelledby={titleId}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-sm font-medium">
            Transcript activity
          </h3>
          <p className="text-xs text-muted-foreground">
            Estimated phase time from the model’s total recorded time.
          </p>
        </div>
        {typeof analysis.classified_segments === "number" && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {analysis.classified_segments} classified events
          </span>
        )}
      </div>

      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted ring-1 ring-border"
        role="img"
        aria-label={progressLabel}
      >
        {phases.map(({ key, label, color }) => {
          const phase = analysis.categories[key]
          return (
            <div
              key={key}
              className={`${color} min-w-px first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${phase.percentage}%` }}
              title={`${label}: ${phase.percentage}%`}
            />
          )
        })}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {phases.map(({ key, label, color }) => {
          const phase = analysis.categories[key]
          const estimatedMs =
            durationMs === null ? null : durationMs * (phase.percentage / 100)
          return (
            <div key={key} className="flex min-w-0 items-start gap-2">
              <span
                className={`${color} mt-1 size-2.5 shrink-0 rounded-sm`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <dt className="truncate text-xs text-muted-foreground">
                  {label}
                </dt>
                <dd className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {phase.percentage}%
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatEstimatedDuration(estimatedMs)}
                  </span>
                </dd>
              </div>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
