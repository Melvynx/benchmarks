import { describe, expect, it } from "vitest";
import { createFrame, createPage, createRectangle, createText } from "../scene/factory";
import { applyConstraints } from "./constraints";
import { resolveLayout } from "./layout";

describe("auto-layout", () => {
  it("hugs two horizontal children with padding and gap", () => {
    const page = createPage("P");
    const frame = createFrame({
      layoutMode: "horizontal",
      primarySizing: "hug",
      counterSizing: "hug",
      itemSpacing: 10,
      padding: [10, 10, 10, 10],
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    const a = createRectangle({ width: 50, height: 20, parentId: frame.id });
    const b = createRectangle({ width: 50, height: 20, parentId: frame.id });
    frame.childIds = [a.id, b.id];
    page.nodes[frame.id] = frame;
    page.nodes[a.id] = a;
    page.nodes[b.id] = b;
    const root = page.nodes[page.rootId];
    if (root) root.childIds = [frame.id];
    frame.parentId = page.rootId;
    const map = resolveLayout(page, () => ({ width: 10, height: 10 }));
    const fg = map.get(frame.id);
    const ag = map.get(a.id);
    const bg = map.get(b.id);
    expect(fg?.width).toBeCloseTo(130);
    expect(fg?.height).toBeCloseTo(40);
    expect(ag).toMatchObject({ x: 10, y: 10, width: 50, height: 20 });
    expect(bg).toMatchObject({ x: 70, y: 10, width: 50, height: 20 });
  });

  it("splits remaining width across fill children", () => {
    const page = createPage("P");
    const frame = createFrame({
      layoutMode: "horizontal",
      primarySizing: "fixed",
      counterSizing: "fixed",
      itemSpacing: 10,
      padding: [10, 10, 10, 10],
      width: 130,
      height: 40,
    });
    const fixed = createRectangle({
      width: 50,
      height: 20,
      layoutSizingH: "fixed",
      parentId: frame.id,
    });
    const fill = createRectangle({
      width: 10,
      height: 20,
      layoutSizingH: "fill",
      parentId: frame.id,
    });
    frame.childIds = [fixed.id, fill.id];
    page.nodes[frame.id] = frame;
    page.nodes[fixed.id] = fixed;
    page.nodes[fill.id] = fill;
    const root = page.nodes[page.rootId];
    if (root) root.childIds = [frame.id];
    frame.parentId = page.rootId;
    const map = resolveLayout(page, () => ({ width: 1, height: 1 }));
    expect(map.get(fill.id)?.width).toBeCloseTo(50);
    expect(map.get(fill.id)?.x).toBeCloseTo(70);
  });

  it("measures hugging text before stacking", () => {
    const page = createPage("P");
    const frame = createFrame({
      layoutMode: "vertical",
      primarySizing: "hug",
      counterSizing: "hug",
      padding: [0, 0, 0, 0],
      itemSpacing: 0,
    });
    const text = createText({ text: "Hello", parentId: frame.id, textAutoResize: "width" });
    frame.childIds = [text.id];
    page.nodes[frame.id] = frame;
    page.nodes[text.id] = text;
    const root = page.nodes[page.rootId];
    if (root) root.childIds = [frame.id];
    frame.parentId = page.rootId;
    const map = resolveLayout(page, () => ({ width: 48, height: 18 }));
    expect(map.get(text.id)?.width).toBeCloseTo(48);
    expect(map.get(frame.id)?.width).toBeCloseTo(48);
    expect(map.get(frame.id)?.height).toBeCloseTo(18);
  });
});

describe("constraints", () => {
  it("pins the right edge", () => {
    const next = applyConstraints(
      { x: 70, y: 10, width: 20, height: 20, constraintH: "right", constraintV: "top" },
      { width: 100, height: 80 },
      { width: 150, height: 80 },
    );
    expect(next.x).toBeCloseTo(120);
    expect(next.y).toBeCloseTo(10);
  });

  it("stretches between left and right", () => {
    const next = applyConstraints(
      { x: 10, y: 4, width: 80, height: 10, constraintH: "left-right", constraintV: "top" },
      { width: 100, height: 40 },
      { width: 200, height: 40 },
    );
    expect(next.x).toBeCloseTo(10);
    expect(next.width).toBeCloseTo(180);
  });

  it("keeps the center offset", () => {
    const next = applyConstraints(
      { x: 40, y: 0, width: 40, height: 10, constraintH: "center", constraintV: "top" },
      { width: 100, height: 10 },
      { width: 200, height: 10 },
    );
    expect(next.x + next.width / 2).toBeCloseTo(110);
  });
});
