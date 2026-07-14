import { rgba } from '../utils/color';
import { makeDraft, addNode } from '../scene/draft';
import {
  createEllipse,
  createFrame,
  createLine,
  createPolygon,
  createRect,
  createStar,
  createText,
  defaultAutoLayout,
  dropShadow,
  linearGradient,
  radialGradient,
  solidPaint,
  uniformRadius,
} from '../scene/factories';
import type { SceneDocument } from '../scene/types';
import { emptyDocument } from '../scene/types';

/** The welcome file: shows off gradients, blurs, auto-layout, text and effects. */
export function buildSeedDocument(): SceneDocument {
  const d = makeDraft(emptyDocument());

  // --- Hero frame ---------------------------------------------------------
  const hero = createFrame({
    name: 'Cover',
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
    fills: [solidPaint(rgba(14, 16, 20))],
    cornerRadius: uniformRadius(0),
  });
  addNode(d, hero, null);

  const blobA = createEllipse({
    name: 'Glow A',
    x: -160,
    y: -180,
    width: 640,
    height: 640,
    fills: [
      radialGradient([
        { position: 0, color: rgba(124, 92, 255, 0.55) },
        { position: 1, color: rgba(124, 92, 255, 0) },
      ]),
    ],
  });
  addNode(d, blobA, hero.id);

  const blobB = createEllipse({
    name: 'Glow B',
    x: 840,
    y: 380,
    width: 720,
    height: 720,
    fills: [
      radialGradient([
        { position: 0, color: rgba(77, 159, 255, 0.4) },
        { position: 1, color: rgba(77, 159, 255, 0) },
      ]),
    ],
  });
  addNode(d, blobB, hero.id);

  const eyebrow = createText({
    name: 'Eyebrow',
    x: 84,
    y: 246,
    characters: 'DESIGN TOOL · BUILT FROM SCRATCH',
    fontFamily: 'JetBrains Mono',
    fontWeight: 500,
    fontSize: 12,
    letterSpacing: 2.4,
    fills: [solidPaint(rgba(141, 153, 255, 1))],
  });
  addNode(d, eyebrow, hero.id);

  const title = createText({
    name: 'Title',
    x: 80,
    y: 282,
    characters: 'Claude Fable 5',
    fontFamily: 'Space Grotesk',
    fontWeight: 700,
    fontSize: 84,
    letterSpacing: -2,
    fills: [
      linearGradient(
        [
          { position: 0, color: rgba(255, 255, 255, 1) },
          { position: 1, color: rgba(157, 178, 255, 1) },
        ],
        100,
      ),
    ],
  });
  addNode(d, title, hero.id);

  const subtitle = createText({
    name: 'Subtitle',
    x: 84,
    y: 408,
    width: 520,
    characters:
      'A miniature Figma with a real scene graph, command-pattern history, auto-layout, smart guides and a 60 fps canvas engine.\nDouble-click any text to edit it. Press R and draw.',
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 17,
    lineHeightPx: 27,
    autoResize: 'height',
    fills: [solidPaint(rgba(154, 163, 181, 1))],
  });
  addNode(d, subtitle, hero.id);

  const rule = createLine({
    name: 'Rule',
    x: 84,
    y: 560,
    width: 300,
    strokes: [solidPaint(rgba(60, 66, 82, 1))],
    strokeWeight: 1,
    strokeDash: 6,
    strokeGap: 6,
  });
  addNode(d, rule, hero.id);

  const shortcuts = createText({
    name: 'Shortcut hints',
    x: 84,
    y: 584,
    characters: 'V move · R rect · O ellipse · T text · F frame · ⌘/ all commands',
    fontFamily: 'JetBrains Mono',
    fontWeight: 400,
    fontSize: 12,
    letterSpacing: 0.4,
    fills: [solidPaint(rgba(108, 117, 135, 1))],
  });
  addNode(d, shortcuts, hero.id);

  const spark = createStar({
    name: 'Spark',
    x: 698,
    y: 196,
    width: 36,
    height: 36,
    rotation: 14,
    fills: [solidPaint(rgba(255, 209, 102, 1))],
  });
  addNode(d, spark, hero.id);

  // Glass card with auto-layout.
  const card = createFrame({
    name: 'Glass card',
    x: 824,
    y: 208,
    width: 360,
    height: 320,
    fills: [solidPaint(rgba(255, 255, 255, 0.07))],
    strokes: [solidPaint(rgba(255, 255, 255, 0.14))],
    strokeWeight: 1,
    strokeAlign: 'inside',
    cornerRadius: uniformRadius(20),
    effects: [
      { type: 'background-blur', enabled: true, radius: 24 },
      dropShadow({ offsetY: 24, blur: 48, color: rgba(0, 0, 0, 0.35) }),
    ],
    layout: { ...defaultAutoLayout('vertical'), gap: 14, paddingTop: 28, paddingRight: 28, paddingBottom: 28, paddingLeft: 28 },
    sizingY: 'hug',
  });
  addNode(d, card, hero.id);

  const cardTitle = createText({
    name: 'Card title',
    characters: 'Everything is editable',
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 20,
    fills: [solidPaint(rgba(244, 246, 252, 1))],
  });
  addNode(d, cardTitle, card.id);

  const cardBody = createText({
    name: 'Card body',
    characters:
      'This card is an auto-layout frame: it hugs its content, the description fills the width, and the buttons sit in a nested horizontal stack.',
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 13.5,
    lineHeightPx: 21,
    autoResize: 'height',
    sizingX: 'fill',
    fills: [solidPaint(rgba(168, 176, 194, 1))],
  });
  addNode(d, cardBody, card.id);

  const buttonRow = createFrame({
    name: 'Buttons',
    fills: [],
    clipsContent: false,
    layout: { ...defaultAutoLayout('horizontal'), gap: 12, paddingTop: 6, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 },
    sizingX: 'hug',
    sizingY: 'hug',
  });
  addNode(d, buttonRow, card.id);

  const primaryButton = createFrame({
    name: 'Primary button',
    fills: [
      linearGradient(
        [
          { position: 0, color: rgba(124, 92, 255, 1) },
          { position: 1, color: rgba(77, 159, 255, 1) },
        ],
        120,
      ),
    ],
    cornerRadius: uniformRadius(10),
    clipsContent: false,
    layout: { ...defaultAutoLayout('horizontal'), gap: 0, paddingTop: 11, paddingRight: 20, paddingBottom: 11, paddingLeft: 20 },
    sizingX: 'hug',
    sizingY: 'hug',
    effects: [dropShadow({ offsetY: 8, blur: 20, color: rgba(96, 116, 255, 0.45) })],
  });
  addNode(d, primaryButton, buttonRow.id);
  addNode(
    d,
    createText({
      name: 'Label',
      characters: 'Get started',
      fontFamily: 'Inter',
      fontWeight: 600,
      fontSize: 13,
      fills: [solidPaint(rgba(255, 255, 255, 1))],
    }),
    primaryButton.id,
  );

  const ghostButton = createFrame({
    name: 'Ghost button',
    fills: [solidPaint(rgba(255, 255, 255, 0.06))],
    strokes: [solidPaint(rgba(255, 255, 255, 0.16))],
    strokeWeight: 1,
    strokeAlign: 'inside',
    cornerRadius: uniformRadius(10),
    clipsContent: false,
    layout: { ...defaultAutoLayout('horizontal'), gap: 0, paddingTop: 11, paddingRight: 20, paddingBottom: 11, paddingLeft: 20 },
    sizingX: 'hug',
    sizingY: 'hug',
  });
  addNode(d, ghostButton, buttonRow.id);
  addNode(
    d,
    createText({
      name: 'Label',
      characters: 'Read the docs',
      fontFamily: 'Inter',
      fontWeight: 500,
      fontSize: 13,
      fills: [solidPaint(rgba(215, 220, 232, 1))],
    }),
    ghostButton.id,
  );

  // --- Playground frame ----------------------------------------------------
  const playground = createFrame({
    name: 'Playground',
    x: 1380,
    y: 0,
    width: 720,
    height: 800,
    fills: [solidPaint(rgba(244, 245, 247, 1))],
  });
  addNode(d, playground, null);

  addNode(
    d,
    createText({
      name: 'Playground title',
      x: 48,
      y: 48,
      characters: 'Shapes & styles',
      fontFamily: 'Playfair Display',
      fontWeight: 700,
      fontSize: 40,
      fills: [solidPaint(rgba(20, 23, 31, 1))],
    }),
    playground.id,
  );

  addNode(
    d,
    createRect({
      name: 'Gradient tile',
      x: 48,
      y: 140,
      width: 180,
      height: 180,
      cornerRadius: { tl: 48, tr: 8, br: 48, bl: 8 },
      fills: [
        linearGradient(
          [
            { position: 0, color: rgba(255, 94, 130, 1) },
            { position: 1, color: rgba(255, 173, 102, 1) },
          ],
          135,
        ),
      ],
      effects: [dropShadow({ offsetY: 16, blur: 32, color: rgba(255, 94, 130, 0.35) })],
    }),
    playground.id,
  );

  addNode(
    d,
    createEllipse({
      name: 'Soft circle',
      x: 268,
      y: 140,
      width: 180,
      height: 180,
      fills: [solidPaint(rgba(25, 180, 123, 1))],
      effects: [
        { type: 'inner-shadow', enabled: true, color: rgba(0, 60, 40, 0.45), offsetX: 0, offsetY: 14, blur: 28, spread: 0 },
      ],
    }),
    playground.id,
  );

  addNode(
    d,
    createStar({
      name: 'Star',
      x: 488,
      y: 140,
      width: 180,
      height: 180,
      rotation: -8,
      pointCount: 5,
      innerRatio: 0.45,
      fills: [solidPaint(rgba(255, 176, 32, 1))],
      strokes: [solidPaint(rgba(20, 23, 31, 1))],
      strokeWeight: 3,
      strokeAlign: 'center',
    }),
    playground.id,
  );

  addNode(
    d,
    createPolygon({
      name: 'Hexagon',
      x: 48,
      y: 380,
      width: 140,
      height: 140,
      pointCount: 6,
      fills: [solidPaint(rgba(77, 159, 255, 1))],
      effects: [{ type: 'layer-blur', enabled: false, radius: 8 }],
    }),
    playground.id,
  );

  addNode(
    d,
    createLine({
      name: 'Dashed line',
      x: 240,
      y: 448,
      width: 420,
      strokes: [solidPaint(rgba(20, 23, 31, 0.7))],
      strokeWeight: 2,
      strokeDash: 10,
      strokeGap: 8,
      rotation: 0,
    }),
    playground.id,
  );

  addNode(
    d,
    createText({
      name: 'Serif sample',
      x: 48,
      y: 570,
      characters: 'Six Google font families, weights 100–900,\nline-height & letter-spacing controls.',
      fontFamily: 'Playfair Display',
      fontWeight: 500,
      fontSize: 24,
      lineHeightPx: 36,
      fills: [solidPaint(rgba(20, 23, 31, 1))],
    }),
    playground.id,
  );

  addNode(
    d,
    createText({
      name: 'Mono sample',
      x: 48,
      y: 680,
      characters: 'const editor = buildFigma({ from: "scratch" })',
      fontFamily: 'JetBrains Mono',
      fontWeight: 400,
      fontSize: 15,
      fills: [solidPaint(rgba(124, 92, 255, 1))],
    }),
    playground.id,
  );

  return { nodes: d.nodes, rootIds: d.rootIds };
}
