import { createCanvas, GlobalFonts, Path2D } from "@napi-rs/canvas";
import { spawn } from "child_process";
import fs from "fs";

// Register official Lumail brand fonts
GlobalFonts.registerFromPath("fonts/Inter-400-normal.ttf", "Inter");
GlobalFonts.registerFromPath("fonts/Inter-500-normal.ttf", "Inter");
GlobalFonts.registerFromPath("fonts/Inter-600-normal.ttf", "Inter");
GlobalFonts.registerFromPath("fonts/Inter-700-normal.ttf", "Inter");
GlobalFonts.registerFromPath("fonts/Geist-400-normal.ttf", "Geist");
GlobalFonts.registerFromPath("fonts/Geist-500-normal.ttf", "Geist");
GlobalFonts.registerFromPath("fonts/Geist-600-normal.ttf", "Geist");
GlobalFonts.registerFromPath("fonts/Geist-700-normal.ttf", "Geist");
GlobalFonts.registerFromPath("fonts/GeistMono-400-normal.ttf", "Geist Mono");
GlobalFonts.registerFromPath("fonts/GeistMono-500-normal.ttf", "Geist Mono");
GlobalFonts.registerFromPath("fonts/GeistMono-600-normal.ttf", "Geist Mono");
GlobalFonts.registerFromPath("fonts/GeistMono-700-normal.ttf", "Geist Mono");
GlobalFonts.registerFromPath("fonts/PlusJakartaSans-600-normal.ttf", "Plus Jakarta Sans");
GlobalFonts.registerFromPath("fonts/PlusJakartaSans-700-normal.ttf", "Plus Jakarta Sans");
GlobalFonts.registerFromPath("fonts/InstrumentSerif-400-italic.ttf", "Instrument Serif");

const W = 1920;
const H = 1080;
const FPS = 60;
const DURATION = 45;
const TOTAL_FRAMES = FPS * DURATION; // 2700 frames

// Official Lumail Brand Colors (from lumail.io/brand)
const C = {
  flare: "#FF3300",
  ink: "#1A1614",
  paper: "#F8F7F4",
  white: "#FFFFFF",
  coral: "#F26A4B",
  peach: "#FFE3D9",
  wash: "#FBEEE7",
  ember: "#C4320A",
  void: "#08090A",
  voidCard: "#111316",
  voidBorder: "#23272E",
  paperBorder: "#E6E1DA",
  mutedInk: "#6E655F",
  mutedVoid: "#949BA4",
  green: "#00C951",
  blue: "#2B7FFF",
  purple: "#AD46FF",
  amber: "#FFA657",
};

// Math & Easing Helpers
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const norm = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

function easeOutCubic(x) {
  const t = clamp(x);
  return 1 - Math.pow(1 - t, 3);
}
function easeOutQuart(x) {
  const t = clamp(x);
  return 1 - Math.pow(1 - t, 4);
}
function easeInOutCubic(x) {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutBack(x, overshoot = 1.35) {
  const t = clamp(x);
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function spring(x, damping = 8.5, freq = 11) {
  const t = clamp(x);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-damping * t) * Math.cos(freq * t);
}

// Drawing primitives
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function fillRoundRect(ctx, x, y, w, h, r, fillStyle) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, strokeStyle, lineWidth = 1.5) {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawCard(ctx, x, y, w, h, r, bg, border, shadowAlpha = 0.08, shadowY = 18, shadowBlur = 40) {
  ctx.save();
  if (shadowAlpha > 0) {
    ctx.shadowColor = `rgba(12, 10, 9, ${shadowAlpha})`;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowY;
  }
  fillRoundRect(ctx, x, y, w, h, r, bg);
  ctx.restore();
  if (border) {
    strokeRoundRect(ctx, x, y, w, h, r, border, 1.5);
  }
}

function drawPill(ctx, x, y, text, bg, fg, border = null, fontSize = 20, padX = 20, padY = 10) {
  ctx.save();
  ctx.font = `600 ${fontSize}px "Geist Mono"`;
  const m = ctx.measureText(text);
  const pw = m.width + padX * 2;
  const ph = fontSize + padY * 2;
  fillRoundRect(ctx, x, y, pw, ph, ph / 2, bg);
  if (border) strokeRoundRect(ctx, x, y, pw, ph, ph / 2, border, 1.5);
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + ph / 2 + 1);
  ctx.restore();
  return { w: pw, h: ph };
}

// Official Lumail Logo Mark & Lockup (exact SVG geometry from lumail.io/brand)
// Tile: 91 units, radius 18/91, gap 26/91, Wordmark: Plus Jakarta Sans SemiBold (600) -3.4% tracking
const L_PATH_STR =
  "M37 57C37 59.8284 37.0002 61.2424 37.8789 62.1211C38.7576 62.9998 40.1716 63 43 63H65V74H32C29.1716 74 27.7576 73.9998 26.8789 73.1211C26.0002 72.2424 26 70.8284 26 68V18H37V57Z";

function drawLumailMark(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const r = size * (18 / 91);

  // Subtle ambient glow
  ctx.save();
  ctx.shadowColor = "rgba(255, 51, 0, 0.35)";
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetY = size * 0.08;
  const tileGrad = ctx.createLinearGradient(0, 0, 0, size);
  tileGrad.addColorStop(0, "#FF360F");
  tileGrad.addColorStop(1, "#ED3300");
  fillRoundRect(ctx, 0, 0, size, size, r, tileGrad);
  ctx.restore();

  // Inner glass rim highlight
  const rimGrad = ctx.createLinearGradient(0, 0, 0, size);
  rimGrad.addColorStop(0, "rgba(255,255,255,0.42)");
  rimGrad.addColorStop(0.35, "rgba(255,255,255,0.0)");
  rimGrad.addColorStop(1, "rgba(255,255,255,0.22)");
  strokeRoundRect(ctx, 0.75, 0.75, size - 1.5, size - 1.5, r, rimGrad, Math.max(1.5, size * 0.02));

  // White L path (scaled from 91x91 space)
  ctx.save();
  const s = size / 91;
  ctx.scale(s, s);
  const path = new Path2D(L_PATH_STR);
  const lGrad = ctx.createLinearGradient(0, 18, 0, 74);
  lGrad.addColorStop(0, "#FFFFFF");
  lGrad.addColorStop(1, "#FCE8E6");
  ctx.fillStyle = lGrad;
  ctx.fill(path);
  ctx.restore();

  ctx.restore();
}

function drawLumailLockup(ctx, cx, cy, markSize, darkTheme = false, showWordmark = true, wordmarkProgress = 1) {
  const gap = markSize * (26 / 91);
  const fontSize = markSize * (68 / 91);
  ctx.save();
  ctx.font = `600 ${fontSize}px "Plus Jakarta Sans"`;

  // Measure wordmark with tight -3.4% tracking
  const word = "Lumail";
  const tracking = -0.034 * fontSize;
  let wordWidth = 0;
  for (let i = 0; i < word.length; i++) {
    wordWidth += ctx.measureText(word[i]).width + (i < word.length - 1 ? tracking : 0);
  }

  const totalWidth = showWordmark ? markSize + ( gap + wordWidth ) * wordmarkProgress : markSize;
  const startX = cx - totalWidth / 2;
  const startY = cy - markSize / 2;

  drawLumailMark(ctx, startX, startY, markSize);

  if (showWordmark && wordmarkProgress > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(startX + markSize, startY - markSize * 0.3, (gap + wordWidth + 40) * wordmarkProgress, markSize * 1.6);
    ctx.clip();

    ctx.fillStyle = darkTheme ? C.paper : C.ink;
    ctx.textBaseline = "alphabetic";
    // Cap height centered on tile
    const capHeight = fontSize * 0.71;
    const textY = cy + capHeight / 2;
    let curX = startX + markSize + gap;
    for (let i = 0; i < word.length; i++) {
      ctx.fillText(word[i], curX, textY);
      curX += ctx.measureText(word[i]).width + tracking;
    }
    ctx.restore();
  }
  ctx.restore();
}

