// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TranscriptPhaseChart } from "./transcript-phase-chart"
import type { TranscriptAnalysis } from "./transcript-phase-chart"

const analysis: TranscriptAnalysis = {
  status: "complete",
  classified_segments: 8,
  categories: {
    context_gathering: {
      percentage: 25,
      activity_characters: 100,
      segments: 2,
    },
    planning: { percentage: 25, activity_characters: 100, segments: 2 },
    implementation: {
      percentage: 25,
      activity_characters: 100,
      segments: 2,
    },
    verification: { percentage: 25, activity_characters: 100, segments: 2 },
  },
}

describe("TranscriptPhaseChart", () => {
  it("shows phase percentages and estimates time from the model duration", () => {
    render(
      <TranscriptPhaseChart
        id="task/run"
        analysis={analysis}
        durationMs={120_000}
      />
    )

    expect(screen.getAllByText("25%")).toHaveLength(4)
    expect(screen.getAllByText("30s estimated")).toHaveLength(4)
    expect(screen.getByText("Implementation")).toBeTruthy()
    expect(screen.getByText("8 classified events")).toBeTruthy()
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Context gathering 25%"
    )
  })
})
