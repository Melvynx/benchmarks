import type { IntegrityAnalysis } from "@/lib/integrity-analysis"
import { cn } from "@/lib/utils"

const riskStyles = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  high: "border-destructive/30 bg-destructive/10 text-destructive",
} as const

const riskLabels = {
  low: "Low risk",
  review: "Review",
  high: "High risk",
} as const

function signalLabel(detected: boolean, count: number) {
  if (!detected) return "No signal"
  return `${count} signal${count === 1 ? "" : "s"}`
}

export function IntegrityReview({
  id,
  analysis,
}: {
  id: string
  analysis: IntegrityAnalysis | null
}) {
  const sectionId = id.replaceAll("/", "-")
  if (!analysis || analysis.status === "empty") {
    return (
      <section
        className="rounded-xl border bg-card p-4"
        aria-labelledby={`integrity-${sectionId}`}
      >
        <h3 id={`integrity-${sectionId}`} className="text-sm font-semibold">
          Post-run integrity review
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No substantive transcript activity was available to review.
        </p>
      </section>
    )
  }

  const internetActions =
    analysis.internet_activity.searches +
    analysis.internet_activity.fetches +
    analysis.internet_activity.direct_requests

  return (
    <section
      className="rounded-xl border bg-card p-4"
      aria-labelledby={`integrity-${sectionId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            id={`integrity-${sectionId}`}
            className="text-sm font-semibold text-balance"
          >
            Post-run integrity review
          </h3>
          <p className="mt-0.5 max-w-[58ch] text-xs text-pretty text-muted-foreground">
            Automated evidence review of model-authored text and tool calls
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[11px] font-medium",
              riskStyles[analysis.risk_level]
            )}
          >
            {riskLabels[analysis.risk_level]}
          </span>
          <div className="text-right">
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Cheat-risk index
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {analysis.risk_score}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-pretty">{analysis.summary}</p>

      <dl className="overview-integrity-grid mt-4 grid overflow-hidden rounded-lg border bg-border">
        <div className="min-w-0 bg-card p-3">
          <dt className="text-[11px] text-muted-foreground">Benchmark awareness</dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {signalLabel(
              analysis.benchmark_awareness.detected,
              analysis.benchmark_awareness.evidence_count
            )}
          </dd>
        </div>
        <div className="min-w-0 bg-card p-3">
          <dt className="text-[11px] text-muted-foreground">Public internet</dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {internetActions} action{internetActions === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="min-w-0 bg-card p-3">
          <dt className="text-[11px] text-muted-foreground">Prior-result access</dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {signalLabel(
              analysis.prior_result_access.detected,
              analysis.prior_result_access.evidence_count
            )}
          </dd>
        </div>
        <div className="min-w-0 bg-card p-3">
          <dt className="text-[11px] text-muted-foreground">Prompt-catalog access</dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {signalLabel(
              analysis.prompt_access.detected,
              analysis.prompt_access.evidence_count
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-4 @xl:grid-cols-2">
        <div>
          <h4 className="text-xs font-medium">Important observations</h4>
          <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
            {analysis.observations.slice(0, 5).map((observation) => (
              <li key={observation} className="flex gap-2 text-pretty">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                <span>{observation}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-medium">Recorded behavior</h4>
          <dl className="mt-2 divide-y text-xs">
            <div className="flex justify-between gap-3 py-1.5 first:pt-0">
              <dt className="text-muted-foreground">File changes</dt>
              <dd className="font-mono tabular-nums">
                {analysis.workflow.file_changes}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">Verification actions</dt>
              <dd className="font-mono tabular-nums">
                {analysis.workflow.verification_actions}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">Delegated actions</dt>
              <dd className="font-mono tabular-nums">
                {analysis.workflow.delegated_actions}
              </dd>
            </div>
            {analysis.workflow.top_tools.length > 0 && (
              <div className="flex items-start justify-between gap-3 py-1.5 last:pb-0">
                <dt className="shrink-0 text-muted-foreground">Top tools</dt>
                <dd className="text-right font-mono text-[11px] text-pretty">
                  {analysis.workflow.top_tools
                    .slice(0, 3)
                    .map(({ name, count }) => `${name} ×${count}`)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {analysis.evidence.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <h4 className="text-xs font-medium">Evidence to review</h4>
          <ul className="mt-2 space-y-2">
            {analysis.evidence.slice(0, 3).map((item) => (
              <li key={`${item.line}-${item.label}`} className="text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{item.label}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    JSONL line {item.line}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-pretty text-muted-foreground">
                  {item.excerpt}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 border-t pt-3 text-[10px] text-pretty text-muted-foreground">
        {analysis.caveat}
      </p>
    </section>
  )
}
