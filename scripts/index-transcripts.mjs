import { readFile, readdir, stat, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const runsDirectory = join(repositoryRoot, "runs")
const outputFile = join(repositoryRoot, "transcripts.json")

function repositoryPath(file) {
  return relative(repositoryRoot, file).split(sep).join("/")
}

async function findTranscriptFiles(directory) {
  const files = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries.toSorted((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const target = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await findTranscriptFiles(target)))
    else if (/^transcript(?:-resume-\d+)?\.jsonl$/.test(entry.name)) {
      files.push(target)
    }
  }

  return files
}

async function transcriptRecord(file) {
  const path = repositoryPath(file)
  const parts = path.split("/")
  const details = await stat(file)
  return {
    path,
    runId: parts[1],
    task: parts[3],
    filename: parts.at(-1),
    bytes: details.size,
  }
}

async function createIndex() {
  const files = await findTranscriptFiles(runsDirectory)
  const transcripts = await Promise.all(files.map(transcriptRecord))
  return `${JSON.stringify({ schemaVersion: 1, count: transcripts.length, transcripts }, null, 2)}\n`
}

async function main() {
  const index = await createIndex()
  if (!process.argv.includes("--check")) {
    await writeFile(outputFile, index)
    return
  }

  const recorded = await readFile(outputFile, "utf8").catch(() => "")
  if (recorded === index) return
  throw new Error("transcripts.json is stale; run pnpm index:transcripts")
}

await main()
