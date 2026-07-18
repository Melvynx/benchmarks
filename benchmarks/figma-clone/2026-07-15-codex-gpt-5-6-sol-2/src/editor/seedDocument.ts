import {
  assertSceneInvariants,
  createDefaultAutoLayout,
  createDropShadowEffect,
  createEllipseNode,
  createFrameNode,
  createLinearGradientPaint,
  createRectangleNode,
  createSceneDocument,
  createSolidPaint,
  createStroke,
  createTextNode,
} from '@/core/model';

import type { DropShadowEffect, RgbaColor, SceneNode } from '@/core/model';

const color = (red: number, green: number, blue: number, alpha = 1): RgbaColor => ({
  r: red / 255,
  g: green / 255,
  b: blue / 255,
  a: alpha,
});

const COLORS = {
  white: color(255, 255, 255),
  ink: color(24, 31, 45),
  muted: color(100, 112, 133),
  line: color(225, 229, 237),
  canvas: color(240, 242, 247),
  sidebar: color(21, 27, 39),
  sidebarMuted: color(151, 160, 177),
  blue: color(91, 120, 255),
  blueSoft: color(235, 239, 255),
  green: color(42, 160, 112),
  greenSoft: color(228, 247, 239),
  orange: color(235, 144, 64),
  orangeSoft: color(255, 242, 226),
  violet: color(121, 87, 255),
  rose: color(231, 92, 132),
} as const;

const radii = (radius: number) => ({
  topLeft: radius,
  topRight: radius,
  bottomRight: radius,
  bottomLeft: radius,
});

function cardShadow(): DropShadowEffect {
  return {
    ...createDropShadowEffect(),
    color: color(19, 27, 44, 0.08),
    offset: { x: 0, y: 3 },
    blur: 12,
  };
}

export const SEED_DOCUMENT_ID = 'document:gpt-5-6-sol';

