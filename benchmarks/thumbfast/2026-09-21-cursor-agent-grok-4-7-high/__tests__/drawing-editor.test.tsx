import { DrawingEditor } from "@/features/drawing/drawing-editor";
import { createEmptyDrawing } from "@/features/drawing/drawing.schema";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useBlocker: () => ({ status: "idle" }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/dialog-manager/dialog-manager", () => ({
  dialogManager: { confirm: vi.fn() },
}));

beforeAll(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
    toJSON() {
      return {};
    },
  });
});

function renderEditor() {
  return render(
    <DrawingEditor
      orgSlug="demo"
      initialDocument={createEmptyDrawing()}
      initialName="Drawing inspiration"
    />,
  );
}

function pointer(svg: Element, type: string, x: number, y: number) {
  act(() => {
    svg.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
      }),
    );
  });
}

describe("drawing editor", () => {
  it("draws, edits text, and keeps Escape on the page", () => {
    const { container } = renderEditor();
    expect(screen.getByRole("heading", { name: "Grok 4.7" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    const svg = container.querySelector("svg.touch-none");
    expect(svg).not.toBeNull();
    pointer(svg!, "pointerdown", 80, 60);
    pointer(svg!, "pointermove", 420, 280);
    pointer(svg!, "pointerup", 420, 280);
    expect(svg!.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(svg!.querySelectorAll("circle").length).toBe(9);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(svg!.querySelectorAll("circle").length).toBe(0);
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    pointer(svg!, "pointerdown", 100, 80);
    const textarea = screen.getByRole("textbox", { name: "Edit text" });
    fireEvent.change(textarea, { target: { value: "HOOK" } });
    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      textarea.blur();
    });
    expect(screen.getByText("HOOK")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText("HOOK")).not.toBeInTheDocument();
  });

  it("inserts an editable template", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Templates" }));
    fireEvent.click(screen.getByRole("button", { name: /Big text \+ subject/ }));
    expect(screen.getByText("BIG IDEA")).toBeInTheDocument();
    expect(screen.getByText("Subject")).toBeInTheDocument();
  });
});
