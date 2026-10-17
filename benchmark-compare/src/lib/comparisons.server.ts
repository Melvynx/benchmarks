import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import type { Comparison } from "./benchmark-groups"
import { benchmarkRoot } from "./benchmarks.server"

function parseComparison(raw: unknown): Comparison | null {
  if (!raw || typeof raw !== "object") return null
  const candidate = raw as Record<string, unknown>
  if (typeof candidate.id !== "string" || !Array.isArray(candidate.apps)) return null
  return {
    id: candidate.id,
    title: typeof candidate.title === "string" ? candidate.title : candidate.id,
    createdAt: typeof candidate.created_at === "string" ? candidate.created_at : "",
    apps: candidate.apps.filter((app): app is string => typeof app === "string"),
  }
}

/** Curated groups in `<root>/comparisons/*.json`; one app may belong to many. */
export function getComparisons(): Comparison[] {
  const directory = join(benchmarkRoot(), "comparisons")
  if (!existsSync(directory)) return []
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      try {
        const comparison = parseComparison(
          JSON.parse(readFileSync(join(directory, name), "utf8"))
        )
        return comparison ? [comparison] : []
      } catch {
        return []
      }
    })
}
