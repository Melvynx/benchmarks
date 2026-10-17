import { createServerFn } from "@tanstack/react-start"

import type { BenchmarkEntry } from "./benchmarks.server"

const CATALOG_TTL_MS = 4_000
let catalogCache: { at: number; entries: BenchmarkEntry[] } | null = null

/**
 * The page polls this catalog, so it ships only what the views read: each
 * transcript's phase analysis is half the payload and is never rendered here.
 */
function slimEntry(entry: BenchmarkEntry): BenchmarkEntry {
  if (!entry.accounting) return entry
  return {
    ...entry,
    accounting: {
      ...entry.accounting,
      transcripts: entry.accounting.transcripts.map((item) => ({
        ...item,
        analysis: null,
      })),
    },
  }
}

export const getBenchmarkCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getBenchmarkEntries } = await import("./benchmarks.server")
    const now = Date.now()
    if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) {
      return catalogCache.entries
    }
    const entries = getBenchmarkEntries().map(slimEntry)
    catalogCache = { at: now, entries }
    return entries
  }
)

export const getComparisonCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getComparisons } = await import("./comparisons.server")
    return getComparisons()
  }
)
