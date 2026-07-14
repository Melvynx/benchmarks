import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

import { getBenchmarkEntries } from "@/lib/benchmarks.server"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"

export type PromptVersionSummary = {
  version: string
  url: string
}

export type PromptSummary = {
  slug: string
  title: string
  latestVersion: string
  versions: PromptVersionSummary[]
}

export type PromptVersion = PromptSummary & {
  version: string
  content: string
  repositoryPath: string
  results: BenchmarkEntry[]
}

const promptSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const promptVersionPattern = /^v(\d+)$/

function benchmarkRoot() {
  return resolve(process.env.BENCHMARK_ROOT || join(process.cwd(), ".."))
}

function promptTitle(slug: string) {
  return slug
    .split("-")
    .map((word) =>
      word === "3d" ? "3D" : `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    )
    .join(" ")
}

function promptVersions(directory: string) {
  if (!existsSync(directory)) return []
  return readdirSync(directory)
    .map((filename) => {
      const match = /^v(\d+)\.md$/.exec(filename)
      return match
        ? { version: `v${match[1]}`, number: Number(match[1]) }
        : null
    })
    .filter(
      (value): value is { version: string; number: number } => value !== null
    )
    .sort((left, right) => left.number - right.number)
}

export function getPromptCatalog(): PromptSummary[] {
  const promptRoot = join(benchmarkRoot(), "prompts")
  if (!existsSync(promptRoot)) return []

  return readdirSync(promptRoot, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && promptSlugPattern.test(entry.name)
    )
    .flatMap((entry) => {
      const versions = promptVersions(join(promptRoot, entry.name))
      const latest = versions.at(-1)
      if (!latest) return []
      return [
        {
          slug: entry.name,
          title: promptTitle(entry.name),
          latestVersion: latest.version,
          versions: versions.map(({ version }) => ({
            version,
            url: `/prompts/${entry.name}/${version}`,
          })),
        },
      ]
    })
    .sort((left, right) => left.title.localeCompare(right.title))
}

export function getPromptVersion(
  slug: string,
  version: string
): PromptVersion | null {
  if (!promptSlugPattern.test(slug) || !promptVersionPattern.test(version)) {
    return null
  }

  const summary = getPromptCatalog().find((prompt) => prompt.slug === slug)
  if (!summary || !summary.versions.some((item) => item.version === version)) {
    return null
  }

  const path = join(benchmarkRoot(), "prompts", slug, `${version}.md`)
  if (!existsSync(path)) return null

  return {
    ...summary,
    version,
    content: readFileSync(path, "utf8"),
    repositoryPath: `prompts/${slug}/${version}.md`,
    results: getBenchmarkEntries().filter(
      (entry) => entry.promptSlug === slug && entry.promptVersion === version
    ),
  }
}
