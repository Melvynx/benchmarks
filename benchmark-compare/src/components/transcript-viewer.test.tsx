// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { parseTranscript, TranscriptViewer } from "./transcript-viewer"

describe("TranscriptViewer", () => {
  it("presents work like Codex and progressively reveals command details", () => {
    const transcript = [
      { type: "thread.started", thread_id: "thread-1" },
      {
        type: "item.completed",
        item: { type: "agent_message", text: "I’ll inspect the project." },
      },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "pnpm test",
          aggregated_output: "All tests passed",
          status: "completed",
        },
      },
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          text: "Everything is ready.\n\nBENCHMARK_COMPLETE",
        },
      },
    ]
      .map((record) => JSON.stringify(record))
      .join("\n")

    render(
      <TranscriptViewer
        transcript={transcript}
        prompt={"<challenge>\nBuild the benchmark.\n</challenge>"}
        durationMs={123_000}
      />
    )

    expect(screen.getByText("Build the benchmark.")).toBeTruthy()
    expect(screen.getByText("Worked for 2m 3s")).toBeTruthy()
    expect(screen.getByText(/Everything is ready/)).toBeTruthy()
    expect(screen.queryByText("pnpm test")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Worked for 2m 3s/ }))
    expect(screen.getByText("I’ll inspect the project.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Ran a command/ }))
    expect(screen.getByText("pnpm test")).toBeTruthy()
    expect(screen.queryByText("All tests passed")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Output" }))
    expect(screen.getByText("All tests passed")).toBeTruthy()
  })

  it("merges Claude tool results into their matching tool calls", () => {
    const transcript = [
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "Read",
              input: { file_path: "/tmp/example.ts" },
            },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool-1",
              content: "const ready = true",
            },
          ],
        },
      },
    ]
      .map((record) => JSON.stringify(record))
      .join("\n")

    expect(parseTranscript(transcript)).toEqual([
      expect.objectContaining({
        kind: "tool",
        label: "Read",
        output: "const ready = true",
        status: "completed",
        toolId: "tool-1",
      }),
    ])
  })
})