export function createSeedDocument() {
  const nodes: Record<string, SceneNode> = {};
  const add = (node: SceneNode) => {
    nodes[node.id] = node;
    return node.id;
  };

  const text = (
    id: string,
    parentId: string,
    content: string,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    fill = COLORS.ink,
    weight = 500,
  ) =>
    add(
      createTextNode({
        id,
        parentId,
        name: content.length > 28 ? `${content.slice(0, 25)}…` : content,
        content,
        x,
        y,
        width,
        height: fontSize * 1.35,
        fontSize,
        lineHeight: fontSize * 1.35,
        fontWeight: weight,
        fills: [createSolidPaint(fill)],
      }),
    );

  const desktopId = 'seed:desktop';
  const sidebarId = 'seed:sidebar';
  const mainId = 'seed:main';
  const metricRowId = 'seed:metrics';
  const chartId = 'seed:chart';
  const activityId = 'seed:activity';

  const sidebarChildren: string[] = [];
  sidebarChildren.push(
    add(
      createRectangleNode({
        id: 'seed:orbit-mark',
        parentId: sidebarId,
        name: 'Orbit mark',
        x: 22,
        y: 24,
        width: 28,
        height: 28,
        rotation: 18,
        cornerRadii: radii(8),
        fills: [
          createLinearGradientPaint([
            { position: 0, color: COLORS.blue },
            { position: 1, color: COLORS.violet },
          ]),
        ],
      }),
    ),
    text('seed:orbit-label', sidebarId, 'Orbit', 60, 27, 100, 18, COLORS.white, 650),
  );

  const navItems = ['Overview', 'Analytics', 'Customers', 'Reports', 'Settings'] as const;
  navItems.forEach((label, index) => {
    const y = 96 + index * 43;
    if (index === 0) {
      sidebarChildren.push(
        add(
          createRectangleNode({
            id: `seed:nav-bg-${index}`,
            parentId: sidebarId,
            name: 'Active navigation',
            x: 14,
            y: y - 8,
            width: 182,
            height: 34,
            cornerRadii: radii(7),
            fills: [createSolidPaint(color(91, 120, 255, 0.22))],
          }),
        ),
      );
    }
    sidebarChildren.push(
      add(
        createEllipseNode({
          id: `seed:nav-dot-${index}`,
          parentId: sidebarId,
          name: `${label} icon`,
          x: 28,
          y,
          width: 7,
          height: 7,
          fills: [createSolidPaint(index === 0 ? COLORS.blue : COLORS.sidebarMuted)],
        }),
      ),
      text(
        `seed:nav-text-${index}`,
        sidebarId,
        label,
        48,
        y - 5,
        120,
        12,
        index === 0 ? COLORS.white : COLORS.sidebarMuted,
        index === 0 ? 600 : 500,
      ),
    );
  });

  sidebarChildren.push(
    add(
      createEllipseNode({
        id: 'seed:user-avatar',
        parentId: sidebarId,
        name: 'Alex avatar',
        x: 22,
        y: 572,
        width: 30,
        height: 30,
        fills: [
          createLinearGradientPaint([
            { position: 0, color: COLORS.orange },
            { position: 1, color: COLORS.rose },
          ]),
        ],
      }),
    ),
    text('seed:user-name', sidebarId, 'Alex Morgan', 62, 571, 120, 12, COLORS.white, 600),
    text('seed:user-plan', sidebarId, 'Product team', 62, 588, 120, 10, COLORS.sidebarMuted, 450),
  );

  add(
    createFrameNode({
      id: sidebarId,
      parentId: desktopId,
      name: 'Sidebar',
      x: 0,
      y: 0,
      width: 210,
      height: 640,
      clipContent: true,
      childIds: sidebarChildren,
      fills: [createSolidPaint(COLORS.sidebar)],
    }),
  );

  const mainChildren: string[] = [
    text('seed:page-title', mainId, 'Good morning, Alex', 34, 30, 330, 24, COLORS.ink, 650),
    text(
      'seed:page-subtitle',
      mainId,
      'Here’s what’s happening with your business today.',
      34,
      66,
      380,
      11,
      COLORS.muted,
      450,
    ),
  ];

  mainChildren.push(
    add(
      createRectangleNode({
        id: 'seed:date-control',
        parentId: mainId,
        name: 'Date control',
        x: 525,
        y: 34,
        width: 100,
        height: 30,
        cornerRadii: radii(7),
        fills: [createSolidPaint(COLORS.white)],
        strokes: [createStroke(createSolidPaint(COLORS.line))],
      }),
    ),
    text('seed:date-label', mainId, 'Last 30 days', 541, 41, 75, 11, COLORS.muted, 550),
    add(
      createRectangleNode({
        id: 'seed:export-button',
        parentId: mainId,
        name: 'Export button',
        x: 634,
        y: 34,
        width: 84,
        height: 30,
        cornerRadii: radii(7),
        fills: [createSolidPaint(COLORS.blue)],
      }),
    ),
    text('seed:export-label', mainId, 'Export', 654, 41, 50, 11, COLORS.white, 600),
  );

  const metricChildren: string[] = [];
  const metricData = [
    { label: 'Revenue', value: '$128.4k', trend: '+12.8%', accent: COLORS.blue },
    { label: 'Active users', value: '8,642', trend: '+8.2%', accent: COLORS.green },
    { label: 'Conversion', value: '6.84%', trend: '+2.1%', accent: COLORS.violet },
  ] as const;

  metricData.forEach((metric, index) => {
    const cardId = `seed:metric-card-${index}`;
    const cardChildren = [
      text(`seed:metric-label-${index}`, cardId, metric.label, 16, 15, 110, 10, COLORS.muted, 550),
      text(`seed:metric-value-${index}`, cardId, metric.value, 16, 37, 130, 22, COLORS.ink, 650),
      add(
        createRectangleNode({
          id: `seed:metric-pill-${index}`,
          parentId: cardId,
          name: 'Trend badge',
          x: 136,
          y: 44,
          width: 52,
          height: 22,
          cornerRadii: radii(6),
          fills: [createSolidPaint(index === 1 ? COLORS.greenSoft : COLORS.blueSoft)],
        }),
      ),
      text(
        `seed:metric-trend-${index}`,
        cardId,
        metric.trend,
        146,
        49,
        38,
        9,
        index === 1 ? COLORS.green : metric.accent,
        650,
      ),
    ];
    metricChildren.push(
      add(
        createFrameNode({
          id: cardId,
          parentId: metricRowId,
          name: `${metric.label} card`,
          x: index * 224,
          y: 0,
          width: 208,
          height: 86,
          cornerRadii: radii(10),
          childIds: cardChildren,
          fills:
            index === 2
              ? [
                  createLinearGradientPaint([
                    { position: 0, color: COLORS.white },
                    { position: 1, color: color(241, 239, 255) },
                  ]),
                ]
              : [createSolidPaint(COLORS.white)],
          effects: [cardShadow()],
        }),
      ),
    );
  });

  add(
    createFrameNode({
      id: metricRowId,
      parentId: mainId,
      name: 'Metrics',
      x: 34,
      y: 108,
      width: 656,
      height: 86,
      fills: [],
      clipContent: false,
      childIds: metricChildren,
      autoLayout: {
        ...createDefaultAutoLayout(),
        gap: 16,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
  );
  mainChildren.push(metricRowId);

  const chartChildren: string[] = [
    text('seed:chart-title', chartId, 'Revenue overview', 18, 17, 180, 13, COLORS.ink, 650),
    text('seed:chart-subtitle', chartId, 'Weekly performance', 18, 38, 180, 10, COLORS.muted, 450),
  ];
  const barHeights = [44, 62, 50, 82, 74, 108, 92, 126, 112, 142, 132, 156] as const;
  barHeights.forEach((barHeight, index) => {
    chartChildren.push(
      add(
        createRectangleNode({
          id: `seed:bar-${index}`,
          parentId: chartId,
          name: `Week ${index + 1}`,
          x: 26 + index * 28,
          y: 232 - barHeight,
          width: 16,
          height: barHeight,
          cornerRadii: { topLeft: 4, topRight: 4, bottomRight: 1, bottomLeft: 1 },
          fills: [createSolidPaint(index >= 9 ? COLORS.blue : COLORS.blueSoft)],
        }),
      ),
    );
  });
  chartChildren.push(
    text('seed:chart-axis-1', chartId, 'W1', 26, 242, 30, 8, COLORS.muted, 500),
    text('seed:chart-axis-2', chartId, 'W6', 165, 242, 30, 8, COLORS.muted, 500),
    text('seed:chart-axis-3', chartId, 'W12', 327, 242, 30, 8, COLORS.muted, 500),
  );
  add(
    createFrameNode({
      id: chartId,
      parentId: mainId,
      name: 'Revenue overview',
      x: 34,
      y: 214,
      width: 390,
      height: 276,
      cornerRadii: radii(10),
      childIds: chartChildren,
      fills: [createSolidPaint(COLORS.white)],
      effects: [cardShadow()],
    }),
  );
  mainChildren.push(chartId);

  const activityChildren: string[] = [
    text('seed:activity-title', activityId, 'Recent activity', 18, 17, 180, 13, COLORS.ink, 650),
    text('seed:activity-action', activityId, 'View all', 223, 18, 50, 10, COLORS.blue, 600),
  ];
  const activities = [
    ['MK', 'Maya K.', 'New subscription', 'Paid', COLORS.greenSoft, COLORS.green],
    ['JL', 'Jon L.', 'Invited 3 members', 'Team', COLORS.blueSoft, COLORS.blue],
    ['AN', 'Ari N.', 'Exported a report', 'Done', COLORS.orangeSoft, COLORS.orange],
    ['SM', 'Sam M.', 'Updated billing', 'Paid', COLORS.greenSoft, COLORS.green],
  ] as const;
  activities.forEach((activity, index) => {
    const y = 58 + index * 50;
    activityChildren.push(
      add(
        createEllipseNode({
          id: `seed:activity-avatar-${index}`,
          parentId: activityId,
          name: `${activity[1]} avatar`,
          x: 18,
          y,
          width: 28,
          height: 28,
          fills: [createSolidPaint(index % 2 === 0 ? COLORS.violet : COLORS.orange)],
        }),
      ),
      text(
        `seed:activity-initial-${index}`,
        activityId,
        activity[0],
        23,
        y + 7,
        20,
        8,
        COLORS.white,
        650,
      ),
      text(
        `seed:activity-name-${index}`,
        activityId,
        activity[1],
        56,
        y + 1,
        95,
        10,
        COLORS.ink,
        600,
      ),
      text(
        `seed:activity-desc-${index}`,
        activityId,
        activity[2],
        56,
        y + 17,
        140,
        9,
        COLORS.muted,
        450,
      ),
      add(
        createRectangleNode({
          id: `seed:activity-status-bg-${index}`,
          parentId: activityId,
          name: `${activity[3]} status`,
          x: 224,
          y: y + 4,
          width: 50,
          height: 20,
          cornerRadii: radii(6),
          fills: [createSolidPaint(activity[4])],
        }),
      ),
      text(
        `seed:activity-status-${index}`,
        activityId,
        activity[3],
        236,
        y + 8,
        35,
        8,
        activity[5],
        650,
      ),
    );
  });
  add(
    createFrameNode({
      id: activityId,
      parentId: mainId,
      name: 'Recent activity',
      x: 440,
      y: 214,
      width: 278,
      height: 276,
      cornerRadii: radii(10),
      childIds: activityChildren,
      fills: [createSolidPaint(COLORS.white)],
      effects: [cardShadow()],
    }),
  );
  mainChildren.push(activityId);

  mainChildren.push(
    text('seed:insight-label', mainId, 'INSIGHT', 34, 520, 80, 9, COLORS.blue, 650),
    text(
      'seed:insight-copy',
      mainId,
      'Revenue is pacing 14% above your monthly target.',
      34,
      542,
      420,
      14,
      COLORS.ink,
      600,
    ),
  );

  add(
    createFrameNode({
      id: mainId,
      parentId: desktopId,
      name: 'Main content',
      x: 210,
      y: 0,
      width: 750,
      height: 640,
      childIds: mainChildren,
      fills: [createSolidPaint(COLORS.canvas)],
    }),
  );

  add(
    createFrameNode({
      id: desktopId,
      name: 'Analytics dashboard',
      x: 0,
      y: 0,
      width: 960,
      height: 640,
      cornerRadii: radii(4),
      childIds: [sidebarId, mainId],
      fills: [createSolidPaint(COLORS.white)],
      effects: [{ ...cardShadow(), blur: 28, offset: { x: 0, y: 10 } }],
    }),
  );

  const mobileId = 'seed:mobile';
  const mobileChildren = [
    text('seed:mobile-brand', mobileId, 'Orbit', 22, 25, 100, 17, COLORS.ink, 650),
    text('seed:mobile-title', mobileId, 'Good morning, Alex', 22, 82, 280, 23, COLORS.ink, 650),
    text('seed:mobile-sub', mobileId, 'Your weekly overview', 22, 117, 220, 11, COLORS.muted, 450),
    add(
      createRectangleNode({
        id: 'seed:mobile-metric',
        parentId: mobileId,
        name: 'Mobile revenue card',
        x: 22,
        y: 158,
        width: 316,
        height: 118,
        cornerRadii: radii(12),
        fills: [
          createLinearGradientPaint([
            { position: 0, color: COLORS.blue },
            { position: 1, color: COLORS.violet },
          ]),
        ],
      }),
    ),
    text(
      'seed:mobile-metric-label',
      mobileId,
      'TOTAL REVENUE',
      42,
      181,
      180,
      9,
      color(225, 230, 255),
      650,
    ),
    text('seed:mobile-metric-value', mobileId, '$128,420', 42, 208, 220, 28, COLORS.white, 650),
    text(
      'seed:mobile-metric-trend',
      mobileId,
      '+12.8% this month',
      42,
      247,
      180,
      10,
      COLORS.white,
      550,
    ),
    text('seed:mobile-chart-title', mobileId, 'Performance', 22, 318, 180, 14, COLORS.ink, 650),
  ];
  [78, 112, 92, 146, 122, 174, 156].forEach((barHeight, index) => {
    mobileChildren.push(
      add(
        createRectangleNode({
          id: `seed:mobile-bar-${index}`,
          parentId: mobileId,
          name: `Mobile chart ${index + 1}`,
          x: 28 + index * 43,
          y: 566 - barHeight,
          width: 24,
          height: barHeight,
          cornerRadii: { topLeft: 6, topRight: 6, bottomRight: 2, bottomLeft: 2 },
          fills: [createSolidPaint(index === 5 ? COLORS.blue : COLORS.blueSoft)],
        }),
      ),
    );
  });
  mobileChildren.push(
    text(
      'seed:mobile-bottom-title',
      mobileId,
      'Recent activity',
      22,
      616,
      200,
      14,
      COLORS.ink,
      650,
    ),
    text(
      'seed:mobile-bottom-copy',
      mobileId,
      '4 updates since yesterday',
      22,
      644,
      220,
      11,
      COLORS.muted,
      450,
    ),
  );
  add(
    createFrameNode({
      id: mobileId,
      name: 'Mobile overview',
      x: 1030,
      y: 0,
      width: 360,
      height: 760,
      cornerRadii: radii(20),
      childIds: mobileChildren,
      fills: [createSolidPaint(COLORS.canvas)],
      effects: [{ ...cardShadow(), blur: 28, offset: { x: 0, y: 10 } }],
    }),
  );

  const libraryId = 'seed:library';
  const libraryChildren = [
    text('seed:library-title', libraryId, 'Components', 24, 22, 200, 18, COLORS.ink, 650),
    text(
      'seed:library-sub',
      libraryId,
      'Reusable interface primitives',
      24,
      51,
      240,
      11,
      COLORS.muted,
      450,
    ),
  ];
  const buttonData = [
    ['Primary', COLORS.blue, COLORS.white],
    ['Secondary', COLORS.white, COLORS.ink],
  ] as const;
  buttonData.forEach((button, index) => {
    const x = 322 + index * 136;
    libraryChildren.push(
      add(
        createRectangleNode({
          id: `seed:component-button-${index}`,
          parentId: libraryId,
          name: `Button / ${button[0]}`,
          x,
          y: 47,
          width: 120,
          height: 38,
          cornerRadii: radii(8),
          fills: [createSolidPaint(button[1])],
          strokes: index === 1 ? [createStroke(createSolidPaint(COLORS.line))] : [],
        }),
      ),
      text(
        `seed:component-button-text-${index}`,
        libraryId,
        button[0],
        x + 29,
        58,
        72,
        11,
        button[2],
        600,
      ),
    );
  });
  libraryChildren.push(
    add(
      createEllipseNode({
        id: 'seed:component-avatar',
        parentId: libraryId,
        name: 'Avatar',
        x: 610,
        y: 42,
        width: 48,
        height: 48,
        fills: [
          createLinearGradientPaint([
            { position: 0, color: COLORS.orange },
            { position: 1, color: COLORS.rose },
          ]),
        ],
      }),
    ),
    add(
      createRectangleNode({
        id: 'seed:component-chip',
        parentId: libraryId,
        name: 'Status chip',
        x: 716,
        y: 50,
        width: 90,
        height: 28,
        cornerRadii: radii(7),
        fills: [createSolidPaint(COLORS.greenSoft)],
      }),
    ),
    text('seed:component-chip-text', libraryId, 'Active', 740, 58, 50, 10, COLORS.green, 650),
  );
  add(
    createFrameNode({
      id: libraryId,
      name: 'Component library',
      x: 0,
      y: 700,
      width: 960,
      height: 132,
      cornerRadii: radii(12),
      childIds: libraryChildren,
      fills: [createSolidPaint(COLORS.white)],
      effects: [cardShadow()],
    }),
  );

  const document = createSceneDocument({
    id: SEED_DOCUMENT_ID,
    name: 'Product analytics',
    nodes,
    rootIds: [desktopId, mobileId, libraryId],
    background: color(32, 34, 40),
  });
  assertSceneInvariants(document);
  return document;
}