// Draw Architectural Grid & Ambient Background
function drawBackground(ctx, t, darkTheme = false, flareSpotX = W * 0.5, flareSpotY = H * 0.5, flareIntensity = 0.08) {
  ctx.fillStyle = darkTheme ? C.void : C.paper;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial warmth
  if (flareIntensity > 0) {
    const grad = ctx.createRadialGradient(flareSpotX, flareSpotY, 20, flareSpotX, flareSpotY, 920);
    grad.addColorStop(0, `rgba(255, 51, 0, ${flareIntensity})`);
    grad.addColorStop(0.5, `rgba(242, 106, 75, ${flareIntensity * 0.35})`);
    grad.addColorStop(1, "rgba(255, 51, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Precision Swiss grid lines
  ctx.save();
  ctx.strokeStyle = darkTheme ? "rgba(255,255,255,0.035)" : "rgba(26,22,20,0.04)";
  ctx.lineWidth = 1;
  const gridSize = 120;
  const offsetX = (t * 18) % gridSize;
  for (let x = -gridSize + offsetX; x < W + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 60; y < H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

// Top persistent brand chrome (keeps Lumail identity unmistakable across every frame)
function drawTopBrandBar(ctx, t, darkTheme, sectionIndex, sectionLabel) {
  if (t < 4.8 || t > 41.8) return; // Act I & Act IX have giant hero lockups
  const alpha = Math.min(norm(t, 4.8, 5.3), norm(41.8, t, 41.3));
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Top-left Lumail lockup
  drawLumailLockup(ctx, 152, 58, 38, darkTheme, true, 1);

  // Section indicator on top-right
  const pillText = `${sectionIndex} · ${sectionLabel}`;
  ctx.font = `500 16px "Geist Mono"`;
  const m = ctx.measureText(pillText);
  const pw = m.width + 32;
  const px = W - 80 - pw;
  const py = 38;
  fillRoundRect(
    ctx,
    px,
    py,
    pw,
    40,
    20,
    darkTheme ? "rgba(255,255,255,0.06)" : "rgba(26,22,20,0.05)"
  );
  strokeRoundRect(
    ctx,
    px,
    py,
    pw,
    40,
    20,
    darkTheme ? "rgba(255,255,255,0.12)" : "rgba(26,22,20,0.1)",
    1
  );
  ctx.fillStyle = C.flare;
  ctx.beginPath();
  ctx.arc(px + 18, py + 20, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = darkTheme ? C.paper : C.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, px + 30, py + 21);

  ctx.restore();
}

// ============================================================================
// ACT I (0.0s - 5.0s): Problem Contrast -> Lumail Brand Lockup Reveal
// ============================================================================
function renderAct1(ctx, t) {
  if (t < 2.2) {
    // Part 1A: Dark Void - "Running email shouldn't feel like a second job."
    drawBackground(ctx, t, true, W * 0.5, H * 0.5, 0.09);

    const p1 = easeOutCubic(norm(t, 0.1, 0.7));
    const exit = easeInOutCubic(norm(t, 1.85, 2.2));

    ctx.save();
    ctx.translate(W / 2, H / 2);
    const scale = lerp(0.94, 1.0, p1) * lerp(1.0, 1.12, exit);
    ctx.scale(scale, scale);
    ctx.globalAlpha = p1 * (1 - exit);

    // Floating legacy pain-point chips that get struck through
    const legacyPills = [
      { label: "Per-subscriber tax", x: -480, y: -210, delay: 0.15 },
      { label: "Bloated 2019 templates", x: 240, y: -195, delay: 0.25 },
      { label: "Separate transactional bill", x: -420, y: 185, delay: 0.35 },
      { label: "Zero agent access", x: 220, y: 175, delay: 0.45 },
    ];

    legacyPills.forEach((item) => {
      const lp = easeOutBack(norm(t, item.delay, item.delay + 0.45));
      const strike = easeOutCubic(norm(t, item.delay + 0.55, item.delay + 0.85));
      ctx.save();
      ctx.translate(item.x, item.y + (1 - lp) * 30);
      ctx.globalAlpha *= lp;
      const box = drawPill(ctx, 0, 0, item.label, "#14171C", "#949BA4", "#262B33", 19, 22, 11);
      if (strike > 0) {
        ctx.strokeStyle = C.flare;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(16, box.h / 2);
        ctx.lineTo(16 + (box.w - 32) * strike, box.h / 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Center headline
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 66px "Inter"`;
    ctx.fillStyle = C.paper;
    ctx.fillText("Running email shouldn’t feel", 0, -44);

    const p2 = easeOutCubic(norm(t, 0.45, 1.05));
    ctx.save();
    ctx.globalAlpha *= p2;
    ctx.translate(0, (1 - p2) * 24);
    ctx.fillStyle = C.coral;
    ctx.fillText("like a second job.", 0, 42);
    ctx.restore();

    ctx.restore();
  } else {
    // Part 1B: Iris Wipe to Warm Paper (#F8F7F4) + Official Lumail Lockup
    drawBackground(ctx, t, false, W * 0.5, H * 0.45, 0.11);

    const localT = t - 2.2;
    const markEnter = spring(norm(localT, 0.0, 0.75), 7.5, 10);
    const wordEnter = easeOutQuart(norm(localT, 0.28, 0.95));
    const subEnter = easeOutCubic(norm(localT, 0.65, 1.35));
    const badgeEnter = easeOutBack(norm(localT, 0.95, 1.55));
    const exit = easeInOutCubic(norm(t, 4.6, 5.0));

    ctx.save();
    ctx.translate(0, -exit * 60);
    ctx.globalAlpha = 1 - exit;

    // Top Peach Kicker Pill
    ctx.save();
    ctx.globalAlpha *= badgeEnter;
    ctx.translate(0, (1 - badgeEnter) * -18);
    const kicker = "THE AI-NATIVE EMAIL PLATFORM";
    ctx.font = `600 18px "Geist Mono"`;
    const kw = ctx.measureText(kicker).width + 44;
    fillRoundRect(ctx, (W - kw) / 2, 260, kw, 44, 22, C.peach);
    strokeRoundRect(ctx, (W - kw) / 2, 260, kw, 44, 22, "rgba(255,51,0,0.2)", 1.5);
    ctx.fillStyle = C.ember;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(kicker, W / 2, 283);
    ctx.restore();

    // Official Lumail Lockup (Flare tile + Plus Jakarta Sans 600 wordmark)
    ctx.save();
    ctx.translate(W / 2, 460);
    ctx.scale(markEnter, markEnter);
    drawLumailLockup(ctx, 0, 0, 148, false, true, wordEnter);
    ctx.restore();

    // Tagline in Inter & Geist
    ctx.save();
    ctx.globalAlpha *= subEnter;
    ctx.translate(0, (1 - subEnter) * 28);
    ctx.textAlign = "center";
    ctx.font = `600 48px "Inter"`;
    ctx.fillStyle = C.ink;
    ctx.fillText("Newsletters, automations, and transactional email.", W / 2, 635);

    ctx.font = `400 28px "Geist"`;
    ctx.fillStyle = C.mutedInk;
    ctx.fillText(
      "One verified domain. Operated by you—or your AI agent.",
      W / 2,
      695
    );

    // Three pillar badges at bottom
    const pillars = [
      "139 MCP Tools",
      "Unlimited Subscribers",
      "Same-Domain Transactional",
    ];
    const spacing = 390;
    pillars.forEach((p, idx) => {
      const itemP = easeOutBack(norm(localT, 1.05 + idx * 0.12, 1.6 + idx * 0.12));
      const px = W / 2 + (idx - 1) * spacing;
      const py = 795 + (1 - itemP) * 25;
      ctx.save();
      ctx.globalAlpha *= itemP;
      drawCard(ctx, px - 175, py - 28, 350, 56, 28, C.white, C.paperBorder, 0.06, 10, 24);
      ctx.fillStyle = C.flare;
      ctx.beginPath();
      ctx.arc(px - 140, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `500 20px "Geist"`;
      ctx.fillStyle = C.ink;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p, px - 120, py + 1);
      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }
}

// ============================================================================
// ACT II (5.0s - 10.5s): Migrate in < 10 Minutes via MCP
// ============================================================================
function renderAct2(ctx, t) {
  const localT = t - 5.0;
  drawBackground(ctx, t, false, W * 0.72, H * 0.55, 0.08);
  drawTopBrandBar(ctx, t, false, "01", "INSTANT MIGRATION");

  const enter = easeOutCubic(norm(localT, 0.0, 0.55));
  const exit = easeInOutCubic(norm(localT, 5.1, 5.5));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 35 - exit * 45);

  // Left Column: Editorial Headline + Competitor Migration Pills
  const leftX = 110;
  drawPill(ctx, leftX, 170, "MIGRATE IN UNDER 10 MINUTES", C.peach, C.ember, null, 17, 18, 9);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 64px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Paste one prompt.", leftX, 295);
  ctx.fillStyle = C.flare;
  ctx.fillText("Move your entire list.", leftX, 372);

  ctx.font = `400 25px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("Contacts, tags, custom fields, and sequences", leftX, 438);
  ctx.fillText("imported automatically from 11 platforms:", leftX, 474);

  const platforms = [
    "Mailchimp",
    "Kit",
    "beehiiv",
    "Brevo",
    "MailerLite",
    "Substack",
    "ActiveCampaign",
    "Resend",
  ];
  platforms.forEach((plat, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const px = leftX + col * 182;
    const py = 525 + row * 64;
    const pp = easeOutBack(norm(localT, 0.35 + i * 0.07, 0.8 + i * 0.07));
    const isHighlight = plat === "Mailchimp" || plat === "beehiiv" || plat === "Kit";
    ctx.save();
    ctx.globalAlpha *= pp;
    ctx.translate(0, (1 - pp) * 16);
    drawCard(
      ctx,
      px,
      py,
      168,
      48,
      12,
      isHighlight ? C.wash : C.white,
      isHighlight ? C.coral : C.paperBorder,
      0.04,
      6,
      16
    );
    ctx.font = `500 18px "Geist"`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(plat, px + 84, py + 25);
    ctx.restore();
  });

  // 3-step summary strip on bottom-left
  const steps = [
    { num: "01", text: "Connect Claude Code or Codex" },
    { num: "02", text: "Paste the migration prompt" },
    { num: "03", text: "Ready to send in 8 minutes" },
  ];
  steps.forEach((st, i) => {
    const sp = easeOutCubic(norm(localT, 0.9 + i * 0.2, 1.4 + i * 0.2));
    const sy = 695 + i * 68;
    ctx.save();
    ctx.globalAlpha *= sp;
    ctx.translate((1 - sp) * -20, 0);
    fillRoundRect(ctx, leftX, sy, 48, 48, 12, i === 2 ? C.flare : C.ink);
    ctx.font = `600 18px "Geist Mono"`;
    ctx.fillStyle = C.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.num, leftX + 24, sy + 25);

    ctx.font = `500 22px "Geist"`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.fillText(st.text, leftX + 68, sy + 25);
    ctx.restore();
  });

  // Right Column: Live Dark Terminal Window (`lumail · MCP`)
  const termX = 930;
  const termY = 175;
  const termW = 880;
  const termH = 740;
  drawCard(ctx, termX, termY, termW, termH, 24, C.void, C.voidBorder, 0.22, 28, 65);

  // Terminal Header
  fillRoundRect(ctx, termX, termY, termW, 62, 24, "#12151A");
  ctx.fillStyle = "#12151A";
  ctx.fillRect(termX, termY + 38, termW, 24);
  ctx.strokeStyle = C.voidBorder;
  ctx.beginPath();
  ctx.moveTo(termX, termY + 62);
  ctx.lineTo(termX + termW, termY + 62);
  ctx.stroke();

  // Traffic dots
  ["#FF5F56", "#FFBD2E", "#27C93F"].forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(termX + 34 + idx * 24, termY + 31, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = `500 17px "Geist Mono"`;
  ctx.fillStyle = C.mutedVoid;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("claude-code — lumail-mcp · 139 tools connected", termX + termW / 2, termY + 31);

  // Terminal Content
  const padX = termX + 44;
  let curY = termY + 115;

  // Typed prompt
  const promptStr = "> migrate everything from Mailchimp to Lumail";
  const typedLen = Math.floor(clamp(norm(localT, 0.45, 1.45)) * promptStr.length);
  const visiblePrompt = promptStr.slice(0, typedLen);

  ctx.textAlign = "left";
  ctx.font = `600 23px "Geist Mono"`;
  ctx.fillStyle = C.paper;
  ctx.fillText(visiblePrompt, padX, curY);

  if (localT < 1.6 && Math.floor(localT * 8) % 2 === 0) {
    const pw = ctx.measureText(visiblePrompt).width;
    ctx.fillStyle = C.flare;
    ctx.fillRect(padX + pw + 6, curY - 18, 12, 26);
  }

  // MCP tool calls with animated counters
  const mcpCalls = [
    {
      start: 1.55,
      tool: "lumail - import_subscribers (MCP)",
      countTarget: 12847,
      suffix: " contacts imported · $0 list fee",
      color: C.green,
    },
    {
      start: 2.35,
      tool: "lumail - import_tags (MCP)",
      countTarget: 14,
      suffix: " audience tags & segments mapped",
      color: C.blue,
    },
    {
      start: 3.1,
      tool: "lumail - import_sequences (MCP)",
      countTarget: 3,
      suffix: " automated workflows converted",
      color: C.purple,
    },
  ];

  curY += 68;
  mcpCalls.forEach((call) => {
    if (localT >= call.start) {
      const cp = easeOutCubic(norm(localT, call.start, call.start + 0.55));
      const countP = easeOutQuart(norm(localT, call.start + 0.15, call.start + 0.75));
      const val = Math.round(call.countTarget * countP).toLocaleString("en-US");

      ctx.save();
      ctx.globalAlpha *= cp;
      ctx.translate(0, (1 - cp) * 14);

      // Tool bullet
      ctx.fillStyle = C.flare;
      ctx.beginPath();
      ctx.arc(padX + 10, curY - 6, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `600 21px "Geist Mono"`;
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(call.tool, padX + 30, curY);

      // Sub-line result box
      fillRoundRect(ctx, padX + 28, curY + 20, termW - 115, 58, 12, "#14181F");
      strokeRoundRect(ctx, padX + 28, curY + 20, termW - 115, 58, 12, "#242A35", 1);

      ctx.font = `600 22px "Geist Mono"`;
      ctx.fillStyle = call.color;
      ctx.fillText(`⎿  ${val}`, padX + 48, curY + 56);
      const vw = ctx.measureText(`⎿  ${val}`).width;
      ctx.font = `400 20px "Geist Mono"`;
      ctx.fillStyle = "#A0AEC0";
      ctx.fillText(call.suffix, padX + 48 + vw, curY + 56);

      ctx.restore();
      curY += 132;
    }
  });

  // Final status banner inside terminal
  if (localT >= 3.85) {
    const dp = easeOutBack(norm(localT, 3.85, 4.35));
    ctx.save();
    ctx.globalAlpha *= dp;
    ctx.translate(0, (1 - dp) * 18);
    fillRoundRect(ctx, padX, termY + termH - 118, termW - 88, 74, 16, "rgba(0, 201, 81, 0.12)");
    strokeRoundRect(ctx, padX, termY + termH - 118, termW - 88, 74, 16, "rgba(0, 201, 81, 0.4)", 1.5);

    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(padX + 34, termY + termH - 81, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `600 23px "Geist Mono"`;
    ctx.fillStyle = C.white;
    ctx.fillText("Done. Ready in 8 minutes. SPF, DKIM & DMARC verified.", padX + 60, termY + termH - 74);
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// ACT III (10.5s - 16.0s): Write the Email, Not the Layout (Visual Editor)
// ============================================================================
function renderAct3(ctx, t) {
  const localT = t - 10.5;
  drawBackground(ctx, t, false, W * 0.35, H * 0.5, 0.08);
  drawTopBrandBar(ctx, t, false, "02", "INBOX-NATIVE EDITOR");

  const enter = easeOutCubic(norm(localT, 0.0, 0.55));
  const exit = easeInOutCubic(norm(localT, 5.1, 5.5));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 35 - exit * 45);

  // Header centered
  ctx.textAlign = "center";
  ctx.font = `600 58px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Write the email, not the layout.", W / 2, 162);

  ctx.font = `400 24px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText(
    "Type like a document. Variables, conditional blocks, and an inbox preview—AI tightens without rewriting your voice.",
    W / 2,
    210
  );

  // Main Editor Canvas Card
  const edX = 140;
  const edY = 250;
  const edW = 1080;
  const edH = 730;
  drawCard(ctx, edX, edY, edW, edH, 24, C.white, C.paperBorder, 0.1, 24, 55);

  // Editor Top Bar (Subject, From, HTML + Plain-Text toggle)
  fillRoundRect(ctx, edX, edY, edW, 88, 24, "#FAF9F6");
  ctx.fillStyle = "#FAF9F6";
  ctx.fillRect(edX, edY + 60, edW, 28);
  ctx.strokeStyle = C.paperBorder;
  ctx.beginPath();
  ctx.moveTo(edX, edY + 88);
  ctx.lineTo(edX + edW, edY + 88);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = `500 17px "Geist Mono"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("FROM: melvyn@lumail.io    ·    SUBJECT: Why we dropped per-subscriber pricing", edX + 36, edY + 50);

  drawPill(ctx, edX + edW - 255, edY + 26, "HTML + Plain-text ✓", C.wash, C.ember, C.peach, 15, 16, 8);

  // Document Body inside Editor
  const bodyX = edX + 72;
  let bodyY = edY + 150;

  // Brand Header inside email (5/5 Branding Check)
  drawLumailMark(ctx, bodyX, bodyY - 28, 34);
  ctx.font = `600 22px "Plus Jakarta Sans"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Lumail", bodyX + 46, bodyY - 4);

  // Variable token tag (@org-name)
  drawPill(ctx, bodyX + 135, bodyY - 26, "@org-name", "rgba(0,201,81,0.12)", "#00993D", "rgba(0,201,81,0.3)", 15, 12, 5);

  bodyY += 56;
  ctx.font = `500 26px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Hey", bodyX, bodyY);
  drawPill(ctx, bodyX + 58, bodyY - 26, "{{first_name}}", "rgba(43,127,255,0.12)", C.blue, "rgba(43,127,255,0.3)", 18, 14, 5);
  ctx.fillStyle = C.ink;
  ctx.fillText(",", bodyX + 225, bodyY);

  bodyY += 55;
  // Paragraph that gets tightened by AI at localT = 2.0s
  const tightenP = easeInOutCubic(norm(localT, 2.0, 2.75));

  if (tightenP < 0.5) {
    const fadeOut = 1 - tightenP * 2;
    ctx.save();
    ctx.globalAlpha *= fadeOut;
    // Highlight selection box as AI tightens
    if (localT > 1.2) {
      const selP = easeOutCubic(norm(localT, 1.2, 1.8));
      fillRoundRect(ctx, bodyX - 10, bodyY - 30, 880 * selP, 92, 10, "rgba(255, 51, 0, 0.08)");
    }
    ctx.font = `400 23px "Geist"`;
    ctx.fillStyle = C.mutedInk;
    ctx.fillText("We used to pay $190/month just to store contacts who hadn't opened an", bodyX, bodyY);
    ctx.fillText("email since last autumn. So we built an email tool that only bills when you send.", bodyX, bodyY + 38);
    ctx.restore();
  } else {
    const fadeIn = (tightenP - 0.5) * 2;
    ctx.save();
    ctx.globalAlpha *= fadeIn;
    fillRoundRect(ctx, bodyX - 10, bodyY - 30, 880, 84, 10, "rgba(255, 227, 217, 0.45)");
    ctx.font = `500 25px "Geist"`;
    ctx.fillStyle = C.ink;
    ctx.fillText("Dormant subscribers cost you $0. Your bill only moves when you hit send.", bodyX, bodyY + 4);
    ctx.font = `400 21px "Geist"`;
    ctx.fillStyle = C.ember;
    ctx.fillText("✦ Tightened by AI · Kept your exact tone", bodyX, bodyY + 40);
    ctx.restore();
  }

  // Conditional Block inside Editor
  bodyY += 125;
  const condP = easeOutBack(norm(localT, 1.1, 1.7));
  ctx.save();
  ctx.globalAlpha *= condP;
  ctx.translate(0, (1 - condP) * 20);
  fillRoundRect(ctx, bodyX - 12, bodyY, 910, 130, 16, "#FAF8F5");
  strokeRoundRect(ctx, bodyX - 12, bodyY, 910, 130, 16, "rgba(173, 70, 255, 0.35)", 1.5);
  drawPill(ctx, bodyX + 12, bodyY + 16, "if subscriber.tag == 'saas-founder'", "rgba(173,70,255,0.12)", C.purple, null, 15, 14, 6);
  ctx.font = `400 21px "Geist"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Point your app at smtp.lumail.io:587 — OTPs and receipts ship on the priority lane.", bodyX + 16, bodyY + 86);
  ctx.restore();

  // CTA Button inside Editor
  bodyY += 165;
  fillRoundRect(ctx, bodyX, bodyY, 270, 56, 14, C.flare);
  ctx.font = `600 20px "Geist"`;
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Try Lumail free →", bodyX + 135, bodyY + 29);

  // Right Side Panel: Deliverability & Clear Branding Score (5/5)
  const sideX = 1260;
  const sideY = 250;
  const sideW = 520;
  const sideH = 730;
  drawCard(ctx, sideX, sideY, sideW, sideH, 24, C.white, C.paperBorder, 0.09, 20, 48);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 20px "Geist Mono"`;
  ctx.fillStyle = C.ember;
  ctx.fillText("DELIVERABILITY CHECKER", sideX + 38, sideY + 58);

  // Big Sender Health Score Ring
  const scoreP = easeOutQuart(norm(localT, 0.6, 2.2));
  const scoreVal = Math.round(99 * scoreP);
  const ringCX = sideX + 115;
  const ringCY = sideY + 165;
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#EFECE6";
  ctx.beginPath();
  ctx.arc(ringCX, ringCY, 56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = C.green;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(ringCX, ringCY, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (scoreVal / 100));
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 34px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText(`${scoreVal}`, ringCX, ringCY + 2);

  ctx.textAlign = "left";
  ctx.font = `600 26px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Inbox-ready draft", sideX + 195, ringCY - 14);
  ctx.font = `400 19px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("Human vs. bot open filtering active", sideX + 195, ringCY + 18);

  // Checklist items inside right panel
  const checks = [
    { label: "Clear Branding (@org-name)", badge: "5/5", delay: 0.9 },
    { label: "SPF, DKIM & DMARC aligned", badge: "PASS", delay: 1.2 },
    { label: "RFC 8058 1-click unsubscribe", badge: "PASS", delay: 1.5 },
    { label: "Plain-text fallback synced", badge: "PASS", delay: 1.8 },
    { label: "Apple Mail & Gmail bot filter", badge: "ON", delay: 2.1 },
  ];

  checks.forEach((chk, idx) => {
    const cp = easeOutBack(norm(localT, chk.delay, chk.delay + 0.45));
    const cy = sideY + 265 + idx * 84;
    ctx.save();
    ctx.globalAlpha *= cp;
    ctx.translate((1 - cp) * 20, 0);
    fillRoundRect(ctx, sideX + 34, cy, sideW - 68, 66, 14, "#FAF9F6");
    strokeRoundRect(ctx, sideX + 34, cy, sideW - 68, 66, 14, C.paperBorder, 1);

    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(sideX + 64, cy + 33, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 14px "Geist Mono"`;
    ctx.fillStyle = C.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓", sideX + 64, cy + 34);

    ctx.textAlign = "left";
    ctx.font = `500 19px "Geist"`;
    ctx.fillStyle = C.ink;
    ctx.fillText(chk.label, sideX + 90, cy + 34);

    drawPill(ctx, sideX + sideW - 125, cy + 16, chk.badge, "rgba(0,201,81,0.14)", "#008A36", null, 15, 14, 5);
    ctx.restore();
  });

  ctx.restore();
}

// ============================================================================
// ACT IV (16.0s - 22.0s): AI Agents & 139 Organization-Scoped MCP Tools
// ============================================================================
function renderAct4(ctx, t) {
  const localT = t - 16.0;
  drawBackground(ctx, t, true, W * 0.5, H * 0.48, 0.12);
  drawTopBrandBar(ctx, t, true, "03", "139 ORGANIZATION-SCOPED MCP TOOLS");

  const enter = easeOutCubic(norm(localT, 0.0, 0.55));
  const exit = easeInOutCubic(norm(localT, 5.55, 6.0));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 35 - exit * 45);

  // Header
  ctx.textAlign = "center";
  ctx.font = `600 58px "Inter"`;
  ctx.fillStyle = C.paper;
  ctx.fillText("Connect the AI agent you already use.", W / 2, 155);

  ctx.font = `400 24px "Geist"`;
  ctx.fillStyle = C.mutedVoid;
  ctx.fillText(
    "OAuth 2.1 organization-scoped access. No API token to copy. Your agent drafts, segments, and schedules.",
    W / 2,
    205
  );

  // 5 Agent Surface Cards across top row
  const agents = [
    { name: "Claude Code", sub: "lumail.io/claude-code", tag: "OAuth Plugin" },
    { name: "Codex", sub: "lumail.io/codex", tag: "CLI + App" },
    { name: "ChatGPT", sub: "lumail.io/chatgpt", tag: "Safe Write / Read" },
    { name: "Cursor & MCP", sub: "lumail.io/mcp", tag: "139 Tools" },
    { name: "Lumail CLI", sub: "lumail.io/cli", tag: "Terminal + Skills" },
  ];

  const cardW = 316;
  const gap = 24;
  const startX = (W - (agents.length * cardW + (agents.length - 1) * gap)) / 2;

  agents.forEach((ag, idx) => {
    const ap = easeOutBack(norm(localT, 0.2 + idx * 0.08, 0.75 + idx * 0.08));
    const ax = startX + idx * (cardW + gap);
    const ay = 248 + (1 - ap) * 24;
    const isActive = idx === 0 || idx === 3;

    ctx.save();
    ctx.globalAlpha *= ap;
    drawCard(
      ctx,
      ax,
      ay,
      cardW,
      138,
      18,
      isActive ? "#171A21" : C.voidCard,
      isActive ? C.flare : C.voidBorder,
      0.25,
      14,
      32
    );

    drawPill(
      ctx,
      ax + 22,
      ay + 18,
      ag.tag,
      isActive ? "rgba(255,51,0,0.18)" : "rgba(255,255,255,0.06)",
      isActive ? C.coral : "#A0AEC0",
      null,
      13,
      12,
      5
    );

    ctx.textAlign = "left";
    ctx.font = `600 24px "Inter"`;
    ctx.fillStyle = C.white;
    ctx.fillText(ag.name, ax + 22, ay + 84);

    ctx.font = `400 16px "Geist Mono"`;
    ctx.fillStyle = C.mutedVoid;
    ctx.fillText(ag.sub, ax + 22, ay + 114);
    ctx.restore();
  });

  // Live Agent Execution Console below (exact real workflow from lumail.io landing page)
  const conX = 120;
  const conY = 425;
  const conW = W - 240;
  const conH = 560;
  drawCard(ctx, conX, conY, conW, conH, 24, "#0D1014", "#242933", 0.3, 28, 70);

  // Header bar inside console
  fillRoundRect(ctx, conX, conY, conW, 58, 24, "#14181F");
  ctx.fillStyle = "#14181F";
  ctx.fillRect(conX, conY + 34, conW, 24);

  ctx.textAlign = "left";
  ctx.font = `600 17px "Geist Mono"`;
  ctx.fillStyle = C.coral;
  ctx.fillText("● claude  lumail · 139 tools", conX + 32, conY + 35);

  ctx.textAlign = "right";
  ctx.fillStyle = C.mutedVoid;
  ctx.fillText("scope: lumail.read + lumail.write · org: codelynx", conX + conW - 32, conY + 35);

  // Prompt
  const qPrompt = '> who clicked the pricing link but never bought? Enrol them in Objections.';
  const qLen = Math.floor(clamp(norm(localT, 0.7, 1.7)) * qPrompt.length);
  ctx.textAlign = "left";
  ctx.font = `600 24px "Geist Mono"`;
  ctx.fillStyle = C.white;
  ctx.fillText(qPrompt.slice(0, qLen), conX + 44, conY + 112);

  // Three horizontal tool execution cards that cascade across the console
  const steps = [
    {
      t0: 1.75,
      fn: "query_subscribers (MCP)",
      arg: 'clicked: "/pricing", purchased: false',
      stat: "312 subscribers matched",
      badge: "READ",
      col: C.blue,
    },
    {
      t0: 2.55,
      fn: "bulk_add_tags (MCP)",
      arg: 'tags: ["hot-lead"]',
      stat: "312 contacts tagged",
      badge: "TAGGED",
      col: C.amber,
    },
    {
      t0: 3.35,
      fn: "add_subscriber_to_workflow",
      arg: 'workflow: "Objections"',
      stat: "312 enrolled · sends in 2h",
      badge: "ENROLLED",
      col: C.green,
    },
  ];

  const stepW = 505;
  const stepGap = 32;
  steps.forEach((st, idx) => {
    if (localT >= st.t0) {
      const sp = easeOutBack(norm(localT, st.t0, st.t0 + 0.55));
      const sx = conX + 44 + idx * (stepW + stepGap);
      const sy = conY + 155 + (1 - sp) * 24;

      ctx.save();
      ctx.globalAlpha *= sp;
      drawCard(ctx, sx, sy, stepW, 255, 18, "#141922", "#262F3F", 0.2, 12, 28);

      drawPill(ctx, sx + 24, sy + 22, `⏺ ${st.badge}`, "rgba(255,255,255,0.06)", st.col, null, 14, 14, 6);

      ctx.textAlign = "left";
      ctx.font = `600 21px "Geist Mono"`;
      ctx.fillStyle = C.white;
      ctx.fillText(st.fn, sx + 24, sy + 95);

      ctx.font = `400 17px "Geist Mono"`;
      ctx.fillStyle = "#8B949E";
      ctx.fillText(st.arg, sx + 24, sy + 132);

      fillRoundRect(ctx, sx + 24, sy + 168, stepW - 48, 58, 12, "#0E1218");
      ctx.font = `600 20px "Geist Mono"`;
      ctx.fillStyle = st.col;
      ctx.fillText(`⎿  ${st.stat}`, sx + 42, sy + 204);

      ctx.restore();
    }
  });

  // Final confirmation strip inside console
  if (localT >= 4.05) {
    const fp = easeOutCubic(norm(localT, 4.05, 4.55));
    ctx.save();
    ctx.globalAlpha *= fp;
    fillRoundRect(ctx, conX + 44, conY + 448, conW - 88, 76, 16, "rgba(255, 51, 0, 0.14)");
    strokeRoundRect(ctx, conX + 44, conY + 448, conW - 88, 76, 16, C.flare, 1.5);
    ctx.font = `600 22px "Geist Mono"`;
    ctx.fillStyle = C.white;
    ctx.textAlign = "left";
    ctx.fillText(
      "⏺ Done. The first email goes out in 2 hours. You keep the last click.",
      conX + 74,
      conY + 494
    );
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// ACT V (22.0s - 27.5s): Visual Workflows That Keep Running
// ============================================================================
function renderAct5(ctx, t) {
  const localT = t - 22.0;
  drawBackground(ctx, t, false, W * 0.5, H * 0.55, 0.08);
  drawTopBrandBar(ctx, t, false, "04", "VISUAL WORKFLOW AUTOMATION");

  const enter = easeOutCubic(norm(localT, 0.0, 0.55));
  const exit = easeInOutCubic(norm(localT, 5.1, 5.5));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 35 - exit * 45);

  ctx.textAlign = "center";
  ctx.font = `600 58px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Sequences that keep running.", W / 2, 160);

  ctx.font = `400 24px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText(
    "Triggers, waits, conditional branches, A/B steps, webhooks, and conversion goals—unlimited on every plan.",
    W / 2,
    208
  );

  // Workflow Canvas Container
  const wfX = 120;
  const wfY = 250;
  const wfW = W - 240;
  const wfH = 730;
  drawCard(ctx, wfX, wfY, wfW, wfH, 26, C.white, C.paperBorder, 0.09, 24, 55);

  // Subtle dot matrix inside workflow builder
  ctx.fillStyle = "rgba(26,22,20,0.08)";
  for (let gx = wfX + 40; gx < wfX + wfW - 20; gx += 36) {
    for (let gy = wfY + 40; gy < wfY + wfH - 20; gy += 36) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Animated Connector Lines & Travelling Pulse Packets
  const drawConnector = (x1, y1, x2, y2, progress, color = C.ink) => {
    if (progress <= 0) return;
    ctx.save();
    ctx.strokeStyle = "#D5CFC7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const midX = (x1 + x2) / 2;
    ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
    ctx.stroke();

    // Active progress stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([800, 800]);
    ctx.lineDashOffset = 800 * (1 - progress);
    ctx.stroke();
    ctx.restore();
  };

  // Node coordinates (horizontal flow left-to-right)
  const n1 = { x: 185, y: 535, w: 280, h: 130 };
  const n2 = { x: 545, y: 535, w: 300, h: 130 };
  const n3 = { x: 925, y: 535, w: 250, h: 130 };
  const n4 = { x: 1255, y: 375, w: 460, h: 145 }; // YES branch
  const n5 = { x: 1255, y: 675, w: 460, h: 145 }; // NO branch

  drawConnector(n1.x + n1.w, n1.y + 65, n2.x, n2.y + 65, easeOutCubic(norm(localT, 0.5, 1.1)), C.flare);
  drawConnector(n2.x + n2.w, n2.y + 65, n3.x, n3.y + 65, easeOutCubic(norm(localT, 1.1, 1.7)), C.flare);
  drawConnector(n3.x + n3.w, n3.y + 45, n4.x, n4.y + 72, easeOutCubic(norm(localT, 1.8, 2.5)), C.green);
  drawConnector(n3.x + n3.w, n3.y + 85, n5.x, n5.y + 72, easeOutCubic(norm(localT, 2.0, 2.7)), C.amber);

  // Node 1: Trigger
  const pN1 = easeOutBack(norm(localT, 0.2, 0.7));
  ctx.save();
  ctx.globalAlpha *= pN1;
  drawCard(ctx, n1.x, n1.y, n1.w, n1.h, 18, C.wash, C.coral, 0.08, 10, 24);
  drawPill(ctx, n1.x + 20, n1.y + 18, "TRIGGER", C.flare, C.white, null, 13, 12, 4);
  ctx.textAlign = "left";
  ctx.font = `600 22px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Tag added: newsletter", n1.x + 20, n1.y + 78);
  ctx.font = `400 16px "Geist Mono"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("4,820 enrolled", n1.x + 20, n1.y + 108);
  ctx.restore();

  // Node 2: Send Email
  const pN2 = easeOutBack(norm(localT, 0.75, 1.25));
  ctx.save();
  ctx.globalAlpha *= pN2;
  drawCard(ctx, n2.x, n2.y, n2.w, n2.h, 18, C.white, C.paperBorder, 0.08, 10, 24);
  drawPill(ctx, n2.x + 20, n2.y + 18, "SEND EMAIL · A/B", C.peach, C.ember, null, 13, 12, 4);
  ctx.textAlign = "left";
  ctx.font = `600 22px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Welcome, start here", n2.x + 20, n2.y + 78);
  ctx.font = `400 16px "Geist Mono"`;
  ctx.fillStyle = C.green;
  ctx.fillText("68.4% human open rate", n2.x + 20, n2.y + 108);
  ctx.restore();

  // Node 3: Wait + Condition
  const pN3 = easeOutBack(norm(localT, 1.3, 1.8));
  ctx.save();
  ctx.globalAlpha *= pN3;
  drawCard(ctx, n3.x, n3.y, n3.w, n3.h, 18, C.ink, C.ink, 0.12, 12, 28);
  drawPill(ctx, n3.x + 20, n3.y + 18, "WAIT 2 DAYS", "rgba(255,255,255,0.12)", C.peach, null, 13, 12, 4);
  ctx.textAlign = "left";
  ctx.font = `600 21px "Inter"`;
  ctx.fillStyle = C.white;
  ctx.fillText("Opened welcome?", n3.x + 20, n3.y + 78);
  ctx.font = `400 15px "Geist Mono"`;
  ctx.fillStyle = C.coral;
  ctx.fillText("Branch on human open", n3.x + 20, n3.y + 108);
  ctx.restore();

  // Node 4: YES Branch
  const pN4 = easeOutBack(norm(localT, 2.0, 2.55));
  ctx.save();
  ctx.globalAlpha *= pN4;
  drawCard(ctx, n4.x, n4.y, n4.w, n4.h, 18, C.white, "rgba(0,201,81,0.45)", 0.08, 10, 24);
  drawPill(ctx, n4.x + 22, n4.y + 18, "YES · OPENED (3,296)", "rgba(0,201,81,0.14)", "#008A36", null, 14, 14, 5);
  ctx.textAlign = "left";
  ctx.font = `600 23px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Send: Founder Story + Case Study", n4.x + 22, n4.y + 84);
  ctx.font = `400 17px "Geist Mono"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("Goal: Upgraded to Creator → Exit sequence", n4.x + 22, n4.y + 118);
  ctx.restore();

  // Node 5: NO Branch
  const pN5 = easeOutBack(norm(localT, 2.2, 2.75));
  ctx.save();
  ctx.globalAlpha *= pN5;
  drawCard(ctx, n5.x, n5.y, n5.w, n5.h, 18, C.white, "rgba(242,106,75,0.45)", 0.08, 10, 24);
  drawPill(ctx, n5.x + 22, n5.y + 18, "NO · NOT YET (1,524)", C.peach, C.ember, null, 14, 14, 5);
  ctx.textAlign = "left";
  ctx.font = `600 23px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Send: Quick plain-text check-in", n5.x + 22, n5.y + 84);
  ctx.font = `400 17px "Geist Mono"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("Webhook: POST /api/crm/nudge", n5.x + 22, n5.y + 118);
  ctx.restore();

  // Top workflow stats bar inside canvas
  fillRoundRect(ctx, wfX + 40, wfY + 32, wfW - 80, 62, 14, "#FAF9F6");
  strokeRoundRect(ctx, wfX + 40, wfY + 32, wfW - 80, 62, 14, C.paperBorder, 1);
  ctx.textAlign = "left";
  ctx.font = `600 18px "Geist Mono"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("WORKFLOW: Welcome & Onboarding Sequence", wfX + 68, wfY + 69);

  ctx.textAlign = "right";
  ctx.fillStyle = C.green;
  ctx.fillText("● LIVE · 99.4% DELIVERED · $14,280 ATTRIBUTED REVENUE", wfX + wfW - 68, wfY + 69);

  ctx.restore();
}

// ============================================================================
// ACT VI (27.5s - 33.0s): Transactional Email — Same Domain, Priority Lane
// ============================================================================
function renderAct6(ctx, t) {
  const localT = t - 27.5;
  drawBackground(ctx, t, true, W * 0.28, H * 0.55, 0.11);
  drawTopBrandBar(ctx, t, true, "05", "TRANSACTIONAL PRIORITY LANE");

  const enter = easeOutCubic(norm(localT, 0.0, 0.55));
  const exit = easeInOutCubic(norm(localT, 5.1, 5.5));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 35 - exit * 45);

  // Headline
  ctx.textAlign = "left";
  ctx.font = `600 58px "Inter"`;
  ctx.fillStyle = C.paper;
  ctx.fillText("Replace Resend. Same domain.", 120, 165);

  ctx.font = `400 24px "Geist"`;
  ctx.fillStyle = C.mutedVoid;
  ctx.fillText(
    "Receipts, login codes, and your newsletter ship from one warmed domain. A 50,000-recipient broadcast never delays an OTP.",
    120,
    215
  );

  // Left Card: `send.ts` TypeScript SDK + SMTP Relay
  const codeX = 120;
  const codeY = 265;
  const codeW = 790;
  const codeH = 695;
  drawCard(ctx, codeX, codeY, codeW, codeH, 24, "#0D1015", "#242A34", 0.3, 24, 60);

  fillRoundRect(ctx, codeX, codeY, codeW, 56, 24, "#151921");
  ctx.fillStyle = "#151921";
  ctx.fillRect(codeX, codeY + 34, codeW, 22);
  ctx.font = `600 17px "Geist Mono"`;
  ctx.fillStyle = C.paper;
  ctx.fillText("send.ts — TypeScript SDK", codeX + 32, codeY + 35);
  drawPill(ctx, codeX + codeW - 285, codeY + 12, "smtp.lumail.io:587", "#1F2633", "#79C0FF", null, 14, 14, 5);

  const codeLines = [
    [{ t: "import ", c: "#FF7B72" }, { t: "{ Lumail } ", c: "#E2E8F0" }, { t: "from ", c: "#FF7B72" }, { t: '"lumail";', c: "#A5D6FF" }],
    [],
    [{ t: "const ", c: "#FF7B72" }, { t: "lumail = ", c: "#E2E8F0" }, { t: "new ", c: "#FF7B72" }, { t: "Lumail(process.env.LUMAIL_KEY);", c: "#D2A8FF" }],
    [],
    [{ t: "await ", c: "#FF7B72" }, { t: "lumail.emails.", c: "#E2E8F0" }, { t: "send", c: "#D2A8FF" }, { t: "({", c: "#E2E8F0" }],
    [{ t: '  to: ', c: "#79C0FF" }, { t: '"alex@acme.dev",', c: "#A5D6FF" }],
    [{ t: '  from: ', c: "#79C0FF" }, { t: '"auth@yourdomain.com",', c: "#A5D6FF" }],
    [{ t: '  subject: ', c: "#79C0FF" }, { t: '"Your login code: 849201",', c: "#A5D6FF" }],
    [{ t: '  content: ', c: "#79C0FF" }, { t: '"# Your code\\n\\n{{code}}",', c: "#A5D6FF" }],
    [{ t: "});", c: "#E2E8F0" }],
  ];

  ctx.font = `500 21px "Geist Mono"`;
  codeLines.forEach((line, idx) => {
    const lp = easeOutCubic(norm(localT, 0.25 + idx * 0.12, 0.65 + idx * 0.12));
    ctx.save();
    ctx.globalAlpha *= lp;
    const ly = codeY + 115 + idx * 42;
    ctx.fillStyle = "#4A5568";
    ctx.fillText(String(idx + 1).padStart(2, "0"), codeX + 32, ly);
    let lx = codeX + 82;
    line.forEach((tok) => {
      ctx.fillStyle = tok.c;
      ctx.fillText(tok.t, lx, ly);
      lx += ctx.measureText(tok.t).width;
    });
    ctx.restore();
  });

  // Status badge inside code editor
  if (localT >= 1.8) {
    const qp = easeOutBack(norm(localT, 1.8, 2.3));
    ctx.save();
    ctx.globalAlpha *= qp;
    fillRoundRect(ctx, codeX + 36, codeY + 575, codeW - 72, 82, 16, "rgba(0,201,81,0.12)");
    strokeRoundRect(ctx, codeX + 36, codeY + 575, codeW - 72, 82, 16, "rgba(0,201,81,0.4)", 1.5);
    ctx.font = `600 22px "Geist Mono"`;
    ctx.fillStyle = C.green;
    ctx.fillText("✓ queued · priority instant lane · 140ms delivery", codeX + 64, codeY + 623);
    ctx.restore();
  }

  // Right Side: Dual-Lane Visualizer (Priority Express Lane vs Bulk Campaign Lane)
  const laneX = 960;
  const laneY = 265;
  const laneW = 840;

  // Lane 1: Transactional Priority Lane
  drawCard(ctx, laneX, laneY, laneW, 330, 24, "#13171F", C.flare, 0.25, 20, 50);
  drawPill(ctx, laneX + 34, laneY + 28, "⚡ INSTANT PRIORITY LANE", "rgba(255,51,0,0.2)", C.coral, null, 15, 16, 6);

  ctx.textAlign = "left";
  ctx.font = `600 30px "Inter"`;
  ctx.fillStyle = C.white;
  ctx.fillText("OTP Login Codes, Receipts & Resets", laneX + 34, laneY + 106);

  // Express track animation
  fillRoundRect(ctx, laneX + 34, laneY + 145, laneW - 68, 74, 16, "#0B0D12");
  const packetPos = ((localT * 1.35) % 1);
  const px = laneX + 54 + packetPos * (laneW - 290);
  const grad = ctx.createLinearGradient(px - 80, 0, px + 180, 0);
  grad.addColorStop(0, "rgba(255,51,0,0)");
  grad.addColorStop(1, C.flare);
  fillRoundRect(ctx, px, laneY + 159, 190, 46, 12, grad);
  ctx.font = `600 17px "Geist Mono"`;
  ctx.fillStyle = C.white;
  ctx.fillText("OTP: 849201 →", px + 24, laneY + 188);

  ctx.font = `500 19px "Geist Mono"`;
  ctx.fillStyle = C.green;
  ctx.fillText("0ms queue wait  ·  Dedicated SES priority pool  ·  Same domain", laneX + 34, laneY + 275);

  // Lane 2: Marketing Broadcast Lane
  const lane2Y = laneY + 365;
  drawCard(ctx, laneX, lane2Y, laneW, 330, 24, "#11141B", "#252B37", 0.2, 16, 40);
  drawPill(ctx, laneX + 34, lane2Y + 28, "HIGH-THROUGHPUT BROADCAST LANE", "rgba(43,127,255,0.16)", "#79C0FF", null, 15, 16, 6);

  ctx.font = `600 30px "Inter"`;
  ctx.fillStyle = C.white;
  ctx.fillText("Weekly Newsletter — 50,000 Recipients", laneX + 34, lane2Y + 106);

  // Multi-packet steady stream
  fillRoundRect(ctx, laneX + 34, lane2Y + 145, laneW - 68, 74, 16, "#0B0D12");
  for (let k = 0; k < 4; k++) {
    const u = (localT * 0.35 + k * 0.25) % 1;
    const bx = laneX + 54 + u * (laneW - 240);
    fillRoundRect(ctx, bx, lane2Y + 161, 135, 42, 10, "rgba(43,127,255,0.28)");
    strokeRoundRect(ctx, bx, lane2Y + 161, 135, 42, 10, "#2B7FFF", 1);
    ctx.font = `500 15px "Geist Mono"`;
    ctx.fillStyle = "#A5D6FF";
    ctx.fillText(`Batch #${k + 1}`, bx + 24, lane2Y + 187);
  }

  ctx.font = `500 19px "Geist Mono"`;
  ctx.fillStyle = "#A0AEC0";
  ctx.fillText("Shared monthly quota  ·  One dashboard  ·  One predictable bill", laneX + 34, lane2Y + 275);

  ctx.restore();
}

// ============================================================================
// ACT VII (33.0s - 39.5s): Pricing That Doesn't Punish You
// ============================================================================
function renderAct7(ctx, t) {
  const localT = t - 33.0;
  drawBackground(ctx, t, false, W * 0.5, H * 0.4, 0.09);
  drawTopBrandBar(ctx, t, false, "06", "FAIR VOLUME PRICING");

  const enter = easeOutCubic(norm(localT, 0.0, 0.55));
  const exit = easeInOutCubic(norm(localT, 6.05, 6.5));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 35 - exit * 45);

  // Hero Pricing Statement
  ctx.font = `600 56px "Inter"`;
  const hPart1 = "You pay for emails sent. ";
  const hPart2 = "Never for subscribers stored.";
  const w1 = ctx.measureText(hPart1).width;
  const w2 = ctx.measureText(hPart2).width;
  const hStartX = (W - (w1 + w2)) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.fillText(hPart1, hStartX, 155);
  ctx.fillStyle = C.flare;
  ctx.fillText(hPart2, hStartX + w1, 155);
  ctx.textAlign = "center";

  ctx.font = `400 24px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText(
    "Import 50,000 contacts on Free if you want. Dormant subscribers cost $0. All 22 features unlocked on every plan.",
    W / 2,
    205
  );

  // Interactive Volume Slider Card
  const slX = 120;
  const slY = 245;
  const slW = W - 240;
  const slH = 195;
  drawCard(ctx, slX, slY, slW, slH, 24, C.white, C.paperBorder, 0.08, 16, 40);

  // Animate slider from Free (3K) -> Creator (40K) -> Pro (100K) -> locks back on Creator (40K, Best Match)
  let sliderPos = 0.38;
  if (localT < 1.8) {
    sliderPos = lerp(0.08, 0.38, easeOutCubic(norm(localT, 0.3, 1.6)));
  } else if (localT < 3.6) {
    sliderPos = lerp(0.38, 0.65, easeInOutCubic(norm(localT, 1.8, 3.2)));
  } else {
    sliderPos = lerp(0.65, 0.38, easeOutBack(norm(localT, 3.6, 4.4)));
  }

  const trackX = slX + 60;
  const trackY = slY + 118;
  const trackW = slW - 580;

  ctx.textAlign = "left";
  ctx.font = `600 22px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Monthly emails sent — Unlimited subscribers on every tier", trackX, slY + 56);

  // Track bar
  fillRoundRect(ctx, trackX, trackY - 6, trackW, 12, 6, "#EAE5DD");
  fillRoundRect(ctx, trackX, trackY - 6, trackW * sliderPos, 12, 6, C.flare);

  // Tick labels
  const stops = ["3K", "20K", "40K", "100K", "400K", "1M"];
  stops.forEach((lbl, idx) => {
    const sx = trackX + (idx / (stops.length - 1)) * trackW;
    ctx.font = `500 16px "Geist Mono"`;
    ctx.fillStyle = C.mutedInk;
    ctx.textAlign = "center";
    ctx.fillText(lbl, sx, trackY + 36);
  });

  // Thumb handle
  const thumbX = trackX + trackW * sliderPos;
  ctx.save();
  ctx.shadowColor = "rgba(255,51,0,0.35)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(thumbX, trackY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.flare;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();

  // Best Match Readout on right of slider card
  fillRoundRect(ctx, slX + slW - 450, slY + 28, 415, 138, 18, C.wash);
  strokeRoundRect(ctx, slX + slW - 450, slY + 28, 415, 138, 18, C.coral, 1.5);
  ctx.textAlign = "left";
  ctx.font = `600 15px "Geist Mono"`;
  ctx.fillStyle = C.ember;
  ctx.fillText("CHEAPEST PLAN FOR VOLUME", slX + slW - 420, slY + 62);
  ctx.font = `700 38px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText(sliderPos > 0.52 ? "Pro · $60/mo" : "Creator · $20/mo", slX + slW - 420, slY + 110);
  ctx.font = `500 18px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText("Unlimited contacts stored ($0)", slX + slW - 420, slY + 144);

  // 4 Official Plan Cards (Free, Creator, Pro, Business)
  const plans = [
    {
      name: "Free",
      price: "$0",
      vol: "3,000 emails/mo",
      over: "Pauses at limit · No card",
      subs: "Unlimited subscribers",
      domains: "1 sending domain · All 22 features",
      highlight: false,
    },
    {
      name: "Creator",
      price: "$20",
      vol: "40,000 emails/mo",
      over: "Then $0.70 / 1,000 emails",
      subs: "Unlimited subscribers",
      domains: "3 domains · BYO Claude/ChatGPT",
      highlight: true,
    },
    {
      name: "Pro",
      price: "$60",
      vol: "100,000 emails/mo",
      over: "Then $0.50 / 1,000 emails",
      subs: "Unlimited subscribers",
      domains: "10 domains · 25 team seats",
      highlight: false,
    },
    {
      name: "Business",
      price: "$200",
      vol: "400,000 emails/mo",
      over: "Then $0.40 / 1,000 emails",
      subs: "Unlimited subscribers",
      domains: "100 domains · 100 team seats",
      highlight: false,
    },
  ];

  const pW = 398;
  const pGap = 28;
  plans.forEach((pl, idx) => {
    const pp = easeOutBack(norm(localT, 0.35 + idx * 0.1, 0.9 + idx * 0.1));
    const px = 120 + idx * (pW + pGap);
    const py = 475 + (1 - pp) * 30;

    ctx.save();
    ctx.globalAlpha *= pp;
    drawCard(
      ctx,
      px,
      py,
      pW,
      490,
      24,
      pl.highlight ? C.ink : C.white,
      pl.highlight ? C.flare : C.paperBorder,
      pl.highlight ? 0.18 : 0.07,
      20,
      45
    );

    ctx.textAlign = "left";
    ctx.font = `600 26px "Inter"`;
    ctx.fillStyle = pl.highlight ? C.white : C.ink;
    ctx.fillText(pl.name, px + 34, py + 58);

    if (pl.highlight) {
      drawPill(ctx, px + pW - 165, py + 32, "MOST POPULAR", C.flare, C.white, null, 13, 14, 5);
    }

    ctx.font = `700 64px "Inter"`;
    ctx.fillStyle = pl.highlight ? C.white : C.ink;
    ctx.fillText(pl.price, px + 34, py + 145);
    const prW = ctx.measureText(pl.price).width;
    ctx.font = `400 20px "Geist"`;
    ctx.fillStyle = pl.highlight ? "#A0AEC0" : C.mutedInk;
    ctx.fillText("/month", px + 42 + prW, py + 145);

    // Divider
    ctx.strokeStyle = pl.highlight ? "#262B35" : C.paperBorder;
    ctx.beginPath();
    ctx.moveTo(px + 34, py + 185);
    ctx.lineTo(px + pW - 34, py + 185);
    ctx.stroke();

    // Bullets
    const bullets = [pl.vol, pl.subs, pl.over, pl.domains, "139 MCP tools + CLI + SDK"];
    bullets.forEach((b, bi) => {
      const by = py + 232 + bi * 48;
      ctx.fillStyle = C.flare;
      ctx.beginPath();
      ctx.arc(px + 44, by - 6, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = bi < 2 ? `600 19px "Geist"` : `400 18px "Geist"`;
      ctx.fillStyle = pl.highlight ? (bi < 2 ? C.white : "#CBD5E0") : bi < 2 ? C.ink : C.mutedInk;
      ctx.fillText(b, px + 64, by);
    });

    ctx.restore();
  });

  ctx.restore();
}

// ============================================================================
// ACT VIII (39.5s - 42.0s): Proven at Scale (3M+ Emails Sent & Founder Proof)
// ============================================================================
function renderAct8(ctx, t) {
  const localT = t - 39.5;
  drawBackground(ctx, t, false, W * 0.5, H * 0.5, 0.1);
  drawTopBrandBar(ctx, t, false, "07", "PROVEN AT SCALE");

  const enter = easeOutCubic(norm(localT, 0.0, 0.45));
  const exit = easeInOutCubic(norm(localT, 2.1, 2.5));

  ctx.save();
  ctx.globalAlpha = enter * (1 - exit);
  ctx.translate(0, (1 - enter) * 30 - exit * 40);

  ctx.textAlign = "center";
  drawPill(ctx, W / 2 - 175, 150, "BUILT FOR CREATORS & SAAS", C.peach, C.ember, null, 16, 20, 8);

  ctx.font = `700 84px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("3,000,000+ emails sent.", W / 2, 285);

  ctx.font = `400 26px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText(
    "Email for people who write, ship, and sell. Campaigns, sequences, and transactional on one domain.",
    W / 2,
    345
  );

  const quotes = [
    {
      quote:
        "“Lumail made me like email. It turned email from a side thing into the main marketing channel for my Linkhub business.”",
      author: "Yannis",
      role: "Founder, Linkhub",
    },
    {
      quote:
        "“I'm not a marketer, but email is powerful. Thanks to the Codex integration, Codex actually implements all the marketing for me.”",
      author: "Nicolas",
      role: "Indie Founder",
    },
    {
      quote:
        "“Now my agent reviews it, fixes it, and sends it for me. I've sent over 3 million emails with Lumail.”",
      author: "Melvyn",
      role: "Founder, Lumail.io · 3M+ emails sent",
    },
  ];

  const qW = 528;
  const qGap = 36;
  quotes.forEach((q, idx) => {
    const qp = easeOutBack(norm(localT, 0.2 + idx * 0.12, 0.75 + idx * 0.12));
    const qx = 124 + idx * (qW + qGap);
    const qy = 420 + (1 - qp) * 30;

    ctx.save();
    ctx.globalAlpha *= qp;
    drawCard(ctx, qx, qy, qW, 430, 24, C.white, idx === 2 ? C.coral : C.paperBorder, 0.08, 18, 45);

    // Wrap quote text
    ctx.textAlign = "left";
    ctx.font = `400 24px "Geist"`;
    ctx.fillStyle = C.ink;
    const words = q.quote.split(" ");
    let line = "";
    let ly = qy + 72;
    words.forEach((w) => {
      const test = line + w + " ";
      if (ctx.measureText(test).width > qW - 80) {
        ctx.fillText(line, qx + 40, ly);
        line = w + " ";
        ly += 38;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, qx + 40, ly);

    // Author footer
    ctx.fillStyle = C.flare;
    ctx.beginPath();
    ctx.arc(qx + 58, qy + 355, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 18px "Inter"`;
    ctx.fillStyle = C.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(q.author[0], qx + 58, qy + 356);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 22px "Inter"`;
    ctx.fillStyle = C.ink;
    ctx.fillText(q.author, qx + 92, qy + 350);
    ctx.font = `400 17px "Geist Mono"`;
    ctx.fillStyle = C.mutedInk;
    ctx.fillText(q.role, qx + 92, qy + 376);

    ctx.restore();
  });

  ctx.restore();
}

// ============================================================================
// ACT IX (42.0s - 45.0s): Iconic Closing CTA — "Import your list. Send tonight."
// ============================================================================
function renderAct9(ctx, t) {
  const localT = t - 42.0;
  drawBackground(ctx, t, false, W * 0.5, H * 0.48, 0.14);

  const lockupP = spring(norm(localT, 0.05, 0.8), 8, 10);
  const headP = easeOutQuart(norm(localT, 0.25, 0.9));
  const ctaP = easeOutBack(norm(localT, 0.5, 1.15));

  ctx.save();

  // Official Lumail Lockup
  ctx.save();
  ctx.translate(W / 2, 315);
  ctx.scale(lockupP, lockupP);
  drawLumailLockup(ctx, 0, 0, 128, false, true, 1);
  ctx.restore();

  // Signature Lumail Headline ("Import your list. Send tonight.")
  ctx.save();
  ctx.globalAlpha = headP;
  ctx.translate(0, (1 - headP) * 28);
  ctx.textAlign = "center";
  ctx.font = `700 82px "Inter"`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Import your list. Send tonight.", W / 2, 515);

  ctx.font = `400 29px "Geist"`;
  ctx.fillStyle = C.mutedInk;
  ctx.fillText(
    "You pay for emails sent. Never for subscribers stored.",
    W / 2,
    580
  );
  ctx.restore();

  // Single Filled Action Button in Flare (#FF3300) per Lumail brand guidelines
  ctx.save();
  ctx.globalAlpha = ctaP;
  ctx.translate(W / 2, 705 + (1 - ctaP) * 24);
  const pulse = 1 + 0.015 * Math.sin(localT * 5);
  ctx.scale(pulse, pulse);

  ctx.shadowColor = "rgba(255, 51, 0, 0.35)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  fillRoundRect(ctx, -260, -44, 520, 88, 44, C.flare);
  ctx.shadowColor = "transparent";

  ctx.font = `600 32px "Geist"`;
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Start free at lumail.io →", 0, 2);
  ctx.restore();

  // Sub-caption in Geist Mono
  ctx.save();
  ctx.globalAlpha = ctaP;
  ctx.textAlign = "center";
  ctx.font = `500 21px "Geist Mono"`;
  ctx.fillStyle = C.ink;
  ctx.fillText(
    "3,000 emails/month free  ·  No credit card  ·  139 MCP tools  ·  Unlimited subscribers",
    W / 2,
    835
  );
  ctx.restore();

  ctx.restore();
}

// Master Frame Dispatcher
function renderFrame(ctx, frameIndex) {
  const t = frameIndex / FPS;
  if (t < 5.0) {
    renderAct1(ctx, t);
  } else if (t < 10.5) {
    renderAct2(ctx, t);
  } else if (t < 16.0) {
    renderAct3(ctx, t);
  } else if (t < 22.0) {
    renderAct4(ctx, t);
  } else if (t < 27.5) {
    renderAct5(ctx, t);
  } else if (t < 33.0) {
    renderAct6(ctx, t);
  } else if (t < 39.5) {
    renderAct7(ctx, t);
  } else if (t < 42.0) {
    renderAct8(ctx, t);
  } else {
    renderAct9(ctx, t);
  }
}

async function main() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Save a few inspection keyframes if requested
  if (process.argv.includes("--preview")) {
    fs.mkdirSync("previews", { recursive: true });
    const sampleTimes = [1.0, 3.5, 8.2, 13.5, 19.8, 25.0, 30.5, 36.5, 40.8, 43.5];
    for (const sec of sampleTimes) {
      renderFrame(ctx, Math.floor(sec * FPS));
      fs.writeFileSync(`previews/frame-${sec.toFixed(1)}s.png`, canvas.toBuffer("image/png"));
    }
    console.log("Saved preview frames to previews/");
    return;
  }

  console.log(`Rendering ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps, ${W}x${H}) to video.mp4...`);

  const ffmpegArgs = [
    "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "-s", `${W}x${H}`,
    "-r", String(FPS),
    "-i", "pipe:0",
    "-i", "audio.wav",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "17",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-level", "4.2",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    "-t", String(DURATION),
    "video.mp4",
  ];

  const ff = spawn("ffmpeg", ffmpegArgs, { stdio: ["pipe", "inherit", "inherit"] });

  const startTime = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    renderFrame(ctx, f);
    const raw = canvas.data();
    const canWrite = ff.stdin.write(raw);
    if (!canWrite) {
      await new Promise((resolve) => ff.stdin.once("drain", resolve));
    }
    if ((f + 1) % 300 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Frame ${f + 1}/${TOTAL_FRAMES} (${(((f + 1) / TOTAL_FRAMES) * 100).toFixed(0)}%) - ${elapsed}s`);
    }
  }

  ff.stdin.end();
  await new Promise((resolve, reject) => {
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });

  console.log("Successfully rendered video.mp4!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
