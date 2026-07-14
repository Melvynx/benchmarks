import { addNode } from '../scene/draft';
import {
  createEllipse,
  createFrame,
  createRect,
  createStar,
  createText,
  solidPaint,
  uniformRadius,
  uniqueName,
} from '../scene/factories';
import { getSceneIndex } from '../scene/sceneIndex';
import { hsvaToRgba, rgba } from '../utils/color';
import { rectUnionAll } from '../geometry/rect';
import type { Rect } from '../geometry/rect';
import { editDoc } from './docEdit';
import { editorStore, pushToast } from './store';
import { zoomToSelection } from './viewport';

const COLUMNS = 40;
const ROWS = 28;
const CELL = 56;
const GAP = 10;

/**
 * Drops 1,120 mixed nodes into a frame to prove the renderer holds 60 fps
 * with a real object count. Reachable from the command palette (⌘/).
 */
export function insertStressTest(): void {
  const state = editorStore.getState();
  const index = getSceneIndex(state.doc);
  const existing = rectUnionAll(
    state.doc.rootIds.map((id) => index.subtreeBounds.get(id)).filter((r): r is Rect => r !== undefined),
  );
  const originX = existing ? existing.x + existing.width + 160 : 0;
  const originY = existing ? existing.y : 0;

  const frame = createFrame({
    name: uniqueName(state.doc, 'Stress test'),
    x: originX,
    y: originY,
    width: COLUMNS * (CELL + GAP) + GAP,
    height: ROWS * (CELL + GAP) + GAP,
    fills: [solidPaint(rgba(18, 20, 26, 1))],
  });

  editDoc(
    'Insert stress test',
    (d) => {
      addNode(d, frame, null, -1);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          const i = row * COLUMNS + col;
          const x = GAP + col * (CELL + GAP);
          const y = GAP + row * (CELL + GAP);
          const fill = solidPaint(hsvaToRgba({ h: (i * 7.3) % 360, s: 0.55, v: 0.92, a: 1 }));
          const kind = i % 9;
          if (kind < 4) {
            addNode(
              d,
              createRect({
                name: `Cell ${i}`,
                x,
                y,
                width: CELL,
                height: CELL,
                cornerRadius: uniformRadius((i % 4) * 6),
                fills: [fill],
                rotation: (i % 5) * 3,
              }),
              frame.id,
            );
          } else if (kind < 7) {
            addNode(
              d,
              createEllipse({ name: `Cell ${i}`, x, y, width: CELL, height: CELL, fills: [fill] }),
              frame.id,
            );
          } else if (kind === 7) {
            addNode(
              d,
              createStar({
                name: `Cell ${i}`,
                x,
                y,
                width: CELL,
                height: CELL,
                fills: [fill],
                pointCount: 5 + (i % 3),
              }),
              frame.id,
            );
          } else {
            addNode(
              d,
              createText({
                name: `Cell ${i}`,
                x,
                y: y + CELL / 2 - 8,
                characters: String(i),
                fontFamily: 'JetBrains Mono',
                fontWeight: 500,
                fontSize: 13,
                fills: [solidPaint(rgba(255, 255, 255, 0.85))],
              }),
              frame.id,
            );
          }
        }
      }
    },
    { select: [frame.id] },
  );
  zoomToSelection();
  pushToast(`Inserted ${COLUMNS * ROWS} nodes — pan and zoom around`);
}
