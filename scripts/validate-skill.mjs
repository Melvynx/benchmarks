import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { parse } from "yaml"

const maximumNameLength = 64
const allowedProperties = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
])

function fail(message) {
  console.error(message)
  process.exit(1)
}

const skillDirectory = process.argv[2]
if (!skillDirectory) fail("Usage: node scripts/validate-skill.mjs <skill-directory>")

const skillPath = join(skillDirectory, "SKILL.md")
if (!existsSync(skillPath)) fail("SKILL.md not found")

const content = readFileSync(skillPath, "utf8")
const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
if (!frontmatterMatch) fail("Invalid or missing YAML frontmatter")

let frontmatter
try {
  frontmatter = parse(frontmatterMatch[1])
} catch (error) {
  fail(`Invalid YAML in frontmatter: ${error instanceof Error ? error.message : String(error)}`)
}

if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
  fail("Frontmatter must be a YAML dictionary")
}

const unexpectedKeys = Object.keys(frontmatter).filter(
  (key) => !allowedProperties.has(key)
)
if (unexpectedKeys.length > 0) {
  fail(`Unexpected frontmatter keys: ${unexpectedKeys.sort().join(", ")}`)
}

const { name, description } = frontmatter
if (typeof name !== "string" || !name.trim()) fail("Missing or invalid 'name'")
if (typeof description !== "string" || !description.trim()) {
  fail("Missing or invalid 'description'")
}

const normalizedName = name.trim()
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedName)) {
  fail(`Name '${normalizedName}' must use lowercase hyphen-case`)
}
if (normalizedName.length > maximumNameLength) {
  fail(`Name is too long (${normalizedName.length}; maximum ${maximumNameLength})`)
}

const normalizedDescription = description.trim()
if (/[<>]/.test(normalizedDescription)) {
  fail("Description cannot contain angle brackets")
}
if (normalizedDescription.length > 1_024) {
  fail(`Description is too long (${normalizedDescription.length}; maximum 1024)`)
}

console.log("Skill is valid!")
