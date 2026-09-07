import type {
  ModelReview as ModelReviewData,
  ReviewAxis,
  ReviewVerdict,
} from "@/lib/model-review"
import { cn } from "@/lib/utils"

const verdictLabels: Record<ReviewVerdict, string> = {
  pass: "Pass",
  "pass-with-notes": "Pass with notes",
  fail: "Fail",
}

const verdictStyles: Record<ReviewVerdict, string> = {
  pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "pass-with-notes": "border-amber-500/30 bg-amber-500/10 text-amber-300",
  fail: "border-destructive/30 bg-destructive/10 text-destructive",
}

const integrityLabels = {
  "no-cheating-detected": "No cheating detected",
  "needs-review": "Needs review",
  "cheating-detected": "Cheating detected",
} as const

function AxisCard({ label, axis }: { label: string; axis: ReviewAxis }) {
  return (
    <article className="rounded-lg border bg-background/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-xs font-semibold">{label}</h4>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
              verdictStyles[axis.verdict]
            )}
          >
            {verdictLabels[axis.verdict]}
          </span>
          {axis.score !== null && (
            <span className="font-mono text-xs font-semibold tabular-nums">
              {axis.score}/10
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-pretty text-muted-foreground">
        {axis.summary}
      </p>
      {axis.findings.length > 0 && (
        <ul className="mt-3 space-y-2 border-t pt-3">
          {axis.findings.slice(0, 4).map((finding, index) => (
            <li key={`${finding.title}-${index}`} className="text-xs">
              <p className="font-medium">
                <span className="mr-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {finding.severity}
                </span>
                {finding.title}
              </p>
              <p className="mt-0.5 text-pretty text-muted-foreground">
                {finding.detail}
              </p>
              {finding.file && (
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  {finding.file}
                  {finding.line ? `:${finding.line}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function ModelReview({
  id,
  review,
}: {
  id: string
  review: ModelReviewData | null
}) {
  if (!review) return null
  const sectionId = id.replaceAll("/", "-")
  const integrityPass = review.integrity.verdict === "no-cheating-detected"

  return (
    <section
      className="rounded-xl border bg-card p-4"
      aria-labelledby={`model-review-${sectionId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id={`model-review-${sectionId}`} className="text-sm font-semibold">
            Independent model review
          </h3>
          <p className="mt-0.5 max-w-[62ch] text-xs text-pretty text-muted-foreground">
            Manual post-run review across code standards, prompt compliance, UX,
            and transcript integrity
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[11px] font-medium",
              verdictStyles[review.overall.verdict]
            )}
          >
            {verdictLabels[review.overall.verdict]}
          </span>
          {review.overall.score !== null && (
            <p className="font-mono text-xl font-semibold tabular-nums">
              {review.overall.score}
              <span className="text-xs font-normal text-muted-foreground">/10</span>
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-pretty">{review.overall.summary}</p>

      <div className="mt-4 rounded-lg border bg-background/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold">Manual integrity verdict</h4>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
              integrityPass
                ? verdictStyles.pass
                : review.integrity.verdict === "needs-review"
                  ? verdictStyles["pass-with-notes"]
                  : verdictStyles.fail
            )}
          >
            {integrityLabels[review.integrity.verdict]} · {review.integrity.confidence}
            {" confidence"}
          </span>
        </div>
        <p className="mt-2 text-xs text-pretty text-muted-foreground">
          {review.integrity.summary}
        </p>
        {review.integrity.evidence.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {review.integrity.evidence.slice(0, 3).map((item) => (
              <li key={item} className="flex gap-2 text-pretty">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid gap-3 @2xl:grid-cols-3">
        <AxisCard label="Code standards" axis={review.axes.standards} />
        <AxisCard label="Prompt compliance" axis={review.axes.specification} />
        <AxisCard label="UX and accessibility" axis={review.axes.ux} />
      </div>
    </section>
  )
}
