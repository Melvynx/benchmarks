import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"

export function continuationSource(directory: string): string | null {
  try {
    const metadata = JSON.parse(readFileSync(join(directory, "metadata.json"), "utf8")) as { continuation_of?: string }
    const pointer = join(directory, "continuation-of.txt")
    const source = metadata.continuation_of || (existsSync(pointer) ? readFileSync(pointer, "utf8").trim() : "")
    if (!source) return null
    const runs = dirname(dirname(dirname(directory)))
    const task = directory.split(/[\\/]/).pop()!
    const target = source.includes("/data/")
      ? isAbsolute(source) ? source : resolve(dirname(runs), source)
      : join(runs, source, "data", task)
    return target !== directory && existsSync(target) ? target : null
  } catch { return null }
}

export function mirroredIteration(directory: string): boolean {
  try {
    return realpathSync(join(directory, "transcript.jsonl")) === realpathSync(join(directory, "iterations", "1", "transcript.jsonl"))
  } catch { return false }
}

export function continuationDuration(directory: string): number {
  let source = continuationSource(directory)
  let total = 0
  const visited = new Set([directory])
  while (source && !visited.has(source)) {
    visited.add(source)
    try {
      const metadata = JSON.parse(readFileSync(join(source, "metadata.json"), "utf8")) as { model_timing?: { duration_ms?: number } }
      total += metadata.model_timing?.duration_ms ?? 0
    } catch { break }
    source = continuationSource(source)
  }
  return total
}
