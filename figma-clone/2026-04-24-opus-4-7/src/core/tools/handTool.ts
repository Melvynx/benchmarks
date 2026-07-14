import type { Tool } from '../input/types';
import { useStore } from '../../state/store';

export const createHandTool = (): Tool => {
  let panning = false;
  let startScreen = { x: 0, y: 0 };
  let startViewport = { x: 0, y: 0, zoom: 1 };

  return {
    id: 'hand',
    cursor: () => (panning ? 'grabbing' : 'grab'),
    onPointerDown(ctx) {
      if (ctx.button !== 0) return;
      panning = true;
      startScreen = { ...ctx.screen };
      startViewport = { ...ctx.state.viewport };
    },
    onPointerMove(ctx) {
      if (!panning) return;
      const dx = ctx.screen.x - startScreen.x;
      const dy = ctx.screen.y - startScreen.y;
      useStore.setState({
        viewport: {
          x: startViewport.x - dx / startViewport.zoom,
          y: startViewport.y - dy / startViewport.zoom,
          zoom: startViewport.zoom,
        },
      });
    },
    onPointerUp() {
      panning = false;
    },
    onDeactivate() {
      panning = false;
    },
  };
};
