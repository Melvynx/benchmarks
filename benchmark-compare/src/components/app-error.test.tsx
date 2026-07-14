// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AppError } from "./app-error"

describe("AppError", () => {
  it("presents a recoverable connection error", () => {
    render(<AppError error={new Error("Failed to fetch")} reset={vi.fn()} />)

    expect(
      screen.getByRole("heading", { name: "We couldn’t load this view." })
    ).toBeTruthy()
    expect(screen.getByText("Connection interrupted")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "Back to workbench" })
        .getAttribute("href")
    ).toBe("/")
    expect(screen.getByText("Failed to fetch")).toBeTruthy()
  })
})
