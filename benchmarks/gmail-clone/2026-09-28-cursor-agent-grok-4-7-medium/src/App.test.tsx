import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Shell } from "./App";
import { MailProvider } from "./state/mail-context";

function renderApp() {
  return render(
    <MailProvider>
      <Shell />
    </MailProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("shell", () => {
  it("renders the mailbox and opens a conversation", () => {
    renderApp();
    expect(document.title).toBe("Grok 4.7");
    expect(screen.getByRole("heading", { level: 1, name: "Grok 4.7" })).toBeTruthy();
    expect(screen.getByText("Security alert: new sign-in on macOS")).toBeTruthy();
    fireEvent.click(screen.getByText("Security alert: new sign-in on macOS"));
    expect(screen.getByText(/MacBook Pro/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByText("Conversation archived")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getAllByText("Security alert: new sign-in on macOS").length).toBeGreaterThan(0);
  });

  it("searches and composes a message into Sent", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Search mail"), { target: { value: "INV-20418" } });
    expect(screen.getByText("Invoice INV-20418 is due Friday")).toBeTruthy();
    expect(screen.queryByText("Saturday, and the good bread")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Compose" }));
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "iris@harborlight.co" } });
    fireEvent.keyDown(screen.getByLabelText("To"), { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Pilot note" } });
    fireEvent.change(screen.getByLabelText("Message body"), { target: { value: "Sending the Friday note." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Message sent")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sent" }));
    expect(screen.getByText("Pilot note")).toBeTruthy();
  });
});
