import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import type { TranscriptCost } from "@/lib/transcript-accounting.server"
import { formatDuration } from "@/lib/format"

const number = (value: number | null) =>
  value === null ? "Unknown" : value.toLocaleString("en-US")
const money = (value: number | null) =>
  value === null ? "Unknown" : `$${value.toFixed(4)}`
function total(
  items: TranscriptCost[],
  key: "costUsd" | "reportedCostUsd" | "estimatedCostUsd" | "durationMs"
) {
  const values = items.flatMap((item) =>
    item[key] === null ? [] : [item[key]]
  )
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
}
function wallTime(items: TranscriptCost[]) {
  const starts = items.flatMap((item) =>
    item.startedAt ? [Date.parse(item.startedAt)] : []
  )
  const ends = items.flatMap((item) =>
    item.completedAt
      ? [Date.parse(item.completedAt)]
      : item.startedAt
        ? [Date.now()]
        : []
  )
  return starts.length && ends.length
    ? Math.max(...ends) - Math.min(...starts)
    : null
}
function modelName(item: TranscriptCost) {
  return item.model.replace(/-(medium|xhigh|high|low)$/, "")
}

export function AccountingSummary({ entries }: { entries: BenchmarkEntry[] }) {
  const transcripts = [
    ...new Map(
      entries
        .flatMap((entry) => entry.accounting?.transcripts ?? [])
        .map((item) => [item.id, item])
    ).values(),
  ]
  if (!transcripts.length) return null
  const groups = new Map<string, TranscriptCost[]>()
  for (const item of transcripts) {
    const key = `${modelName(item)} · ${item.effort}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const missing = transcripts.filter((item) => item.costUsd === null).length
  const partial = transcripts.filter(
    (item) => item.costUsd !== null && !item.complete
  ).length
  const exportJson = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { exportedAt: new Date().toISOString(), transcripts },
            null,
            2
          ),
        ],
        { type: "application/json" }
      )
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "benchmark-transcript-costs.json"
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="space-y-3" aria-label="Transcript accounting">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          All attempts · time, cost & tokens
        </h3>
        <button
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={exportJson}
        >
          Export transcript ledger
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {transcripts.length} unique transcripts, including interrupted attempts
        and every continuation. Known subtotal:{" "}
        {money(total(transcripts, "costUsd"))} · {missing} unknown · {partial}{" "}
        partial. Reported costs and API estimates are separate; subscription
        invoices and unreported usage are not inferred. Times sum invocations,
        including tool waits.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[70rem] text-left text-xs">
          <thead className="border-b text-muted-foreground">
            <tr>
              {[
                "Actual model / effort",
                "Transcripts",
                "Model time",
                "Wall time",
                "Reported USD",
                "Estimated USD",
                "Known subtotal",
                "Unknown / partial",
                "Tokens",
              ].map((name) => (
                <th className="p-3 font-medium" key={name}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...groups]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, items]) => (
                <tr key={key}>
                  <td className="p-3">{key}</td>
                  <td className="p-3">{items.length}</td>
                  <td className="p-3 font-mono">
                    {formatDuration(total(items, "durationMs"))}
                  </td>
                  <td className="p-3 font-mono">
                    {formatDuration(wallTime(items))}
                  </td>
                  <td className="p-3 font-mono">
                    {money(total(items, "reportedCostUsd"))}
                  </td>
                  <td className="p-3 font-mono">
                    {money(total(items, "estimatedCostUsd"))}
                  </td>
                  <td className="p-3 font-mono">
                    {money(total(items, "costUsd"))}
                  </td>
                  <td className="p-3">
                    {items.filter((item) => item.costUsd === null).length} /{" "}
                    {
                      items.filter(
                        (item) => item.costUsd !== null && !item.complete
                      ).length
                    }
                  </td>
                  <td className="p-3 font-mono">
                    {number(
                      items.some((item) => item.usage?.total_tokens != null)
                        ? items.reduce(
                            (sum, item) =>
                              sum + (item.usage?.total_tokens ?? 0),
                            0
                          )
                        : null
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <details className="rounded-xl border p-3 text-xs">
        <summary className="cursor-pointer">
          Every transcript: task, source, timing, tokens, cost and integrity (
          {transcripts.length})
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[85rem] text-left">
            <thead>
              <tr>
                {[
                  "Task / transcript",
                  "Model / effort / harness",
                  "Time",
                  "Cost USD",
                  "Basis",
                  "Input / cache / output",
                  "Details",
                ].map((name) => (
                  <th className="p-2" key={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {transcripts.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-80 p-2 break-all">
                    {item.task}
                    <div className="text-muted-foreground">
                      {item.transcript}
                    </div>
                  </td>
                  <td className="p-2">
                    {item.model}
                    <div>
                      {item.effort} · {item.harness}
                    </div>
                  </td>
                  <td
                    className="p-2 font-mono"
                    title={`${item.startedAt ?? "?"} → ${item.completedAt ?? "in progress"}`}
                  >
                    {formatDuration(item.durationMs)}
                  </td>
                  <td className="p-2 font-mono">{money(item.costUsd)}</td>
                  <td className="p-2" title={item.note}>
                    {item.costKind}
                    {!item.complete ? " · partial" : ""}
                    {item.pricingSource && (
                      <a
                        className="block underline"
                        href={item.pricingSource}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Pricing source
                      </a>
                    )}
                  </td>
                  <td className="p-2 font-mono">
                    {number(item.usage?.input_tokens ?? null)} /{" "}
                    {number(item.usage?.cached_input_tokens ?? null)} /{" "}
                    {number(item.usage?.output_tokens ?? null)}
                  </td>
                  <td className="p-2">
                    <details>
                      <summary>Raw data + SHA-256</summary>
                      <pre className="max-w-xl break-all whitespace-pre-wrap">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
