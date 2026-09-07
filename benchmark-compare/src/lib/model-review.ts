export type ReviewVerdict = "pass" | "pass-with-notes" | "fail"

export type ReviewFinding = {
  severity: "blocking" | "critical" | "suggestion"
  title: string
  detail: string
  file: string | null
  line: number | null
}

export type ReviewAxis = {
  verdict: ReviewVerdict
  score: number | null
  summary: string
  findings: ReviewFinding[]
  strengths: string[]
}

export type ModelReview = {
  status: "complete"
  schema_version: 1
  method: string
  reviewed_at: string
  integrity: {
    verdict: "no-cheating-detected" | "needs-review" | "cheating-detected"
    confidence: "low" | "medium" | "high"
    summary: string
    evidence: string[]
  }
  overall: {
    verdict: ReviewVerdict
    score: number | null
    summary: string
  }
  axes: {
    standards: ReviewAxis
    specification: ReviewAxis
    ux: ReviewAxis
  }
}

const verdicts = new Set<ReviewVerdict>(["pass", "pass-with-notes", "fail"])
const severities = new Set<ReviewFinding["severity"]>([
  "blocking",
  "critical",
  "suggestion",
])

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : []
}

function parseFindings(value: unknown): ReviewFinding[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const candidate = item as Partial<ReviewFinding>
    if (
      !severities.has(candidate.severity as ReviewFinding["severity"]) ||
      typeof candidate.title !== "string" ||
      typeof candidate.detail !== "string"
    )
      return []
    return [
      {
        severity: candidate.severity as ReviewFinding["severity"],
        title: candidate.title,
        detail: candidate.detail,
        file: typeof candidate.file === "string" ? candidate.file : null,
        line:
          typeof candidate.line === "number" && Number.isInteger(candidate.line)
            ? candidate.line
            : null,
      },
    ]
  })
}

function parseAxis(value: unknown): ReviewAxis | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<ReviewAxis>
  if (
    !verdicts.has(candidate.verdict as ReviewVerdict) ||
    typeof candidate.summary !== "string"
  )
    return null
  const score =
    typeof candidate.score === "number" &&
    Number.isFinite(candidate.score) &&
    candidate.score >= 0 &&
    candidate.score <= 10
      ? candidate.score
      : null
  return {
    verdict: candidate.verdict as ReviewVerdict,
    score,
    summary: candidate.summary,
    findings: parseFindings(candidate.findings),
    strengths: stringArray(candidate.strengths),
  }
}

export function parseModelReview(value: unknown): ModelReview | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<ModelReview>
  const integrity = candidate.integrity
  const overall = candidate.overall
  const axes = candidate.axes
  if (
    candidate.status !== "complete" ||
    candidate.schema_version !== 1 ||
    typeof candidate.method !== "string" ||
    typeof candidate.reviewed_at !== "string" ||
    !integrity ||
    !overall ||
    !axes
  )
    return null

  const standards = parseAxis(axes.standards)
  const specification = parseAxis(axes.specification)
  const ux = parseAxis(axes.ux)
  const integrityVerdicts = new Set([
    "no-cheating-detected",
    "needs-review",
    "cheating-detected",
  ])
  const confidenceValues = new Set(["low", "medium", "high"])
  if (
    !standards ||
    !specification ||
    !ux ||
    !integrityVerdicts.has(integrity.verdict) ||
    !confidenceValues.has(integrity.confidence) ||
    typeof integrity.summary !== "string" ||
    !verdicts.has(overall.verdict) ||
    typeof overall.summary !== "string"
  )
    return null

  const overallScore =
    typeof overall.score === "number" &&
    Number.isFinite(overall.score) &&
    overall.score >= 0 &&
    overall.score <= 10
      ? overall.score
      : null

  return {
    status: "complete",
    schema_version: 1,
    method: candidate.method,
    reviewed_at: candidate.reviewed_at,
    integrity: {
      verdict: integrity.verdict,
      confidence: integrity.confidence,
      summary: integrity.summary,
      evidence: stringArray(integrity.evidence),
    },
    overall: {
      verdict: overall.verdict,
      score: overallScore,
      summary: overall.summary,
    },
    axes: { standards, specification, ux },
  }
}
