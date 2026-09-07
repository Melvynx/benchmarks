import { describe, expect, it } from "vitest";
import { createFrame, createRectangle, defaultLayout, emptyDocument } from "./factories";
import { resolveAutoLayout } from "./layout";

describe("auto-layout", () => {
  it("hugs horizontal children with gap and padding", () => {
    const doc = emptyDocument();
    const frame = createFrame({
      name: "F",
      width: 10,
      height: 10,
      layout: {
        ...defaultLayout(),
        direction: "horizontal",
        gap: 8,
        padding: { top: 4, right: 4, bottom: 4, left: 4 },
        childSizing: { horizontal: "hug", vertical: "hug" },
      },
    });
    const a = createRectangle({ name: "A", parentId: frame.id, width: 40, height: 20 });
    const b = createRectangle({ name: "B", parentId: frame.id, width: 30, height: 24 });
    frame.children = [a.id, b.id];
    doc.nodes[frame.id] = frame;
    doc.nodes[a.id] = a;
    doc.nodes[b.id] = b;
    const page = doc.pages[0];
    if (page) page.children = [frame.id];
    resolveAutoLayout(doc);
    expect(frame.width).toBe(4 + 40 + 8 + 30 + 4);
    expect(frame.height).toBe(4 + 24 + 4);
    expect(a.x).toBe(4);
    expect(b.x).toBe(4 + 40 + 8);
  });
});
