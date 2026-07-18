import { describe, expect, it } from "vitest"

import { effortLabel } from "./effort-label"

describe("effortLabel", () => {
  it.each([
    ["minimal", "Thinking: Minimal"],
    ["low", "Thinking: Low"],
    ["medium", "Thinking: Medium"],
    ["high", "Thinking: High"],
    ["xhigh", "Thinking: X-High"],
    ["max", "Thinking: Max"],
    ["ultra", "Thinking: Ultra"],
    ["ULTRA", "Thinking: Ultra"],
    ["unknown", "Thinking: -"],
  ])("formats %s", (effort, expected) => {
    expect(effortLabel(effort)).toBe(expected)
  })
})
