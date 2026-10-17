import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const W = 1920, H = 1080, FPS = 30, DUR = 45, FRAMES = FPS * DUR;
for (const f of fs.readdirSync('fonts')) {
  try { GlobalFonts.registerFromPath(`fonts/${f}`); } catch {}
}
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Lumail D/A — warm black, off-white, brand accent #ff633d, metric colours
const BG = '#0c0a09', CARD = '#17130f', CARD2 = '#201a14', FG = '#f7f3ec',
  MUTED = '#a89f93', DIM = '#6f675c', ACC = '#ff633d', ACC2 = '#ff3d1e',
  BLUE = '#5b9cf0', GREEN = '#3fbd87', AMBER = '#e0a04a', GREY = '#8a8f99',
  BORDER = 'rgba(255,255,255,0.09)';
const SANS = 'Geist', MONO = '"Geist Mono"', SERIF = 'Georgia';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const outExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const outCubic = t => 1 - Math.pow(1 - t, 3);
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const outBack = (t, s = 1.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const E = (t, a, b, fn = outExpo) => fn(seg(t, a, b));

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function txt(s, x, y, { font = `600 40px ${SANS}`, color = FG, align = 'left', alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y); ctx.restore();
}
function tracked(s, x, y, font, color, tracking = 6, align = 'left', alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  let total = 0; for (const ch of s) total += ctx.measureText(ch).width + tracking;
  let cx = align === 'center' ? x - total / 2 : x;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + tracking; }
  ctx.restore(); return total;
}
function logo(x, y, size, alpha = 1, scale = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#ff7a3d'); g.addColorStop(1, ACC2);
  rr(0, 0, size, size, size * .24); ctx.fillStyle = g; ctx.fill();
  ctx.font = `800 ${size * .68}px ${SANS}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('L', size / 2, size * .78); ctx.restore();
}
function chip(x, y, label, { font = `500 26px ${MONO}`, fg = FG, bg = CARD2, pad = 22, alpha = 1, dot = null } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font;
  const w = ctx.measureText(label).width + pad * 2 + (dot ? 26 : 0), h = 52;
  rr(x, y, w, h, 26); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; ctx.stroke();
  let tx = x + pad;
  if (dot) { ctx.beginPath(); ctx.arc(tx + 7, y + h / 2, 7, 0, 7); ctx.fillStyle = dot; ctx.fill(); tx += 26; }
  ctx.fillStyle = fg; ctx.fillText(label, tx, y + h / 2 + 9); ctx.restore(); return w;
}
function maskedLine(s, x, y, h, p, opts) { // kinetic type: line rises inside a mask
  ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y - h, 1700, h + 26); ctx.clip();
  txt(s, x, y + (1 - outExpo(p)) * (h + 20), opts); ctx.restore();
}
function check(x, y, s, color = GREEN, p = 1) {
  ctx.save(); ctx.globalAlpha *= p; ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * .4, y + s * .42); ctx.lineTo(x + s, y - s * .5); ctx.stroke(); ctx.restore();
}
function sparkle(cx, cy, r, rot, color = ACC, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot); ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .14, -r * .14, r, 0); ctx.quadraticCurveTo(r * .14, r * .14, 0, r);
  ctx.quadraticCurveTo(-r * .14, r * .14, -r, 0); ctx.quadraticCurveTo(-r * .14, -r * .14, 0, -r); ctx.fill(); ctx.restore();
}
function envelope(x, y, w, rot, alpha, color = CARD2) {
  const h = w * .66; ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot);
  rr(-w / 2, -h / 2, w, h, 8); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = BORDER; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, h * .08); ctx.lineTo(w / 2, -h / 2);
  ctx.strokeStyle = 'rgba(255,99,61,.65)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
}

// deterministic particles
const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
function bg(t) {
  const g = ctx.createRadialGradient(W * .72, -200, 100, W * .72, -200, 1500);
  g.addColorStop(0, '#241610'); g.addColorStop(.45, '#12100d'); g.addColorStop(1, BG);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  const off = (t * 8) % 56;
  for (let x = 28 - off; x < W; x += 56) for (let y = 28; y < H; y += 56) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
  for (let i = 0; i < 26; i++) { // drifting embers
    const px = (rnd(i) * W + t * (10 + rnd(i, 2) * 26)) % (W + 40) - 20;
    const py = H - ((rnd(i, 3) * H + t * (16 + rnd(i, 4) * 30)) % (H + 40)) + 20;
    ctx.globalAlpha = .10 + rnd(i, 5) * .35; ctx.fillStyle = i % 4 ? ACC : '#ffd9c9';
    ctx.beginPath(); ctx.arc(px, py, 1.6 + rnd(i, 6) * 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
}
function sceneFade(t, a, b) { return clamp(seg(t, a, a + .35)) * clamp(seg(t, b, b - .35)); }
function header(t, kicker, delay = 0) {
  const p = E(t, delay, delay + .5);
  ctx.save(); ctx.globalAlpha *= p; logo(110, 84 + (1 - p) * 16, 44);
  txt('Lumail', 168, 120 + (1 - p) * 16, { font: `600 36px ${SANS}` });
  tracked(kicker, W - 110 - 0, 118, `500 22px ${MONO}`, DIM, 5, 'left', 1);
  // right-align kicker manually
  ctx.restore();
}
// ---------- SCENE 1 · 0–5 HOOK ----------
function s1(t) {
  const a = sceneFade(t, 0, 5); ctx.save(); ctx.globalAlpha = a;
  const lp = outBack(seg(t, .15, .95));
  ctx.save(); ctx.translate(110 + 44, 128 + 44); ctx.scale(Math.max(lp, .001), Math.max(lp, .001)); logo(-44, -44, 88); ctx.restore();
  txt('Lumail', 224, 192, { font: `600 62px ${SANS}`, alpha: E(t, .5, 1) });
  txt('.io', 224 + ctx.measureText('Lumail').width, 0, { alpha: 0 }); // spacing no-op
  const F = `600 138px ${SANS}`;
  maskedLine('Email marketing', 106, 500, 150, seg(t, .7, 1.5), { font: F });
  maskedLine("you'll actually", 106, 656, 150, seg(t, 1.05, 1.85), { font: F });
  // "love." in serif italic, brand orange — the Lumail accent style
  ctx.save(); ctx.beginPath(); ctx.rect(96, 676, 900, 190); ctx.clip();
  const ly = 830 + (1 - outExpo(seg(t, 1.45, 2.3))) * 190;
  txt('love.', 104, ly, { font: `italic 400 170px ${SERIF}`, color: ACC }); ctx.restore();
  sparkle(560, 700, 30 * outBack(seg(t, 2.2, 2.8)), t * .6, ACC, E(t, 2.2, 2.6));
  const cp = E(t, 2.6, 3.2);
  ctx.save(); ctx.translate(0, (1 - cp) * 24); chip(110, 900, 'AI DRAFTS · YOU SEND', { alpha: cp, dot: ACC }); ctx.restore();
  for (let i = 0; i < 5; i++) {
    const ep = seg(t, 2.4 + i * .22, 4.9);
    envelope(lerp(1500 + i * 40, 1950, ep), 340 + i * 120 + Math.sin(t * 2 + i) * 14 - ep * 60, 92 - i * 8, -.12 + i * .07, Math.sin(ep * Math.PI) * .95);
  }
  ctx.restore();
}
// ---------- SCENE 2 · 5–10 THE OLD WAY ----------
function s2(t) {
  const lt = t - 5, a = sceneFade(t, 5, 10); ctx.save(); ctx.globalAlpha = a;
  header(lt, '', 0);
  tracked('THE OLD WAY', 1530, 118, `500 22px ${MONO}`, DIM, 5);
  maskedLine('The old way punishes growth.', 106, 330, 110, seg(lt, .2, 1), { font: `600 96px ${SANS}` });
  const cards = [['Pay per contact', 'even the dormant ones'], ['Clunky editors', 'fight the tool all day'],
    ['Locked workflows', 'automation costs extra'], ['A second tool', 'for transactional email']];
  cards.forEach((c, i) => {
    const p = outBack(seg(lt, .9 + i * .28, 1.6 + i * .28)), x = 110 + i * 435, y = 440;
    const fall = E(lt, 3.9 + i * .08, 4.6 + i * .08, inOut);
    ctx.save(); ctx.translate(x + 200, y + 130 + fall * 620); ctx.rotate(fall * (i % 2 ? .4 : -.35));
    ctx.scale(Math.max(p, .001), Math.max(p, .001)); ctx.globalAlpha *= (1 - fall);
    rr(-200, -130, 400, 260, 22); ctx.fillStyle = CARD; ctx.fill(); ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; ctx.stroke();
    txt(c[0], -168, -38, { font: `600 40px ${SANS}` });
    txt(c[1], -168, 14, { font: `400 27px ${SANS}`, color: MUTED });
    const sp = seg(lt, 2.4 + i * .3, 2.85 + i * .3);
    if (sp > 0) { ctx.strokeStyle = ACC; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-172, -52); ctx.lineTo(-172 + 344 * outExpo(sp), -52); ctx.stroke(); }
    ctx.restore();
  });
  const fp = E(lt, 4.15, 4.85);
  txt('Lumail flips it.', W / 2, 640, { font: `600 110px ${SANS}`, align: 'center', alpha: fp });
  txt('flips it.', 0, 0, { alpha: 0 });
  ctx.restore();
}
// ---------- SCENE 3 · 10–18 AI EDITOR ----------
function s3(t) {
  const lt = t - 10, a = sceneFade(t, 10, 18); ctx.save(); ctx.globalAlpha = a;
  header(lt, '', 0); tracked('VISUAL EDITOR', 1470, 118, `500 22px ${MONO}`, DIM, 5);
  maskedLine('AI drafts.', 106, 300, 105, seg(lt, .15, .9), { font: `600 92px ${SANS}` });
  ctx.save(); ctx.beginPath(); ctx.rect(640, 180, 700, 140); ctx.clip();
  txt('You send.', 650, 302 + (1 - outExpo(seg(lt, .5, 1.25))) * 130, { font: `italic 400 98px ${SERIF}`, color: ACC }); ctx.restore();
  // editor window
  const wp = E(lt, .9, 1.7), wx = 260, wy = 356 + (1 - wp) * 60, ww = 1400, wh = 610;
  ctx.save(); ctx.globalAlpha *= wp;
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 26;
  rr(wx, wy, ww, wh, 24); ctx.fillStyle = '#14110e'; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; ctx.stroke();
  rr(wx, wy, ww, 62, 24); ctx.fillStyle = CARD2; ctx.fill(); ctx.fillRect(wx, wy + 40, ww, 22);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.beginPath(); ctx.arc(wx + 34 + i * 30, wy + 31, 8, 0, 7); ctx.fillStyle = c; ctx.fill(); });
  txt('lumail.io  /  campaigns  /  october-launch', wx + 150, wy + 40, { font: `400 24px ${MONO}`, color: MUTED });
  // AI chip
  const aip = outBack(seg(lt, 1.6, 2.2));
  ctx.save(); ctx.translate(wx + ww - 330, wy + 92); ctx.scale(Math.max(aip, .001), Math.max(aip, .001));
  rr(0, 0, 302, 56, 28); ctx.fillStyle = ACC; ctx.fill(); sparkle(26, 28, 13, lt*.8, '#1c0d06', 1);
  txt('Ask Lumail — drafting', 48, 38, { font: `600 24px ${SANS}`, color: '#1c0d06' }); ctx.restore();
  // subject typing
  txt('SUBJECT', wx + 56, wy + 150, { font: `500 20px ${MONO}`, color: DIM });
  const subj = 'Your October launch is live';
  const typed = subj.slice(0, Math.floor(seg(lt, 2.1, 3.9) * subj.length));
  txt(typed, wx + 56, wy + 206, { font: `600 46px ${SANS}` });
  if (lt > 2.1 && lt < 6.5 && Math.floor(lt * 2.4) % 2 === 0) {
    ctx.font = `600 46px ${SANS}`; const cw = ctx.measureText(typed).width;
    ctx.fillStyle = ACC; ctx.fillRect(wx + 62 + cw, wy + 162, 4, 48);
  }
  ctx.strokeStyle = BORDER; ctx.beginPath(); ctx.moveTo(wx + 56, wy + 238); ctx.lineTo(wx + ww - 56, wy + 238); ctx.stroke();
  // assembling blocks
  const blocks = [
    (x, y, w) => { txt('We shipped the thing.', x, y + 52, { font: `600 52px ${SANS}` }); },
    (x, y, w) => { for (let i = 0; i < 3; i++) { rr(x, y + i * 30, w * (i === 2 ? .55 : .92), 15, 7); ctx.fillStyle = 'rgba(247,243,236,.20)'; ctx.fill(); } },
    (x, y, w) => { const g = ctx.createLinearGradient(x, y, x + w, y + 94); g.addColorStop(0, '#ff7a3d'); g.addColorStop(1, ACC2); rr(x, y, w, 94, 16); ctx.fillStyle = g; ctx.fill(); sparkle(x + w / 2, y + 47, 26, lt * .5, '#fff', .9); },
    (x, y, w) => { rr(x, y, 360, 66, 33); ctx.fillStyle = FG; ctx.fill(); txt('Read the launch  →', x + 38, y + 44, { font: `600 28px ${SANS}`, color: '#17130f' }); },
  ];
  blocks.forEach((b, i) => {
    const p = outBack(seg(lt, 3.2 + i * .75, 3.95 + i * .75));
    ctx.save(); ctx.translate(wx + 56, wy + [258, 336, 410, 518][i]); ctx.scale(1, Math.max(p, .001)); ctx.globalAlpha *= clamp(p);
    b(0, 0, 760); ctx.restore();
  });
  // sidebar block palette
  ['Heading', 'Text', 'Image', 'Button', 'Survey'].forEach((s, i) => {
    const p = E(lt, 2.6 + i * .16, 3.1 + i * .16);
    ctx.save(); ctx.globalAlpha *= p; const bx = wx + ww - 330, by = wy + 272 + i * 66;
    rr(bx, by, 250, 52, 12); ctx.fillStyle = i === 3 && lt > 5.6 ? 'rgba(255,99,61,.16)' : CARD2; ctx.fill(); ctx.strokeStyle = BORDER; ctx.stroke();
    txt('+  ' + s, bx + 20, by + 35, { font: `500 24px ${SANS}`, color: MUTED }); ctx.restore();
  });
  const done = E(lt, 6.6, 7.2);
  if (done > 0) { check(wx + ww - 330, wy + 120, 24, GREEN, done); txt('Draft ready — review & send', wx + ww - 292, wy + 128, { font: `500 25px ${SANS}`, color: GREEN, alpha: done }); }
  ctx.restore(); ctx.restore();
}
// ---------- SCENE 4 · 18–26 AUTOPILOT WORKFLOWS ----------
function s4(t) {
  const lt = t - 18, a = sceneFade(t, 18, 26); ctx.save(); ctx.globalAlpha = a;
  header(lt, '', 0); tracked('WORKFLOWS', 1570, 118, `500 22px ${MONO}`, DIM, 5);
  maskedLine('Run your newsletter on', 106, 290, 100, seg(lt, .15, .9), { font: `600 88px ${SANS}` });
  ctx.save(); ctx.beginPath(); ctx.rect(96, 300, 800, 130); ctx.clip();
  txt('autopilot.', 104, 408 + (1 - outExpo(seg(lt, .5, 1.25))) * 120, { font: `italic 400 96px ${SERIF}`, color: ACC }); ctx.restore();
  const nodes = [
    { x: 130, label: 'TRIGGER', title: 'New subscriber', c: GREY },
    { x: 480, label: 'EMAIL', title: 'Welcome', c: ACC },
    { x: 830, label: 'WAIT', title: '2 days', c: AMBER },
    { x: 1180, label: 'CONDITION', title: 'Clicked?', c: BLUE },
    { x: 1530, label: 'EMAIL', title: 'Launch story', c: GREEN },
  ], ny = 560, nw = 290, nh = 150;
  // connectors
  for (let i = 0; i < nodes.length - 1; i++) {
    const p = seg(lt, 1.5 + i * .5, 2.1 + i * .5), x1 = nodes[i].x + nw, x2 = nodes[i + 1].x, y = ny + nh / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -lt * 46;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + (x2 - x1) * p, y); ctx.stroke(); ctx.setLineDash([]);
    const pulse = ((lt * .55 + i * .22) % 1);
    if (p >= 1) { ctx.beginPath(); ctx.arc(lerp(x1, x2, pulse), y, 7, 0, 7); ctx.fillStyle = ACC; ctx.fill(); }
  }
  nodes.forEach((n, i) => {
    const p = outBack(seg(lt, 1.1 + i * .5, 1.8 + i * .5));
    const active = lt > 3.6 && Math.floor((lt - 3.6) / .7) % 5 === i;
    ctx.save(); ctx.translate(n.x + nw / 2, ny + nh / 2); ctx.scale(Math.max(p, .001) * (active ? 1.045 : 1), Math.max(p, .001) * (active ? 1.045 : 1));
    rr(-nw / 2, -nh / 2, nw, nh, 20); ctx.fillStyle = active ? CARD2 : CARD; ctx.fill();
    ctx.strokeStyle = active ? n.c : BORDER; ctx.lineWidth = active ? 3 : 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(-nw / 2 + 34, -nh / 2 + 36, 8, 0, 7); ctx.fillStyle = n.c; ctx.fill();
    txt(n.label, -nw / 2 + 56, -nh / 2 + 45, { font: `500 20px ${MONO}`, color: DIM });
    txt(n.title, -nw / 2 + 28, 34, { font: `600 33px ${SANS}` }); ctx.restore();
  });
  // branch tag
  const bp = E(lt, 4.3, 5);
  ctx.save(); ctx.globalAlpha *= bp;
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -lt * 46;
  ctx.beginPath(); ctx.moveTo(1325, ny + nh); ctx.lineTo(1325, ny + nh + 74 * bp); ctx.stroke(); ctx.setLineDash([]);
  chip(1195, ny + nh + 82, 'TAG · engaged', { dot: BLUE }); ctx.restore();
  ['Draft', 'Segment', 'Schedule'].forEach((s, i) => {
    const p = outBack(seg(lt, 5.2 + i * .45, 5.85 + i * .45));
    ctx.save(); ctx.translate(110 + i * 330, 920); ctx.scale(Math.max(p, .001), Math.max(p, .001));
    rr(0, 0, 290, 72, 36); ctx.fillStyle = CARD2; ctx.fill(); ctx.strokeStyle = BORDER; ctx.stroke();
    check(28, 38, 26); txt(s, 76, 48, { font: `600 30px ${SANS}` }); ctx.restore();
  });
  txt('Publish once — Lumail handles timing, enrolment and exits.', 1120, 968, { font: `400 28px ${SANS}`, color: MUTED, alpha: E(lt, 6.4, 7.1) });
  ctx.restore();
}
// ---------- SCENE 5 · 26–33 AGENTS ----------
function s5(t) {
  const lt = t - 26, a = sceneFade(t, 26, 33); ctx.save(); ctx.globalAlpha = a;
  header(lt, '', 0); tracked('MCP · CLI · SDK · API', 1280, 118, `500 22px ${MONO}`, DIM, 5);
  maskedLine('Your agents can run it.', 106, 295, 100, seg(lt, .15, .9), { font: `600 88px ${SANS}` });
  // terminal
  const wp = E(lt, .7, 1.4), wx = 110, wy = 360 + (1 - wp) * 50, ww = 1020, wh = 430;
  ctx.save(); ctx.globalAlpha *= wp;
  rr(wx, wy, ww, wh, 22); ctx.fillStyle = '#100e0c'; ctx.fill(); ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; ctx.stroke();
  txt('—  terminal', wx + 30, wy + 44, { font: `400 23px ${MONO}`, color: DIM });
  const lines = [
    { t: '$ npx lumail campaigns create', at: 1.3, c: FG, type: true },
    { t: 'OK  Draft created — "October launch"', at: 3.0, c: GREEN },
    { t: '$ npx lumail workflows publish', at: 3.6, c: FG, type: true },
    { t: 'OK  Autopilot on · 12,480 subscribers enrolled', at: 5.2, c: GREEN },
    { t: '$ npx lumail stats --last send', at: 5.8, c: FG, type: true },
    { t: 'OK  Opened 48.6% · Clicked 12.4%', at: 6.9, c: AMBER },
  ];
  lines.forEach((L, i) => {
    if (lt < L.at) return;
    const s = L.type ? L.t.slice(0, Math.floor(seg(lt, L.at, L.at + 1.1) * L.t.length)) : L.t;
    txt(s, wx + 38, wy + 118 + i * 52, { font: `400 27px ${MONO}`, color: L.c, alpha: L.type ? 1 : E(lt, L.at, L.at + .3) });
  });
  ctx.restore();
  // access stack
  [['MCP server', 'OAuth 2.1 · lumail.io/mcp', ACC], ['REST API', 'OpenAPI 3.1 · typed', BLUE],
   ['TypeScript SDK', 'lumail.emails.send()', GREEN], ['CLI + Skills', 'npx lumail · 96 tools', AMBER],
   ['SMTP relay', 'smtp.lumail.io:587', GREY]].forEach((r, i) => {
    const p = outBack(seg(lt, 1.2 + i * .32, 1.85 + i * .32)), x = 1220, y = 360 + i * 88;
    ctx.save(); ctx.translate(x + (1 - clamp(p)) * 120, y); ctx.globalAlpha *= clamp(p);
    rr(0, 0, 590, 72, 16); ctx.fillStyle = CARD; ctx.fill(); ctx.strokeStyle = BORDER; ctx.stroke();
    ctx.beginPath(); ctx.arc(36, 36, 9, 0, 7); ctx.fillStyle = r[2]; ctx.fill();
    txt(r[0], 62, 46, { font: `600 28px ${SANS}` });
    txt(r[1], 560, 45, { font: `400 22px ${MONO}`, color: DIM, align: 'right' }); ctx.restore();
  });
  // runs-inside marquee
  const mp = E(lt, 4.6, 5.3); ctx.save(); ctx.globalAlpha *= mp;
  ctx.strokeStyle = BORDER; ctx.beginPath(); ctx.moveTo(110, 880); ctx.lineTo(W - 110, 880); ctx.stroke();
  tracked('RUNS INSIDE', 110, 946, `500 22px ${MONO}`, DIM, 5);
  const names = 'ChatGPT    Claude    Cursor    Hermes    OpenClaw    ';
  ctx.save(); ctx.beginPath(); ctx.rect(420, 890, 1390, 80); ctx.clip();
  const off = (lt * 120) % 760;
  for (let k = 0; k < 3; k++) txt(names, 430 - off + k * 760, 948, { font: `600 38px ${SANS}`, color: MUTED });
  ctx.restore(); ctx.restore(); ctx.restore();
}
// ---------- SCENE 6 · 33–39 SEND + ANALYTICS ----------
function s6(t) {
  const lt = t - 33, a = sceneFade(t, 33, 39); ctx.save(); ctx.globalAlpha = a;
  header(lt, '', 0); tracked('DELIVERY', 1580, 118, `500 22px ${MONO}`, DIM, 5);
  maskedLine('Hit send. Watch it land.', 106, 290, 100, seg(lt, .1, .85), { font: `600 88px ${SANS}` });
  // SEND button presses at 1.4
  const press = lt < 1.4 ? 0 : Math.sin(clamp(seg(lt, 1.4, 1.85)) * Math.PI) * .12;
  const sent = lt >= 1.55;
  ctx.save(); ctx.translate(110, 350); ctx.scale(1 - press, 1 - press);
  rr(0, 0, 470, 104, 52); ctx.fillStyle = sent ? GREEN : ACC; ctx.fill();
  txt(sent ? '✓  Sent' : 'Send campaign  →', 235, 66, { font: `600 36px ${SANS}`, color: sent ? '#08130d' : '#1c0d06', align: 'center' }); ctx.restore();
  if (sent) for (let i = 0; i < 14; i++) {
    const p = seg(lt, 1.55, 3.2 + rnd(i) * .8);
    envelope(345 + p * (260 + rnd(i, 3) * 780), 402 + (rnd(i, 2) - .5) * p * 240 - p * 30 + Math.sin(p*6+i)*10, 58, (rnd(i, 4) - .5) * .55, Math.sin(p * Math.PI) * .9, i % 3 ? '#342a20' : '#55301d');
  }
  // metric cards count up
  const metrics = [
    { label: 'SENT', val: 12480, fmt: v => Math.round(v).toLocaleString('en-US'), c: GREY },
    { label: 'DELIVERED', val: 99.2, fmt: v => v.toFixed(1) + '%', c: BLUE },
    { label: 'OPENED', val: 48.6, fmt: v => v.toFixed(1) + '%', c: GREEN },
    { label: 'CLICKED', val: 12.4, fmt: v => v.toFixed(1) + '%', c: AMBER },
  ];
  metrics.forEach((m, i) => {
    const p = outBack(seg(lt, 2 + i * .35, 2.65 + i * .35)), count = E(lt, 2.1 + i * .35, 4.4 + i * .2, outCubic);
    const x = 110 + i * 435, y = 540;
    ctx.save(); ctx.translate(x + 200, y + 110); ctx.scale(Math.max(p, .001), Math.max(p, .001));
    rr(-200, -110, 400, 220, 22); ctx.fillStyle = CARD; ctx.fill(); ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; ctx.stroke();
    tracked(m.label, -168, -48, `500 21px ${MONO}`, DIM, 4);
    txt(m.fmt(m.val * count), -168, 28, { font: `600 62px ${SANS}` });
    rr(-168, 58, 336, 12, 6); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    rr(-168, 58, 336 * count * (i === 0 ? 1 : m.val / 100), 12, 6); ctx.fillStyle = m.c; ctx.fill();
    ctx.restore();
  });
  // transactional instant lane
  const lp = E(lt, 4.4, 5.1); ctx.save(); ctx.globalAlpha *= lp; ctx.translate(0, (1 - lp) * 26);
  rr(110, 850, 1700, 96, 20); ctx.fillStyle = CARD2; ctx.fill(); ctx.strokeStyle = BORDER; ctx.stroke();
  txt('TRANSACTIONAL', 150, 910, { font: `500 22px ${MONO}`, color: DIM });
  txt('OTP codes & magic links on a separate instant lane —', 430, 912, { font: `400 30px ${SANS}`, color: MUTED });
  txt('smtp.lumail.io:587', 1230, 912, { font: `500 30px ${MONO}`, color: ACC });
  const zip = ((lt - 4.4) * .9) % 1; ctx.beginPath(); ctx.arc(lerp(160, 1760, zip), 898, 6, 0, 7); ctx.fillStyle = BLUE; ctx.fill();
  ctx.restore(); ctx.restore();
}
// ---------- SCENE 7 · 39–45 PRICING + OUTRO ----------
function s7(t) {
  const lt = t - 39, a = clamp(seg(t, 39, 39.35)); ctx.save(); ctx.globalAlpha = a;
  if (lt < 3.4) {
    const out = 1 - seg(lt, 3.0, 3.4); ctx.save(); ctx.globalAlpha *= out; ctx.translate(0, (1 - out) * -40);
    header(lt, '', 0); tracked('PRICING', 1620, 118, `500 22px ${MONO}`, DIM, 5);
    maskedLine("Pricing that doesn't", 106, 360, 110, seg(lt, .1, .85), { font: `600 96px ${SANS}` });
    maskedLine('punish growth.', 106, 486, 110, seg(lt, .4, 1.15), { font: `600 96px ${SANS}` });
    const rows = [['Unlimited subscribers', 'no per-contact pricing'], ['Pay for emails sent', 'not for sitting contacts'], ['Workflows on every plan', 'automation is not an upsell']];
    rows.forEach((r, i) => {
      const p = E(lt, 1.2 + i * .4, 1.8 + i * .4);
      ctx.save(); ctx.globalAlpha *= p; ctx.translate((1 - p) * -40, 0);
      check(112, 592 + i * 84, 30, ACC, p);
      txt(r[0], 170, 606 + i * 84, { font: `600 42px ${SANS}` });
      ctx.font = `600 42px ${SANS}`; const w = ctx.measureText(r[0]).width;
      txt(' — ' + r[1], 176 + w, 606 + i * 84, { font: `400 34px ${SANS}`, color: MUTED }); ctx.restore();
    });
    const cp = outBack(seg(lt, 2.5, 3.1));
    ctx.save(); ctx.translate(110, 880); ctx.scale(Math.max(cp, .001), Math.max(cp, .001));
    rr(0, 0, 720, 78, 39); ctx.fillStyle = ACC; ctx.fill();
    txt('3,000 emails / month free · No card', 40, 52, { font: `600 32px ${SANS}`, color: '#1c0d06' }); ctx.restore();
    ctx.restore();
  }
  if (lt >= 3.1) { // outro lockup
    const ot = lt - 3.1, p = E(ot, 0, .6);
    ctx.save(); ctx.globalAlpha *= p;
    const ls = outBack(seg(ot, 0, .8));
    ctx.save(); ctx.translate(W / 2, 400); ctx.scale(Math.max(ls, .001), Math.max(ls, .001)); logo(-70, -70, 140); ctx.restore();
    sparkle(W / 2 + 130, 330, 26 * outBack(seg(ot, .6, 1.1)), ot * .8, ACC, E(ot, .6, 1));
    txt('Lumail', W / 2, 640, { font: `600 120px ${SANS}`, align: 'center', alpha: E(ot, .3, .9) });
    txt("You'll actually like sending emails.", W / 2, 716, { font: `italic 400 44px ${SERIF}`, color: MUTED, align: 'center', alpha: E(ot, .7, 1.3) });
    const bp = outBack(seg(ot, 1.1, 1.7));
    ctx.save(); ctx.translate(W / 2, 820); ctx.scale(Math.max(bp, .001), Math.max(bp, .001));
    rr(-190, -46, 380, 92, 46); ctx.fillStyle = FG; ctx.fill();
    txt('Start free  →', 0, 13, { font: `600 36px ${SANS}`, color: '#17130f', align: 'center' }); ctx.restore();
    tracked('LUMAIL.IO', 0, 0, `500 1px ${MONO}`, DIM, 0, 'left', 0);
    txt('lumail.io', W / 2, 952, { font: `500 30px ${MONO}`, color: DIM, align: 'center', alpha: E(ot, 1.5, 2.1) });
    ctx.restore();
  }
  ctx.restore();
}
// orange wipe at scene boundaries + progress hairline
function overlays(t) {
  for (const b of [5, 10, 18, 26, 33, 39]) {
    const p = seg(t, b - .22, b + .22);
    if (p > 0 && p < 1) {
      const x = lerp(-260, W + 260, inOut(p));
      ctx.save(); ctx.translate(x, 0); ctx.rotate(.06);
      const g = ctx.createLinearGradient(-120, 0, 120, 0);
      g.addColorStop(0, 'rgba(255,99,61,0)'); g.addColorStop(.5, 'rgba(255,99,61,.9)'); g.addColorStop(1, 'rgba(255,99,61,0)');
      ctx.fillStyle = g; ctx.fillRect(-120, -100, 240, H + 200); ctx.restore();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(0, H - 5, W, 5);
  ctx.fillStyle = ACC; ctx.fillRect(0, H - 5, W * (t / DUR), 5);
}
function draw(t) {
  bg(t);
  if (t < 5.4) s1(t);
  if (t >= 4.6 && t < 10.4) s2(t);
  if (t >= 9.6 && t < 18.4) s3(t);
  if (t >= 17.6 && t < 26.4) s4(t);
  if (t >= 25.6 && t < 33.4) s5(t);
  if (t >= 32.6 && t < 39.4) s6(t);
  if (t >= 38.6) s7(t);
  overlays(t);
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

const previewAt = process.argv.indexOf('--preview');
if (previewAt > -1) {
  const times = [2.5, 7.5, 9.2, 14, 22, 29.5, 36.5, 41, 44.2];
  for (const [i, tt] of times.entries()) { draw(tt); fs.writeFileSync(`preview-${i}.png`, canvas.toBuffer('image/png')); }
  console.log('previews written');
} else {
  const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-i', 'audio.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-t', String(DUR), 'video.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  let f = 0;
  const push = () => {
    let ok = true;
    while (f < FRAMES && ok) {
      draw(f / FPS);
      const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
      ok = ff.stdin.write(buf); f++;
      if (f % 150 === 0) console.log(`frame ${f}/${FRAMES}`);
    }
    if (f >= FRAMES) ff.stdin.end(); else ff.stdin.once('drain', push);
  };
  push();
  ff.on('close', code => { console.log('ffmpeg exit', code); process.exit(code); });
}

