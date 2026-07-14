import { ActiveSelection, Group, type Canvas } from "fabric";
import { getObjectData, tagObject } from "./drawing-object-factory";

// bringForward/sendBackward/bringToFront/sendToBack/nudge don't call
// canvas.add()/remove(), so they don't naturally emit the object:added/
// object:removed/object:modified events fabric-canvas.tsx listens on for
// automatic history capture. Callers pass a snapshot callback to invoke once
// the mutation is done instead of faking a fabric event (Canvas#fire's event
// payload types don't accept an undefined target, and object-level "modified"
// only fires from real user-driven transforms).
type OnChange = () => void;

export function deleteSelection(canvas: Canvas) {
  const active = canvas.getActiveObjects();
  if (active.length === 0) return;
  canvas.discardActiveObject();
  active.forEach((object) => canvas.remove(object));
  canvas.requestRenderAll();
}

export async function duplicateSelection(canvas: Canvas) {
  const active = canvas.getActiveObjects();
  if (active.length === 0) return;

  const clones = await Promise.all(
    active.map(async (object) => {
      const clone = await object.clone(["data"]);
      clone.set({ left: clone.left + 24, top: clone.top + 24 });
      const data = getObjectData(object);
      tagObject(clone, { kind: data?.kind ?? "shape", name: data?.name });
      return clone;
    }),
  );

  canvas.discardActiveObject();
  clones.forEach((clone) => canvas.add(clone));

  if (clones.length === 1) {
    canvas.setActiveObject(clones[0]);
  } else {
    canvas.setActiveObject(new ActiveSelection(clones, { canvas }));
  }
  canvas.requestRenderAll();
}

export function bringForward(canvas: Canvas, onChange: OnChange) {
  canvas
    .getActiveObjects()
    .forEach((object) => canvas.bringObjectForward(object));
  canvas.requestRenderAll();
  onChange();
}

export function sendBackward(canvas: Canvas, onChange: OnChange) {
  canvas
    .getActiveObjects()
    .forEach((object) => canvas.sendObjectBackwards(object));
  canvas.requestRenderAll();
  onChange();
}

export function bringToFront(canvas: Canvas, onChange: OnChange) {
  canvas
    .getActiveObjects()
    .forEach((object) => canvas.bringObjectToFront(object));
  canvas.requestRenderAll();
  onChange();
}

export function sendToBack(canvas: Canvas, onChange: OnChange) {
  canvas
    .getActiveObjects()
    .forEach((object) => canvas.sendObjectToBack(object));
  canvas.requestRenderAll();
  onChange();
}

/** fabric v7 dropped ActiveSelection#toGroup(); recreate the group by hand. */
export function groupSelection(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (!active || active.type !== "activeselection") return;

  const objects = (active as ActiveSelection).getObjects().slice();
  canvas.discardActiveObject();
  objects.forEach((object) => canvas.remove(object));

  const group = new Group(objects);
  tagObject(group, { kind: "group" });
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
}

/** fabric v7 dropped Group#toActiveSelection(); recreate the selection by hand. */
export function ungroupSelection(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (!active || active.type !== "group") return;

  const group = active as Group;
  const objects = group.removeAll();
  canvas.remove(group);
  objects.forEach((object) => canvas.add(object));
  canvas.setActiveObject(new ActiveSelection(objects, { canvas }));
  canvas.requestRenderAll();
}

export function nudgeSelection(
  canvas: Canvas,
  dx: number,
  dy: number,
  onChange: OnChange,
) {
  const active = canvas.getActiveObject();
  if (!active) return;
  active.set({ left: active.left + dx, top: active.top + dy });
  active.setCoords();
  canvas.requestRenderAll();
  onChange();
}

export function selectAll(canvas: Canvas) {
  canvas.discardActiveObject();
  const selectable = canvas
    .getObjects()
    .filter((object) => object.selectable !== false);
  if (selectable.length === 0) return;
  canvas.setActiveObject(new ActiveSelection(selectable, { canvas }));
  canvas.requestRenderAll();
}
