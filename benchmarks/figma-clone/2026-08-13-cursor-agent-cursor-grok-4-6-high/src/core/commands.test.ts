import { describe, expect, it } from "vitest";
import { applyPatch, cmdInsertNodes, cmdUpdateNodes, emptyHistory, pushHistory } from "./commands";
import { createRectangle, emptyDocument } from "./factories";

describe("commands", () => {
  it("inserts and undoes without snapshotting the whole document", () => {
    const doc = emptyDocument();
    const rect = createRectangle({ name: "R", x: 10, y: 10, width: 40, height: 20 });
    const cmd = cmdInsertNodes(doc, [rect], null);
    const after = applyPatch(doc, cmd.redo);
    expect(after.nodes[rect.id]?.name).toBe("R");
    const undone = applyPatch(after, cmd.undo);
    expect(undone.nodes[rect.id]).toBeUndefined();
    const history = pushHistory(emptyHistory(), cmd);
    expect(history.past).toHaveLength(1);
    expect(history.future).toHaveLength(0);
  });

  it("updates geometry as a reversible patch", () => {
    const doc = emptyDocument();
    const rect = createRectangle({ name: "R", x: 0, y: 0, width: 10, height: 10 });
    const inserted = applyPatch(doc, cmdInsertNodes(doc, [rect], null).redo);
    const moved = { ...rect, x: 50 };
    const cmd = cmdUpdateNodes(inserted, [moved], "Move");
    const after = applyPatch(inserted, cmd.redo);
    expect(after.nodes[rect.id]?.x).toBe(50);
    const back = applyPatch(after, cmd.undo);
    expect(back.nodes[rect.id]?.x).toBe(0);
  });
});
