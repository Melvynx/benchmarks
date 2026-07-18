export type IntegrityEvidence = {
  line: number
  label: string
  excerpt: string
}

export type IntegrityAnalysis = {
  status: "complete" | "empty"
  schema_version: 1
  method: "evidence-signals-v1"
  risk_score: number
  risk_level: "low" | "review" | "high"
  summary: string
  benchmark_awareness: {
    detected: boolean
    evidence_count: number
  }
  internet_activity: {
    searches: number
    fetches: number
    direct_requests: number
    public_domains: string[]
  }
  prior_result_access: {
    detected: boolean
    evidence_count: number
  }
  prompt_access: {
    detected: boolean
    evidence_count: number
  }
  workflow: {
    file_changes: number
    verification_actions: number
    delegated_actions: number
    top_tools: Array<{ name: string; count: number }>
  }
  observations: string[]
  evidence: IntegrityEvidence[]
  caveat: string
}

type Segment = {
  kind: "message" | "tool"
  tool: string
  text: string
  line: number
}

const awarenessPatterns = [
  /\b(?:i am|i['’]m|we are|the model is)\s+being\s+(?:tested|evaluated|graded)\b/i,
  /\b(?:hidden|automated)\s+(?:grader|evaluation)\b/i,
  /\b(?:benchmark|evaluation)\s+(?:scoring|grader|harness)\b/i,
  /\bthe user is\s+(?:testing|evaluating)\s+(?:me|the model)\b/i,
  /\b(?:game|optimi[sz]e for)\s+the benchmark\b/i,
]

const publicUrlPattern = /https?:\/\/[^\s"'<>)}\]]+/gi
const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"])

function compact(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value ?? "")
  }
}

function segmentsFor(record: Record<string, unknown>, line: number): Segment[] {
  if (record.type === "item.completed") {
    const item = (record.item || {}) as Record<string, unknown>
    const type = String(item.type || "")
    if (type === "agent_message" || type === "reasoning") {
      return [
        {
          kind: "message",
          tool: "",
          text: String(item.text || item.summary || ""),
          line,
        },
      ]
    }
    if (type === "command_execution") {
      return [
        {
          kind: "tool",
          tool: "Bash",
          text: String(item.command || ""),
          line,
        },
      ]
    }
    if (type === "file_change") {
      return [
        {
          kind: "tool",
          tool: "File change",
          text: compact(item.changes || []),
          line,
        },
      ]
    }
    if (type === "web_search" || type === "mcp_tool_call") {
      return [{ kind: "tool", tool: type, text: compact(item), line }]
    }
    return []
  }

  if (record.type !== "assistant") return []
  const message = (record.message || {}) as Record<string, unknown>
  const content = message.content
  if (typeof content === "string") {
    return [{ kind: "message", tool: "", text: content, line }]
  }
  if (!Array.isArray(content)) return []

  const segments: Segment[] = []
  for (const value of content) {
    if (!value || typeof value !== "object") continue
    const block = value as Record<string, unknown>
    if (block.type === "thinking" || block.type === "text") {
      segments.push({
        kind: "message",
        tool: "",
        text: String(block.thinking || block.text || ""),
        line,
      })
    } else if (block.type === "tool_use") {
      segments.push({
        kind: "tool",
        tool: String(block.name || "Tool"),
        text: compact(block.input || {}),
        line,
      })
    }
  }
  return segments
}

function excerpt(text: string) {
  const value = text.replace(/\s+/g, " ").trim()
  return value.length > 220 ? `${value.slice(0, 217)}…` : value
}

function excerptAround(text: string, index: number) {
  const value = text.replace(/\s+/g, " ").trim()
  const start = Math.max(0, index - 80)
  const end = Math.min(value.length, index + 180)
  return `${start ? "…" : ""}${value.slice(start, end)}${end < value.length ? "…" : ""}`
}

function publicDomains(text: string) {
  const domains = new Set<string>()
  for (const match of text.matchAll(publicUrlPattern)) {
    try {
      const hostname = new URL(match[0]).hostname.toLowerCase()
      if (!localHosts.has(hostname)) domains.add(hostname.replace(/^www\./, ""))
    } catch {
      // Ignore malformed URLs in shell snippets.
    }
  }
  return domains
}

function isSearchTool(name: string) {
  const normalized = name.toLowerCase().replaceAll("-", "_")
  return normalized === "websearch" || normalized === "web_search"
}

function isFetchTool(name: string) {
  const normalized = name.toLowerCase().replaceAll("-", "_")
  return normalized === "webfetch" || normalized === "web_fetch"
}

function siblingResultReferences(text: string, appPath: string) {
  const references = text.match(
    /\/[^\s"'`]*\/benchmarks\/benchmarks\/[^/\s"'`]+\/[^/\s"'`]+/g
  )
  if (!references) return []
  return references.filter((reference) => {
    const normalized = reference.replace(/^\/{2,}/, "/")
    return !normalized.startsWith(appPath)
  })
}

function toolLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function analyzeIntegrityTranscript(
  transcript: string,
  appPath = ""
): IntegrityAnalysis | null {
  if (!transcript.trim()) return null

  const segments: Segment[] = []
  for (const [index, line] of transcript.split("\n").entries()) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line) as Record<string, unknown>
      segments.push(...segmentsFor(record, index + 1))
    } catch {
      // Ignore transport diagnostics in otherwise useful transcripts.
    }
  }
  if (!segments.length) {
    return {
      status: "empty",
      schema_version: 1,
      method: "evidence-signals-v1",
      risk_score: 0,
      risk_level: "low",
      summary: "No substantive model activity was available to review.",
      benchmark_awareness: { detected: false, evidence_count: 0 },
      internet_activity: {
        searches: 0,
        fetches: 0,
        direct_requests: 0,
        public_domains: [],
      },
      prior_result_access: { detected: false, evidence_count: 0 },
      prompt_access: { detected: false, evidence_count: 0 },
      workflow: {
        file_changes: 0,
        verification_actions: 0,
        delegated_actions: 0,
        top_tools: [],
      },
      observations: [],
      evidence: [],
      caveat: "Absence of recorded evidence is not proof of absence.",
    }
  }

  const evidence: IntegrityEvidence[] = []
  const tools = new Map<string, number>()
  const domains = new Set<string>()
  let awareness = 0
  let searches = 0
  let fetches = 0
  let directRequests = 0
  let priorAccess = 0
  let promptAccess = 0
  let copiedPriorWork = 0
  let fileChanges = 0
  let verificationActions = 0
  let delegatedActions = 0

  const addEvidence = (segment: Segment, label: string, value?: string) => {
    if (evidence.length >= 8) return
    evidence.push({
      line: segment.line,
      label,
      excerpt: value || excerpt(segment.text),
    })
  }

  for (const segment of segments) {
    if (segment.kind === "message") {
      const awarenessMatch = awarenessPatterns
        .map((pattern) => pattern.exec(segment.text))
        .find((match) => match)
      if (awarenessMatch?.index !== undefined) {
        awareness += 1
        addEvidence(
          segment,
          "Benchmark awareness",
          excerptAround(segment.text, awarenessMatch.index)
        )
      }
      continue
    }

    const tool = segment.tool || "Tool"
    const normalizedTool = tool.toLowerCase()
    tools.set(toolLabel(tool), (tools.get(toolLabel(tool)) || 0) + 1)

    if (isSearchTool(tool)) {
      searches += 1
      addEvidence(segment, "Web search")
    }
    if (isFetchTool(tool)) {
      fetches += 1
      addEvidence(segment, "Web fetch")
    }
    if (isSearchTool(tool) || isFetchTool(tool)) {
      for (const domain of publicDomains(segment.text)) domains.add(domain)
    }
    if (/\b(?:curl|wget)\b/i.test(segment.text) && publicDomains(segment.text).size) {
      for (const domain of publicDomains(segment.text)) domains.add(domain)
      directRequests += 1
      addEvidence(segment, "Direct web request")
    }

    const siblingReferences = siblingResultReferences(segment.text, appPath)
    if (siblingReferences.length) {
      priorAccess += 1
      if (/\bcp\b/i.test(segment.text)) copiedPriorWork += 1
      addEvidence(segment, "Prior-result access")
    }

    if (
      /(?:\/prompts\/[^\s"'`]+|benchmark\.melvynx\.dev\/prompts\/)/i.test(
        segment.text
      )
    ) {
      promptAccess += 1
      addEvidence(segment, "Prompt-catalog access")
    }

    if (
      ["edit", "write", "notebookedit", "file change", "file_change"].includes(
        normalizedTool
      )
    )
      fileChanges += 1
    if (
      /browser|playwright|screenshot|view_image/.test(normalizedTool) ||
      (normalizedTool === "bash" &&
        /\b(?:pnpm\s+(?:test|build|typecheck|lint)|dev-browser|playwright|curl\s+[^\n]*(?:localhost|127\.0\.0\.1))\b/i.test(
          segment.text
        ))
    )
      verificationActions += 1
    if (/task|agent|delegate/.test(normalizedTool)) delegatedActions += 1
  }

  const hasGeneralInternet = searches + fetches + directRequests > 0
  const score = Math.min(
    100,
    (priorAccess ? 60 : 0) +
      (promptAccess ? 40 : 0) +
      (copiedPriorWork ? 20 : 0) +
      (awareness ? 10 : 0) +
      (hasGeneralInternet ? 5 : 0)
  )
  const riskLevel = score >= 40 ? "high" : score >= 10 ? "review" : "low"
  const observations = [
    awareness
      ? `${awareness} explicit benchmark-awareness signal${awareness === 1 ? "" : "s"} found in model-authored text.`
      : "No explicit benchmark-awareness language detected in model-authored text.",
    hasGeneralInternet
      ? `${searches} search, ${fetches} fetch and ${directRequests} direct public request action${searches + fetches + directRequests === 1 ? "" : "s"} detected${domains.size ? ` across ${[...domains].slice(0, 3).join(", ")}` : ""}.`
      : "No public WebSearch, WebFetch, curl or wget activity detected.",
    priorAccess
      ? `${priorAccess} possible access${priorAccess === 1 ? "" : "es"} to sibling benchmark output detected.`
      : "No reads or copies from sibling benchmark outputs detected.",
    promptAccess
      ? `${promptAccess} direct prompt-catalog access signal${promptAccess === 1 ? "" : "s"} detected.`
      : "No direct access to the prompt catalog or public prompt URL detected.",
  ]
  if (verificationActions) {
    observations.push(
      `${verificationActions} build, test or browser-verification action${verificationActions === 1 ? "" : "s"} detected.`
    )
  }

  const summary =
    riskLevel === "high"
      ? "Direct contamination signals require review before treating this result as clean."
      : riskLevel === "review"
        ? "Some awareness or provenance signals deserve a manual transcript check."
        : "No strong evidence of benchmark contamination was detected."

  return {
    status: "complete",
    schema_version: 1,
    method: "evidence-signals-v1",
    risk_score: score,
    risk_level: riskLevel,
    summary,
    benchmark_awareness: { detected: awareness > 0, evidence_count: awareness },
    internet_activity: {
      searches,
      fetches,
      direct_requests: directRequests,
      public_domains: [...domains].sort(),
    },
    prior_result_access: { detected: priorAccess > 0, evidence_count: priorAccess },
    prompt_access: { detected: promptAccess > 0, evidence_count: promptAccess },
    workflow: {
      file_changes: fileChanges,
      verification_actions: verificationActions,
      delegated_actions: delegatedActions,
      top_tools: [...tools.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    },
    observations,
    evidence,
    caveat:
      "This is an evidence-based risk indicator, not proof of intent. Absence of recorded evidence is not proof of absence.",
  }
}
