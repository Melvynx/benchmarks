import { BLACK, WHITE, linearPaint, rgb, solid } from "./color";
import {
  createComponent,
  createEllipse,
  createFrame,
  createInstance,
  createPage,
  createRectangle,
  createText,
  defaultLayout,
  dropShadow,
  uniformCorners,
} from "./factories";
import { nid } from "./ids";
import type { Document, FrameNode } from "./types";

export function createDemoDocument(): Document {
  const page = createPage("Workshop");
  const nodes: Document["nodes"] = {};

  const phone = createFrame({
    name: "iPhone 14",
    x: 80,
    y: 80,
    width: 390,
    height: 844,
    fills: [solid(rgb(246, 245, 242))],
    clipContent: true,
    cornerRadius: uniformCorners(0),
    layout: {
      ...defaultLayout(),
      direction: "vertical",
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      childSizing: { horizontal: "fixed", vertical: "fixed" },
      primaryAlign: "start",
      counterAlign: "start",
    },
  });

  const status = createFrame({
    name: "Status bar",
    parentId: phone.id,
    width: 390,
    height: 54,
    fills: [],
    clipContent: false,
    layout: {
      ...defaultLayout(),
      direction: "horizontal",
      padding: { top: 18, right: 24, bottom: 8, left: 24 },
      primaryAlign: "space-between",
      counterAlign: "center",
      childSizing: { horizontal: "fill", vertical: "hug" },
    },
  });
  const time = createText({
    name: "Time",
    parentId: status.id,
    characters: "9:41",
    width: 48,
    height: 18,
    fills: [],
    text: {
      fontFamily: "Inter",
      fontWeight: 600,
      fontSize: 15,
      lineHeight: 1.2,
      letterSpacing: 0,
      align: "left",
      color: rgb(20, 20, 22),
    },
  });
  const battery = createText({
    name: "Battery",
    parentId: status.id,
    characters: "100%",
    width: 48,
    height: 18,
    fills: [],
    text: {
      fontFamily: "Inter",
      fontWeight: 500,
      fontSize: 13,
      lineHeight: 1.2,
      letterSpacing: 0,
      align: "right",
      color: rgb(20, 20, 22),
    },
  });
  status.children = [time.id, battery.id];

  const hero = createFrame({
    name: "Hero",
    parentId: phone.id,
    width: 390,
    height: 220,
    fills: [
      linearPaint(
        [
          { offset: 0, color: rgb(36, 48, 64) },
          { offset: 1, color: rgb(18, 24, 32) },
        ],
        { x: 0.1, y: 0 },
        { x: 0.9, y: 1 },
      ),
    ],
    clipContent: true,
    layout: {
      ...defaultLayout(),
      direction: "vertical",
      gap: 8,
      padding: { top: 36, right: 28, bottom: 28, left: 28 },
      childSizing: { horizontal: "fill", vertical: "hug" },
    },
  });
  const kicker = createText({
    name: "Kicker",
    parentId: hero.id,
    characters: "STUDIO FILE",
    width: 334,
    height: 16,
    fills: [],
    text: {
      fontFamily: "JetBrains Mono",
      fontWeight: 500,
      fontSize: 11,
      lineHeight: 1.2,
      letterSpacing: 1.4,
      align: "left",
      color: rgb(168, 198, 216),
    },
  });
  const title = createText({
    name: "Title",
    parentId: hero.id,
    characters: "Northlight",
    width: 334,
    height: 44,
    fills: [],
    text: {
      fontFamily: "Playfair Display",
      fontWeight: 600,
      fontSize: 36,
      lineHeight: 1.1,
      letterSpacing: -0.4,
      align: "left",
      color: WHITE,
    },
  });
  const subtitle = createText({
    name: "Subtitle",
    parentId: hero.id,
    characters: "A reading lamp that knows when to get out of the way.",
    width: 334,
    height: 44,
    fills: [],
    text: {
      fontFamily: "Inter",
      fontWeight: 400,
      fontSize: 14,
      lineHeight: 1.45,
      letterSpacing: 0,
      align: "left",
      color: rgb(210, 220, 228),
    },
  });
  hero.children = [kicker.id, title.id, subtitle.id];

  const body = createFrame({
    name: "Body",
    parentId: phone.id,
    width: 390,
    height: 570,
    fills: [],
    clipContent: false,
    layout: {
      ...defaultLayout(),
      direction: "vertical",
      gap: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      childSizing: { horizontal: "fill", vertical: "hug" },
    },
  });

  const card = (name: string, heading: string, copy: string, accent: ReturnType<typeof rgb>): FrameNode => {
    const f = createFrame({
      name,
      parentId: body.id,
      width: 342,
      height: 108,
      fills: [solid(WHITE)],
      cornerRadius: uniformCorners(16),
      effects: [dropShadow(0, 8, 24, 0.08)],
      clipContent: true,
      layout: {
        ...defaultLayout(),
        direction: "horizontal",
        gap: 14,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        counterAlign: "center",
        childSizing: { horizontal: "fill", vertical: "hug" },
      },
    });
    const swatch = createRectangle({
      name: `${name} swatch`,
      parentId: f.id,
      width: 44,
      height: 44,
      fills: [solid(accent)],
      cornerRadius: uniformCorners(12),
    });
    const col = createFrame({
      name: `${name} copy`,
      parentId: f.id,
      width: 252,
      height: 76,
      fills: [],
      clipContent: false,
      layout: {
        ...defaultLayout(),
        direction: "vertical",
        gap: 4,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        childSizing: { horizontal: "fill", vertical: "hug" },
      },
    });
    const h = createText({
      name: `${name} heading`,
      parentId: col.id,
      characters: heading,
      width: 252,
      height: 22,
      fills: [],
      text: {
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: 15,
        lineHeight: 1.3,
        letterSpacing: -0.1,
        align: "left",
        color: rgb(22, 22, 24),
      },
    });
    const p = createText({
      name: `${name} body`,
      parentId: col.id,
      characters: copy,
      width: 252,
      height: 40,
      fills: [],
      text: {
        fontFamily: "Inter",
        fontWeight: 400,
        fontSize: 13,
        lineHeight: 1.4,
        letterSpacing: 0,
        align: "left",
        color: rgb(90, 90, 96),
      },
    });
    col.children = [h.id, p.id];
    f.children = [swatch.id, col.id];
    nodes[swatch.id] = swatch;
    nodes[col.id] = col;
    nodes[h.id] = h;
    nodes[p.id] = p;
    return f;
  };

  const c1 = card("Card 1", "Warm beam", "2700K default, dimmable to a candle.", rgb(201, 132, 76));
  const c2 = card("Card 2", "Quiet hardware", "No visible fasteners. Felt base.", rgb(64, 92, 86));
  const c3 = card("Card 3", "Presence", "Fades when you leave the desk.", rgb(36, 48, 64));

  const buttonMaster = createComponent({
    name: "Button / Primary",
    x: 520,
    y: 80,
    width: 200,
    height: 44,
    fills: [solid(rgb(36, 48, 64))],
    cornerRadius: uniformCorners(10),
    layout: {
      ...defaultLayout(),
      direction: "horizontal",
      primaryAlign: "center",
      counterAlign: "center",
      padding: { top: 12, right: 20, bottom: 12, left: 20 },
      childSizing: { horizontal: "fixed", vertical: "fixed" },
    },
  });
  const btnLabel = createText({
    name: "Label",
    parentId: buttonMaster.id,
    characters: "Pre-order",
    width: 160,
    height: 20,
    fills: [],
    text: {
      fontFamily: "Inter",
      fontWeight: 600,
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      align: "center",
      color: WHITE,
    },
  });
  buttonMaster.children = [btnLabel.id];

  const btnInstance = createInstance({
    name: "Button / Primary",
    parentId: body.id,
    componentId: buttonMaster.id,
    width: 342,
    height: 44,
    fills: [solid(rgb(36, 48, 64))],
  });

  body.children = [c1.id, c2.id, c3.id, btnInstance.id];
  phone.children = [status.id, hero.id, body.id];

  const desktop = createFrame({
    name: "Desktop / 1280",
    x: 560,
    y: 200,
    width: 1280,
    height: 800,
    fills: [solid(rgb(18, 20, 22))],
    clipContent: true,
  });

  const deskNav = createRectangle({
    name: "Nav",
    parentId: desktop.id,
    x: 0,
    y: 0,
    width: 1280,
    height: 64,
    fills: [solid(rgb(14, 16, 18))],
  });
  const deskBrand = createText({
    name: "Brand",
    parentId: desktop.id,
    x: 40,
    y: 20,
    width: 200,
    height: 28,
    fills: [],
    characters: "Northlight",
    text: {
      fontFamily: "Playfair Display",
      fontWeight: 600,
      fontSize: 22,
      lineHeight: 1.2,
      letterSpacing: 0,
      align: "left",
      color: WHITE,
    },
  });
  const deskHero = createText({
    name: "Headline",
    parentId: desktop.id,
    x: 80,
    y: 180,
    width: 640,
    height: 140,
    fills: [],
    characters: "Light that\nreads the room.",
    text: {
      fontFamily: "Playfair Display",
      fontWeight: 500,
      fontSize: 64,
      lineHeight: 1.05,
      letterSpacing: -1.2,
      align: "left",
      color: WHITE,
    },
  });
  const deskCopy = createText({
    name: "Lead",
    parentId: desktop.id,
    x: 80,
    y: 360,
    width: 420,
    height: 80,
    fills: [],
    characters: "A desk lamp with a presence sensor, a felt base, and a beam you can actually read under.",
    text: {
      fontFamily: "Inter",
      fontWeight: 400,
      fontSize: 16,
      lineHeight: 1.5,
      letterSpacing: 0,
      align: "left",
      color: rgb(180, 186, 192),
    },
  });
  const orb = createEllipse({
    name: "Lamp orb",
    parentId: desktop.id,
    x: 820,
    y: 160,
    width: 320,
    height: 320,
    fills: [
      linearPaint(
        [
          { offset: 0, color: rgb(232, 196, 140) },
          { offset: 1, color: rgb(201, 132, 76) },
        ],
        { x: 0.3, y: 0.2 },
        { x: 0.8, y: 0.9 },
      ),
    ],
    effects: [dropShadow(0, 40, 80, 0.45)],
  });
  const ring = createEllipse({
    name: "Halo",
    parentId: desktop.id,
    x: 780,
    y: 120,
    width: 400,
    height: 400,
    fills: [],
    strokes: [
      {
        paint: solid(rgb(232, 196, 140), 0.35),
        thickness: 1,
        align: "center",
        cap: "butt",
        join: "miter",
        dash: [6, 8],
      },
    ],
  });

  desktop.children = [deskNav.id, deskBrand.id, deskHero.id, deskCopy.id, ring.id, orb.id];

  const put = (...list: { id: string }[]) => {
    for (const n of list) nodes[n.id] = n as Document["nodes"][string];
  };

  put(
    phone,
    status,
    time,
    battery,
    hero,
    kicker,
    title,
    subtitle,
    body,
    c1,
    c2,
    c3,
    buttonMaster,
    btnLabel,
    btnInstance,
    desktop,
    deskNav,
    deskBrand,
    deskHero,
    deskCopy,
    orb,
    ring,
  );

  page.children = [phone.id, buttonMaster.id, desktop.id];

  return {
    id: nid("doc"),
    name: "Northlight",
    pages: [page],
    activePageId: page.id,
    nodes,
    colorStyles: [
      { id: nid("style"), name: "Ink", paint: solid(rgb(22, 22, 24)) },
      { id: nid("style"), name: "Paper", paint: solid(rgb(246, 245, 242)) },
      { id: nid("style"), name: "Copper", paint: solid(rgb(201, 132, 76)) },
      { id: nid("style"), name: "Night", paint: solid(rgb(36, 48, 64)) },
    ],
    textStyles: [
      {
        id: nid("style"),
        name: "Display",
        text: {
          fontFamily: "Playfair Display",
          fontWeight: 600,
          fontSize: 36,
          lineHeight: 1.1,
          letterSpacing: -0.4,
          align: "left",
          color: BLACK,
        },
      },
      {
        id: nid("style"),
        name: "Body",
        text: {
          fontFamily: "Inter",
          fontWeight: 400,
          fontSize: 14,
          lineHeight: 1.45,
          letterSpacing: 0,
          align: "left",
          color: rgb(90, 90, 96),
        },
      },
    ],
    prototypeLinks: [
      {
        id: nid("link"),
        fromId: btnInstance.id,
        toId: desktop.id,
        animation: "dissolve",
      },
    ],
    comments: [
      {
        id: nid("c"),
        x: 200,
        y: 300,
        resolved: false,
        messages: [
          {
            id: nid("m"),
            author: "You",
            body: "Try a slightly cooler hero so the copper cards pop.",
            createdAt: Date.now() - 3600_000,
          },
        ],
      },
    ],
    schema: 1,
  };
}

export function createBlankDocument(): Document {
  const page = createPage("Page 1");
  return {
    id: nid("doc"),
    name: "Untitled",
    pages: [page],
    activePageId: page.id,
    nodes: {},
    colorStyles: [],
    textStyles: [],
    prototypeLinks: [],
    comments: [],
    schema: 1,
  };
}
