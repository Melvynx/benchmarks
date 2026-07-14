import type { EditorDocument, FrameNode, NodeId, SceneNode } from "../types/nodes";

export function resolveAutoLayout(document: EditorDocument, frameId: NodeId): EditorDocument {
  const frame = document.nodes[frameId];
  if (!frame || frame.type !== "frame" || !frame.autoLayout) return document;
  const layout = frame.autoLayout;
  const children = frame.children.map((id) => document.nodes[id]).filter((node): node is SceneNode => Boolean(node));
  if (children.length === 0) return document;

  const totalPrimary = children.reduce((sum, child) => sum + (layout.direction === "horizontal" ? child.width : child.height), 0);
  const gapTotal = layout.justifyContent === "space-between" && children.length > 1
    ? Math.max(0, (layout.direction === "horizontal" ? frame.width - layout.padding.left - layout.padding.right : frame.height - layout.padding.top - layout.padding.bottom) - totalPrimary) / (children.length - 1)
    : layout.gap;
  const contentPrimary = totalPrimary + gapTotal * (children.length - 1);
  const availablePrimary = layout.direction === "horizontal" ? frame.width - layout.padding.left - layout.padding.right : frame.height - layout.padding.top - layout.padding.bottom;
  let cursor = layout.direction === "horizontal" ? layout.padding.left : layout.padding.top;
  if (layout.justifyContent === "center") cursor += (availablePrimary - contentPrimary) / 2;
  if (layout.justifyContent === "end") cursor += availablePrimary - contentPrimary;

  const nodes: Record<NodeId, SceneNode> = {};
  for (const child of children) {
    const crossAvailable = layout.direction === "horizontal" ? frame.height - layout.padding.top - layout.padding.bottom : frame.width - layout.padding.left - layout.padding.right;
    const crossSize = layout.direction === "horizontal" ? child.height : child.width;
    let cross = layout.direction === "horizontal" ? layout.padding.top : layout.padding.left;
    if (layout.alignItems === "center") cross += (crossAvailable - crossSize) / 2;
    if (layout.alignItems === "end") cross += crossAvailable - crossSize;
    const stretched = layout.alignItems === "stretch"
      ? layout.direction === "horizontal"
        ? { ...child, height: crossAvailable }
        : { ...child, width: crossAvailable }
      : child;
    nodes[child.id] = layout.direction === "horizontal"
      ? { ...stretched, x: frame.x + cursor, y: frame.y + cross }
      : { ...stretched, x: frame.x + cross, y: frame.y + cursor };
    cursor += (layout.direction === "horizontal" ? child.width : child.height) + gapTotal;
  }

  let resolvedFrame: FrameNode = frame;
  if (layout.hugContents) {
    resolvedFrame = layout.direction === "horizontal"
      ? { ...frame, width: contentPrimary + layout.padding.left + layout.padding.right }
      : { ...frame, height: contentPrimary + layout.padding.top + layout.padding.bottom };
  }

  return { ...document, nodes: { ...document.nodes, [frame.id]: resolvedFrame, ...nodes }, updatedAt: new Date().toISOString() };
}
