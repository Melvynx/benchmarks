import { CopyIcon, ExternalLinkIcon, FileTextIcon, FolderIcon } from "lucide-react"
import { useEffect, useReducer, useState } from "react"

import { EvidenceOverview } from "@/components/evidence-overview"
import type { TranscriptAnalysis } from "@/components/transcript-phase-chart"
import { TranscriptViewer } from "@/components/transcript-viewer"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import { effortLabel } from "@/lib/effort-label"
import { formatCost, formatDuration, formatInteger } from "@/lib/format"
import type { IntegrityAnalysis } from "@/lib/integrity-analysis"
import type { ModelReview } from "@/lib/model-review"
import {
  usageDurationLabel
  
  
} from "@/lib/session-usage"
import type {SessionUsage, UsageStep} from "@/lib/session-usage";

const COPY_CONFIRMATION_DURATION_MS = 1_200

type Evidence = {
  appPath: string
  command: string
  evidencePath: string
  effort: string
  durationMs: number | null
  activeDurationMs: number | null
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
  modelReview: ModelReview | null
  transcriptOriginalBytes: number
  sessionUsage: SessionUsage | null
  usageSteps: UsageStep[]
}

export function EvidencePanel({
  entry,
}: {
  entry: BenchmarkEntry
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
              activeDuration={formatDuration(
                evidence.activeDurationMs ?? evidence.durationMs ?? entry.durationMs
              )}
              wallDuration={formatDuration(entry.accounting?.wallDurationMs ?? evidence.durationMs ?? entry.durationMs)}
              usage={evidence.sessionUsage}
              usageSteps={evidence.usageSteps ?? []}
              accounting={entry.accounting}
              analysis={evidence.transcriptAnalysis}
              integrity={evidence.integrityAnalysis}
              review={evidence.modelReview}
            />
          </TabsContent>
          <TabsContent value="transcript" className="min-h-0 flex-1">
            {evidence.transcript ? (
              <TranscriptViewer
                transcript={evidence.transcript}
                prompt={evidence.prompt}
                durationMs={evidence.activeDurationMs ?? evidence.durationMs}
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
  return value === null ? "Not recorded" : formatInteger(value)
}

function costLabel(value: number | null) {
  return value === null ? "Not recorded" : formatCost(value)
}

function ExtendedEvidence({
  evidence,
  entry,
  copiedValue,
  copyToClipboard,
}: {
  evidence: Evidence
  entry: BenchmarkEntry
  copiedValue: string
  copyToClipboard: (label: string, value: string) => Promise<void>
}) {
  const usage = evidence.sessionUsage
  const details = [
    [
      "Wall time",
      evidence.durationMs === null
        ? null
        : formatDuration(evidence.durationMs),
    ],
    [
      "Active transcript time",
      evidence.activeDurationMs === null
        ? null
        : formatDuration(evidence.activeDurationMs),
    ],
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
      usageDurationLabel(entry.model),
      usage?.duration_api_ms === null || usage?.duration_api_ms === undefined
        ? null
        : formatDuration(usage.duration_api_ms),
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
