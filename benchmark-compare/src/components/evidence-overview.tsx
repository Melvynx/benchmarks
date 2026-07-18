import { ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { IntegrityReview } from "@/components/integrity-review"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TranscriptAnalysis } from "@/components/transcript-phase-chart"
import type { IntegrityAnalysis } from "@/lib/integrity-analysis"
import { estimateModelCost, getModelPricing } from "@/lib/model-pricing"
import type { SessionUsage } from "@/lib/session-usage"
import { cn } from "@/lib/utils"

const phases = [
  {
    key: "context_gathering",
    label: "Context",
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
] as const

const integerFormatter = new Intl.NumberFormat("en")
const currencyFormatter = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
})
const percentFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
})

function tokenLabel(value: number | null) {
  return value === null ? "Not recorded" : integerFormatter.format(value)
}

function costLabel(value: number | null) {
  return value === null ? "Not recorded" : currencyFormatter.format(value)
}

function percent(value: number | null, total: number | null) {
  if (value === null || total === null || total <= 0) return null
  return (value / total) * 100
}

function percentLabel(value: number | null) {
  if (value === null) return "Not recorded"
  return `${percentFormatter.format(value)}%`
}

function elapsedLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  const totalSeconds = Math.max(0, Math.round(value / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`
}

export function EvidenceOverview({
  id,
  model,
  date,
  effort,
  duration,
  usage,
  analysis,
  integrity,
}: {
  id: string
  model: string
  date: string
  effort: string
  duration: string
  usage: SessionUsage | null
  analysis: TranscriptAnalysis | null
  integrity: IntegrityAnalysis | null
}) {
  const sectionId = id.replaceAll("/", "-")
  const pricing = getModelPricing(model, date)
  const estimate = usage ? estimateModelCost(model, date, usage) : null
  const inputShare = percent(
    usage?.processed_input_tokens ?? null,
    usage?.total_tokens ?? null
  )
  const outputShare = percent(
    usage?.output_tokens ?? null,
    usage?.total_tokens ?? null
  )
  const cacheShare = percent(
    usage?.cached_input_tokens ?? null,
    usage?.processed_input_tokens ?? null
  )
  const pricedLines = estimate?.lines.filter((line) => line.tokens > 0) ?? []
  const runTime = duration.replace(/^Time:\s*/, "")
  const apiTime = elapsedLabel(usage?.duration_api_ms)

  return (
    <ScrollArea className="h-full">
      <div className="@container space-y-5 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary ring-1 ring-primary/25">
              {effort}
            </Badge>
            <Badge variant="outline">{model}</Badge>
            {usage?.status === "partial" && (
              <Badge variant="outline">Recovered usage · lower bound</Badge>
            )}
          </div>
          <dl className="ml-auto flex items-baseline gap-4 font-mono tabular-nums">
            <div className="flex items-baseline gap-2">
              <dt className="text-[11px] text-muted-foreground">Run time</dt>
              <dd className="text-lg font-semibold">{runTime}</dd>
            </div>
            {apiTime && (
              <div className="flex items-baseline gap-2 border-l pl-4">
                <dt className="text-[11px] text-muted-foreground">API time</dt>
                <dd className="text-sm font-medium">{apiTime}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="overview-primary-grid grid overflow-hidden rounded-xl border bg-card">
          <section
            className="min-w-0 p-4"
            aria-labelledby={`overview-cost-${sectionId}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id={`overview-cost-${sectionId}`}
                  className="text-sm font-semibold text-balance"
                >
                  Estimated API cost
                </h3>
                <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
                  Official base rates applied to this run
                </p>
              </div>
              <p className="shrink-0 font-mono text-2xl font-semibold tabular-nums">
                {costLabel(estimate?.totalUsd ?? null)}
              </p>
            </div>

            {estimate ? (
              <>
                {usage?.status === "partial" && (
                  <p className="mt-4 text-xs text-amber-500">
                    Recovered from completed API calls. A response that was still
                    in flight when the run stopped may not be included.
                  </p>
                )}
                <dl className="mt-4 divide-y border-y text-xs">
                  {pricedLines.map((line) => (
                    <div
                      key={line.key}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 py-2"
                    >
                      <dt className="truncate text-muted-foreground">
                        {line.label}
                      </dt>
                      <dd className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {tokenLabel(line.tokens)}
                      </dd>
                      <dd className="min-w-16 text-right font-mono font-medium tabular-nums">
                        {costLabel(line.costUsd)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="max-w-[52ch] space-y-1 text-pretty">
                    <p>
                      Rates per MTok: input {costLabel(pricing?.rates.input ?? null)},
                      cache {costLabel(pricing?.rates.cacheRead ?? null)}, output{" "}
                      {costLabel(pricing?.rates.output ?? null)}.
                    </p>
                    <p>{estimate.pricing.note}</p>
                  </div>
                  <a
                    className="inline-flex shrink-0 items-center gap-1 text-foreground underline underline-offset-4"
                    href={estimate.pricing.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official rates
                    <ExternalLinkIcon className="size-3" aria-hidden="true" />
                  </a>
                </div>
              </>
            ) : pricing ? (
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  Usage was not recorded, so a per-run estimate is unavailable.
                </p>
                <p className="text-xs">
                  Official rates per MTok: input {costLabel(pricing.rates.input)},
                  cache {costLabel(pricing.rates.cacheRead)}, output{" "}
                  {costLabel(pricing.rates.output)}.
                </p>
                <div className="flex flex-wrap items-start justify-between gap-2 text-[11px]">
                  <p className="max-w-[46ch] text-pretty">{pricing.note}</p>
                  <a
                    className="inline-flex shrink-0 items-center gap-1 text-foreground underline underline-offset-4"
                    href={pricing.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official rates
                    <ExternalLinkIcon className="size-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No official pricing mapping is available for this model.
              </p>
            )}
          </section>

          <section
            className="min-w-0 p-4"
            aria-labelledby={`overview-tokens-${sectionId}`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h3
                  id={`overview-tokens-${sectionId}`}
                  className="text-sm font-semibold text-balance"
                >
                  Token profile
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Total processed by the run
                </p>
              </div>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {tokenLabel(usage?.total_tokens ?? null)}
              </p>
            </div>

            <div
              className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Input ${percentLabel(inputShare)}, output ${percentLabel(outputShare)}`}
            >
              {inputShare !== null && (
                <div
                  className="bg-primary/35"
                  style={{ width: `${inputShare}%` }}
                />
              )}
              {outputShare !== null && (
                <div
                  className="bg-primary"
                  style={{ width: `${outputShare}%` }}
                />
              )}
            </div>

            <dl className="mt-4 divide-y text-xs">
              <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                <dt className="text-muted-foreground">Input</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {tokenLabel(usage?.processed_input_tokens ?? null)}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {percentLabel(inputShare)}
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Output</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {tokenLabel(usage?.output_tokens ?? null)}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {percentLabel(outputShare)}
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Cache read</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {tokenLabel(usage?.cached_input_tokens ?? null)}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {percentLabel(cacheShare)} of input
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 last:pb-0">
                <dt className="text-muted-foreground">Reasoning output</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {tokenLabel(usage?.reasoning_output_tokens ?? null)}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section
          className="rounded-xl border bg-card p-4"
          aria-labelledby={`overview-activity-${sectionId}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3
                id={`overview-activity-${sectionId}`}
                className="text-sm font-semibold text-balance"
              >
                Transcript activity
              </h3>
              <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
                How the model distributed its work across the run
              </p>
            </div>
            {typeof analysis?.classified_segments === "number" && (
              <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {analysis.classified_segments} classified events
              </p>
            )}
          </div>

          {analysis ? (
            <>
              <div
                className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={phases
                  .map(
                    ({ key, label }) =>
                      `${label} ${analysis.categories[key].percentage}%`
                  )
                  .join(", ")}
              >
                {phases.map(({ key, color }) => (
                  <div
                    key={key}
                    className={cn(color, "min-w-px")}
                    style={{
                      width: `${analysis.categories[key].percentage}%`,
                    }}
                  />
                ))}
              </div>
              <dl className="overview-phase-grid mt-4 grid gap-x-5 gap-y-3">
                {phases.map(({ key, label, color }) => (
                  <div key={key} className="min-w-0">
                    <dt className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <span
                        className={cn(color, "size-2 shrink-0 rounded-sm")}
                        aria-hidden="true"
                      />
                      {label}
                    </dt>
                    <dd className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                      <span className="text-base font-semibold">
                        {analysis.categories[key].percentage}%
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {analysis.categories[key].segments} events
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Transcript activity was not classified for this historical run.
            </p>
          )}
        </section>

        <IntegrityReview id={id} analysis={integrity} />
      </div>
    </ScrollArea>
  )
}
