import type { DesignDocument, FrameNode, NodeId, SceneNode } from "./types";

export function resolveAutoLayout(frame: FrameNode, document: DesignDocument): Readonly<Record<NodeId, Partial<SceneNode>>> {
  if (!frame.autoLayout) return {};
  const layout = frame.autoLayout;
  const children = frame.children.flatMap((id) => (document.nodes[id] ? [document.nodes[id]] : []));
  const [top, right, bottom, left] = layout.padding;
  const isHorizontal = layout.direction === "horizontal";
  const availableMain = (isHorizontal ? frame.width - left - right : frame.height - top - bottom);
  const totalMain = children.reduce((sum, node) => sum + (isHorizontal ? node.width : node.height), 0);
  const gap = layout.align === "space-between" && children.length > 1 ? Math.max(0, (availableMain - totalMain) / (children.length - 1)) : layout.gap;
  let cursor = isHorizontal ? left : top;
  const patches: Record<NodeId, Partial<SceneNode>> = {};
  children.forEach((child) => {
    const crossAvailable = isHorizontal ? frame.height - top - bottom - child.height : frame.width - left - right - child.width;
    const crossOffset = layout.align === "center" ? crossAvailable / 2 : layout.align === "end" ? crossAvailable : 0;
    patches[child.id] = isHorizontal ? { x: cursor, y: top + crossOffset } : { x: left + crossOffset, y: cursor };
    cursor += (isHorizontal ? child.width : child.height) + gap;
  });
  if (layout.sizing === "hug") {
    const mainSize = totalMain + Math.max(0, children.length - 1) * gap + (isHorizontal ? left + right : top + bottom);
    const crossSize = Math.max(0, ...children.map((node) => isHorizontal ? node.height : node.width)) + (isHorizontal ? top + bottom : left + right);
    patches[frame.id] = isHorizontal ? { width: mainSize, height: crossSize } : { width: crossSize, height: mainSize };
  }
  return patches;
}
