import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const promptRoot = join(root, "prompts")
const manifestPath = join(root, "prompts.json")
const publicRoot = "https://benchmark.melvynx.dev/prompts"
const checkOnly = process.argv.includes("--check")

function versionNumber(filename) {
  const match = /^v(\d+)\.md$/.exec(filename)
  return match ? Number(match[1]) : null
}

function repositoryPath(path) {
  return relative(root, path).split("\\").join("/")
}

const prompts = readdirSync(promptRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const directory = join(promptRoot, entry.name)
    const versions = readdirSync(directory)
      .map((filename) => ({ filename, number: versionNumber(filename) }))
      .filter((version) => version.number !== null)
      .sort((left, right) => left.number - right.number)
      .map(({ filename, number }) => {
        const path = join(directory, filename)
        const content = readFileSync(path)
        const version = `v${number}`
        return {
          version,
          path: repositoryPath(path),
          publicUrl: `${publicRoot}/${entry.name}/${version}`,
          bytes: content.byteLength,
          sha256: createHash("sha256").update(content).digest("hex"),
        }
      })

    return { slug: entry.name, versions }
  })
  .filter((prompt) => prompt.versions.length > 0)
  .sort((left, right) => left.slug.localeCompare(right.slug))

const serialized = `${JSON.stringify(
  { schemaVersion: 1, promptCount: prompts.length, versionCount: prompts.reduce((total, prompt) => total + prompt.versions.length, 0), prompts },
  null,
  2
)}\n`

if (checkOnly) {
  if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== serialized) {
    console.error("prompts.json is stale; run pnpm index:prompts")
    process.exit(1)
  }
  console.log(`Verified ${prompts.length} prompts and ${prompts.reduce((total, prompt) => total + prompt.versions.length, 0)} versions.`)
} else {
  writeFileSync(manifestPath, serialized)
  console.log(`Indexed ${prompts.length} prompts and ${prompts.reduce((total, prompt) => total + prompt.versions.length, 0)} versions.`)
}
