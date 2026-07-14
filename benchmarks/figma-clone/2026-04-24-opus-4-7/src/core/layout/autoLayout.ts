import { useStore } from '../../state/store';
import { isFrame, type NodeId } from '../scene';

/** Re-arranges children of a frame according to its auto-layout config. */
export const applyAutoLayoutToFrame = (frameId: NodeId): void => {
  useStore.getState().mutate('Apply auto-layout', (doc) => {
    const frame = doc.nodes[frameId];
    if (!frame || !isFrame(frame)) return;
    const al = frame.autoLayout;
    if (!al.enabled) return;

    const inner = {
      x: al.padding.left,
      y: al.padding.top,
      w: frame.width - al.padding.left - al.padding.right,
      h: frame.height - al.padding.top - al.padding.bottom,
    };

    const children = frame.children
      .map((id) => doc.nodes[id])
      .filter((n): n is NonNullable<typeof n> => !!n);

    if (children.length === 0) return;

    const isHoriz = al.direction === 'horizontal';
    const totalMainSize = children.reduce(
      (sum, c) => sum + (isHoriz ? c.width : c.height),
      0,
    );
    const availMain = isHoriz ? inner.w : inner.h;
    const mainGapTotal = al.gap * (children.length - 1);

    let cursor = isHoriz ? inner.x : inner.y;
    let extraGap = 0;

    if (al.justify === 'center') {
      cursor += (availMain - totalMainSize - mainGapTotal) / 2;
    } else if (al.justify === 'end') {
      cursor += availMain - totalMainSize - mainGapTotal;
    } else if (al.justify === 'space-between' && children.length > 1) {
      extraGap = (availMain - totalMainSize) / (children.length - 1) - al.gap;
    }

    for (const c of children) {
      const mainSize = isHoriz ? c.width : c.height;
      const crossSize = isHoriz ? c.height : c.width;

      let cross = isHoriz ? inner.y : inner.x;
      const availCross = isHoriz ? inner.h : inner.w;
      if (al.align === 'center') cross += (availCross - crossSize) / 2;
      else if (al.align === 'end') cross += availCross - crossSize;

      if (isHoriz) {
        c.x = cursor;
        c.y = cross;
      } else {
        c.x = cross;
        c.y = cursor;
      }
      cursor += mainSize + al.gap + extraGap;
    }
  });
};
