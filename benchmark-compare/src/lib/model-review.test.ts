import { describe, expect, it } from "vitest"

import { parseModelReview } from "./model-review"

const axis = {
  verdict: "pass-with-notes",
  score: 8,
  summary: "Solid with one concrete issue.",
  findings: [
    {
      severity: "suggestion",
      title: "Example",
      detail: "A useful correction.",
      file: "src/App.tsx",
      line: 12,
    },
  ],
  strengths: ["Builds cleanly"],
}

describe("parseModelReview", () => {
  it("accepts a complete persisted review", () => {
    expect(
      parseModelReview({
        status: "complete",
        schema_version: 1,
        method: "multi-axis-manual-v1",
        reviewed_at: "2026-07-20T08:00:00Z",
        integrity: {
          verdict: "no-cheating-detected",
          confidence: "high",
          summary: "No prohibited access was found.",
          evidence: [],
        },
        overall: {
          verdict: "pass-with-notes",
          score: 8,
          summary: "Good result.",
        },
        axes: { standards: axis, specification: axis, ux: axis },
      })
    ).toEqual(expect.objectContaining({ status: "complete" }))
  })

  it("rejects incomplete review data", () => {
    expect(parseModelReview({ status: "complete" })).toBeNull()
  })
})
