import type { FabricObject } from "fabric";
import type { DrawingObjectData, DrawingObjectKind } from "./drawing.types";

export type TaggedFabricObject = FabricObject & { data: DrawingObjectData };

let objectIdCounter = 0;

export function createObjectId(): string {
  objectIdCounter += 1;
  return `obj-${Date.now().toString(36)}-${objectIdCounter}`;
}

const DEFAULT_NAMES: Record<DrawingObjectKind, string> = {
  shape: "Shape",
  text: "Text",
  image: "Image",
  arrow: "Arrow",
  freehand: "Drawing",
  "placeholder-person": "Placeholder character",
  badge: "Badge",
  explosion: "Explosion",
  callout: "Callout",
  group: "Group",
};

export function defaultNameForKind(kind: DrawingObjectKind): string {
  return DEFAULT_NAMES[kind];
}

/** Stamps custom metadata (id/kind/name) on a fabric object so it round-trips through toObject(["data"])/loadFromJSON. */
export function tagObject<T extends FabricObject>(
  object: T,
  options: { kind: DrawingObjectKind; name?: string; id?: string },
): T & { data: DrawingObjectData } {
  const data: DrawingObjectData = {
    id: options.id ?? createObjectId(),
    kind: options.kind,
    name: options.name ?? defaultNameForKind(options.kind),
  };
  object.set("data", data);
  return object as T & { data: DrawingObjectData };
}

export function getObjectData(
  object: FabricObject,
): DrawingObjectData | undefined {
  return (object as unknown as Partial<TaggedFabricObject>).data;
}

export function renameObject(object: FabricObject, name: string) {
  const data = getObjectData(object);
  object.set("data", {
    ...data,
    id: data?.id ?? createObjectId(),
    kind: data?.kind ?? "shape",
    name,
  });
}

export function setObjectLocked(object: FabricObject, locked: boolean) {
  object.set({
    selectable: !locked,
    evented: !locked,
    hasControls: !locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockRotation: locked,
    lockScalingX: locked,
    lockScalingY: locked,
  });
  const data = getObjectData(object);
  object.set("data", {
    id: data?.id ?? createObjectId(),
    kind: data?.kind ?? "shape",
    name: data?.name ?? "Shape",
    locked,
  });
}

export function isObjectLocked(object: FabricObject): boolean {
  return Boolean(getObjectData(object)?.locked);
}
