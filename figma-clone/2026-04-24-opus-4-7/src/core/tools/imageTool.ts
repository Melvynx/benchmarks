import type { Tool } from '../input/types';
import { createImage } from '../scene';
import { addNode } from '../../state';
import { useStore } from '../../state/store';

/** Image tool: places the pendingImage at the click point. */
export const createImageTool = (): Tool => {
  return {
    id: 'image',
    cursor: () => 'crosshair',
    onPointerDown(ctx) {
      if (ctx.button !== 0) return;
      const pending = ctx.state.transient.pendingImage;
      if (!pending) return;
      const w = Math.min(400, pending.naturalWidth);
      const ratio = pending.naturalHeight / pending.naturalWidth;
      const h = w * ratio;
      const node = createImage({
        parentId: null,
        x: ctx.world.x - w / 2,
        y: ctx.world.y - h / 2,
        width: w,
        height: h,
        src: pending.src,
        naturalWidth: pending.naturalWidth,
        naturalHeight: pending.naturalHeight,
      });
      addNode(node, null);
      // Clear pending
      useStore.setState((s) => ({
        transient: { ...s.transient, pendingImage: null },
        tool: 'select',
        previousTool: 'image',
      }));
    },
    onPointerMove(_ctx) {},
    onPointerUp(_ctx) {},
  };
};
