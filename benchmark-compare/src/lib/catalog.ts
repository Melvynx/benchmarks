import { createServerFn } from "@tanstack/react-start"

import type { BenchmarkEntry } from "./benchmarks.server"

const CATALOG_TTL_MS = 4_000
let catalogCache: { at: number; entries: BenchmarkEntry[] } | null = null

export const getBenchmarkCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getBenchmarkEntries } = await import("./benchmarks.server")
    const now = Date.now()
    if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) {
      return catalogCache.entries
    }
    const entries = getBenchmarkEntries()
    catalogCache = { at: now, entries }
    return entries
  }
)
