import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

GlobalFonts.registerFromPath('assets/Geist-Regular.ttf', 'Geist');
GlobalFonts.registerFromPath('assets/Geist-Bold.ttf', 'Geist');
GlobalFonts.registerFromPath('assets/GeistMono-Regular.ttf', 'Geist Mono');

const W = 1280, H = 720, FPS = 30, DUR = 45, TOTAL = FPS * DUR;
const canvas = createCanvas(W, H);
const c = canvas.getContext('2d');

const INK = '#F5F5F4', GREY = '#A1A1AA', DIM = '#63636B', BG = '#0B0B0C';
const RED = '#FF3D00', RED2 = '#FF7A3D', CARD = '#141416', LINE = '#26262B', GREEN = '#34D399';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = t => 1 - Math.pow(1 - t, 4);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const spring = t => { t = clamp(t); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2) * Math.sin(t * 9) * (1 - t) + (1 - Math.pow(1 - t, 3)) * 0 - (1 - t) * 0 + (Math.pow(1 - t, 3) * -1 + 1) * 0 + easeOut(t) * 0 + (1 - Math.cos(t * Math.PI * 0.5)) * 0 + t * 0 + (1 - Math.pow(1 - t, 2)) + Math.sin(t * Math.PI) * 0.08 * (1 - t) - (1 - Math.pow(1 - t, 2)) + easeOut(t); };
// spring above simplifies to easeOut + overshoot bump; keep explicit overshoot:
const pop = t => { t = clamp(t); const s = 1.70158, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const fadeIO = (t, a, b, f = 0.4) => clamp(Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b)));
let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const particles = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), s: 0.4 + rnd() * 1.6, v: 0.004 + rnd() * 0.014, o: 0.15 + rnd() * 0.5 }));

function rr(x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function txt(str, x, y, px, { w = 700, col = INK, align = 'left', font = 'Geist', alpha = 1, spacing = 0 } = {}) {
  c.save(); c.globalAlpha *= alpha; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.font = `${w} ${px}px "${font}"`;
  if (!spacing) { c.fillText(str, x, y); }
  else {
    let tw = 0; for (const ch of str) tw += c.measureText(ch).width + spacing;
    let cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    const prev = c.textAlign; c.textAlign = 'left';
    for (const ch of str) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + spacing; }
    c.textAlign = prev;
  }
  c.restore();
}
function logo(x, y, s, alpha = 1, glow = 0) {
  c.save(); c.globalAlpha *= alpha;
  if (glow > 0) { const g = c.createRadialGradient(x + s / 2, y + s / 2, s * 0.1, x + s / 2, y + s / 2, s * 1.7); g.addColorStop(0, `rgba(255,61,0,${0.5 * glow})`); g.addColorStop(1, 'rgba(255,61,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x + s/2, y + s/2, s * 1.7, 0, 7); c.fill(); }
  rr(x, y, s, s, s * 0.24); c.fillStyle = '#101012'; c.fill(); c.strokeStyle = '#2C2C31'; c.lineWidth = Math.max(1, s * 0.015); c.stroke();
  const g = c.createLinearGradient(x, y + s, x + s, y); g.addColorStop(0, '#E62600'); g.addColorStop(0.55, RED); g.addColorStop(1, RED2);
  c.fillStyle = g; c.beginPath();
  const p = [[.335, .155], [.475, .155], [.475, .655], [.735, .655], [.735, .815], [.335, .815]];
  p.forEach(([ux, uy], i) => i ? c.lineTo(x + ux * s, y + uy * s) : c.moveTo(x + ux * s, y + uy * s));
  c.closePath(); c.fill(); c.restore();
}
function brand(x, y, s, alpha = 1, textPx = null) { logo(x, y, s, alpha); txt('Lumail', x + s + s * 0.28, y + s * 0.68, textPx || s * 0.52, { w: 700, alpha }); }
function chip(str, x, y, { col = GREY, px = 15, alpha = 1, fill = '#17171A' } = {}) {
  c.save(); c.font = `500 ${px}px "Geist"`; const w = c.measureText(str).width + 28;
  c.globalAlpha *= alpha; rr(x, y, w, px + 18, 999); c.fillStyle = fill; c.fill(); c.strokeStyle = LINE; c.lineWidth = 1; c.stroke();
  c.restore(); txt(str, x + 14, y + px + 3, px, { w: 500, col, alpha }); return w;
}
function bg(t) {
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  const gx = W * (0.5 + 0.18 * Math.sin(t * 0.21)), gy = H * (0.32 + 0.1 * Math.cos(t * 0.17));
  let g = c.createRadialGradient(gx, gy, 40, gx, gy, 760); g.addColorStop(0, 'rgba(255,61,0,0.13)'); g.addColorStop(0.45, 'rgba(255,61,0,0.035)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(W * 0.85, H * 0.9, 30, W * 0.85, H * 0.9, 620); g.addColorStop(0, 'rgba(120,130,160,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  const off = (t * 6) % 44;
  for (let x = -44 + off; x < W + 44; x += 44) for (let y = 22; y < H; y += 44) { c.beginPath(); c.arc(x, y, 1.1, 0, 7); c.fill(); }
  for (const p of particles) { const y = ((p.y - t * p.v) % 1 + 1) % 1; c.fillStyle = `rgba(255, ${140 + (p.s * 30) | 0}, 90, ${p.o * 0.5})`; c.beginPath(); c.arc(p.x * W, y * H, p.s, 0, 7); c.fill(); }
  g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function kicker(str, x, y, a, align = 'left') { txt(str.toUpperCase(), x, y, 14, { w: 700, col: RED2, alpha: a, align, spacing: 3 }); }
function typeOn(str, lt, cps = 26) { return str.slice(0, Math.floor(clamp(lt) * str.length * 999 && lt * cps)); }
function cursor(x, y, h, t, a) { if (Math.floor(t * 2.4) % 2 === 0) { c.save(); c.globalAlpha *= a; c.fillStyle = RED2; c.fillRect(x, y - h, 3, h); c.restore(); } }

/* ---------- SCENES ---------- */
function s1(t) { // 0-5 cold open
  const lt = t, a = fadeIO(t, 0, 5, 0.3);
  // falling legacy tags
  const tags = ['TEMPLATES', 'SETTINGS', 'PER-CONTACT FEES', 'TUESDAY NIGHT', '2019 DESIGN', 'DASHBOARD TOURS'];
  tags.forEach((s, i) => {
    const p = prog(lt, 0.15 + i * 0.16, 2.6 + i * 0.16), e = easeInOut(p);
    const x = 120 + (i % 3) * 400 + Math.sin(i * 7) * 30, y = lerp(-60, 640 + (i % 2) * 60, e);
    c.save(); c.translate(x, y); c.rotate(lerp(-0.04, 0.22 * (i % 2 ? 1 : -1), e)); c.globalAlpha *= a * (1 - p) * 0.9;
    c.font = '700 15px "Geist Mono"'; const w = c.measureText(s).width + 26;
    rr(-w / 2, -20, w, 40, 9); c.fillStyle = '#17171A'; c.fill(); c.strokeStyle = LINE; c.stroke();
    c.fillStyle = DIM; c.textAlign = 'center'; c.fillText(s, 0, 5);
    c.strokeStyle = RED; c.lineWidth = 2; c.beginPath(); c.moveTo(-w / 2 + 8, 0); c.lineTo(w / 2 - 8, 0); c.stroke(); c.restore();
  });
  const p1 = pop(prog(lt, 0.5, 1.3)), s = 92 * clamp(p1);
  logo(W / 2 - s / 2, 128 - s / 2 + (1 - easeOut(prog(lt, 0.5, 1.3))) * -30, Math.max(s, 0.1), a, 0.6 + 0.4 * Math.sin(lt * 2));
  const line = (str, y, d, px = 54, col = INK) => { const p = easeOut(prog(lt, d, d + 0.7)); txt(str, W / 2, y + (1 - p) * 34, px, { align: 'center', alpha: a * p, col }); };
  line("You didn't start a business", 330, 1.15);
  line('to fight templates.', 396, 1.45, 54, GREY);
  const p3 = easeOut(prog(lt, 2.5, 3.2));
  txt('Email marketing shouldn’t feel like a second job.', W / 2, 492 + (1 - p3) * 24, 27, { align: 'center', col: GREY, alpha: a * p3, w: 500 });
  const pw = prog(lt, 3.1, 3.8); c.save(); c.globalAlpha *= a; c.fillStyle = RED; c.fillRect(W / 2 - 260 * easeOut(pw), 512, 520 * easeOut(pw), 4); c.restore();
}
function s2(t) { // 5-10 reveal
  const lt = t - 5, a = fadeIO(t, 5, 10);
  const bp = pop(prog(lt, 0.05, 0.8));
  c.save(); c.translate(W / 2, 168); c.scale(clamp(bp), clamp(bp)); brand(-150, -38, 76, a, 46); c.restore();
  const words = [['The AI tool that will', INK], ['make you ', INK]];
  txt('The AI tool that will', W / 2, 338, 62, { align: 'center', alpha: a * easeOut(prog(lt, 0.55, 1.2)) });
  // line 2 with LOVE in red
  const p = easeOut(prog(lt, 0.95, 1.65)); c.save(); c.globalAlpha *= a * p; c.translate(0, (1 - p) * 30);
  c.font = '700 62px "Geist"'; const w1 = c.measureText('make you ').width, w2 = c.measureText('LOVE').width, w3 = c.measureText(' email').width, tot = w1 + w2 + w3;
  let x = W / 2 - tot / 2; c.textAlign = 'left'; c.fillStyle = INK; c.fillText('make you ', x, 414); x += w1; c.fillStyle = RED2; c.fillText('LOVE', x, 414); x += w2; c.fillStyle = INK; c.fillText(' email', x, 414); c.restore();
  txt('marketing.', W / 2, 488, 62, { align: 'center', alpha: a * easeOut(prog(lt, 1.3, 2)) });
  const q = easeOut(prog(lt, 2.1, 2.9));
  txt('You’ll actually like sending emails. And you’ll make more money.', W / 2, 562, 24, { align: 'center', col: GREY, alpha: a * q, w: 500 });
  txt('That’s the deal.', W / 2, 600, 24, { align: 'center', col: INK, alpha: a * easeOut(prog(lt, 2.6, 3.3)), w: 700 });
  // envelope burst
  for (let i = 0; i < 14; i++) { const pp = prog(lt, 1.8, 4.4), ang = i / 14 * Math.PI * 2, r = easeOut(pp) * (240 + (i % 4) * 60); const ex = W / 2 + Math.cos(ang) * r, ey = 380 + Math.sin(ang) * r * 0.55 - pp * 40; c.save(); c.translate(ex, ey); c.rotate(Math.sin(i * 3 + lt) * 0.3); c.globalAlpha *= a * (1 - pp) * 0.9; rr(-16, -11, 32, 22, 4); c.fillStyle = i % 3 ? '#1D1D21' : RED; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.stroke(); c.beginPath(); c.moveTo(-16, -11); c.lineTo(0, 2); c.lineTo(16, -11); c.stroke(); c.restore(); }
}
function panel(x, y, w, h, title, a) {
  c.save(); c.globalAlpha *= a; rr(x, y, w, h, 18); c.fillStyle = 'rgba(20,20,22,0.94)'; c.fill(); c.strokeStyle = LINE; c.lineWidth = 1.5; c.stroke();
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(x + 24 + i * 22, y + 26, 6, 0, 7); c.fill(); });
  if (title) txt(title, x + 100, y + 31, 14, { col: DIM, font: 'Geist Mono', w: 400, alpha: a });
  c.strokeStyle = LINE; c.beginPath(); c.moveTo(x, y + 48); c.lineTo(x + w, y + 48); c.stroke(); c.restore();
}
function s3(t) { // 10-16 editor
  const lt = t - 10, a = fadeIO(t, 10, 16);
  kicker('Editor', 90, 96, a); txt('Write the email,', 90, 150, 44, { alpha: a * easeOut(prog(lt, 0.1, 0.8)) }); txt('not the layout.', 90, 202, 44, { col: GREY, alpha: a * easeOut(prog(lt, 0.35, 1)) });
  const px = 90, py = 252, pw = 700, slide = easeOut(prog(lt, 0.5, 1.4));
  c.save(); c.translate((1 - slide) * -60, 0); panel(px, py, pw, 380, 'lumail — new campaign', a);
  txt('Subject:  Your Tuesday win-back is ready', px + 28, py + 92, 19, { w: 700, alpha: a * prog(lt, 1.2, 1.6) });
  const body = 'Hey {{first_name}} — we saved your spot.\nHere’s the thing nobody tells you about\nlaunch week: timing beats volume.';
  const shown = body.slice(0, Math.floor(prog(lt, 1.5, 3.6) * body.length));
  shown.split('\n').forEach((l, i) => txt(l, px + 28, py + 140 + i * 34, 20, { w: 400, col: '#D4D4D8', alpha: a }));
  const last = shown.split('\n'); c.font = '400 20px "Geist"'; cursor(px + 30 + c.measureText(last[last.length - 1]).width, py + 140 + (last.length - 1) * 34 + 4, 22, t, a);
  const ap = pop(prog(lt, 3.7, 4.4)); c.save(); c.translate(px + 28, py + 262); c.scale(clamp(ap), clamp(ap));
  c.globalAlpha *= a; rr(0, 0, 470, 52, 12); c.fillStyle = 'rgba(255,61,0,0.13)'; c.fill(); c.strokeStyle = 'rgba(255,122,61,0.5)'; c.stroke();
  txt('AI tightened this paragraph — your voice, kept.', 16, 33, 16, { col: RED2, w: 500, alpha: a }); c.restore();
  const bp = pop(prog(lt, 4.3, 5)); c.save(); c.translate(px + 28, py + 330); c.scale(clamp(bp), clamp(bp)); c.globalAlpha *= a; rr(0, -26, 150, 42, 10); c.fillStyle = INK; c.fill(); txt('Claim spot →', 75, 2, 16, { col: '#0B0B0C', align: 'center', w: 700, alpha: a }); c.restore();
  c.restore();
  // phone preview
  const ph = easeOut(prog(lt, 1.8, 2.8)); c.save(); c.translate(880 + (1 - ph) * 120, 230 + (1 - ph) * 30); c.rotate(0.03); c.globalAlpha *= a * ph;
  rr(0, 0, 270, 410, 30); c.fillStyle = '#101013'; c.fill(); c.strokeStyle = '#33333A'; c.lineWidth = 2; c.stroke();
  txt('INBOX', 24, 44, 12, { col: DIM, spacing: 2, w: 700 }); logo(24, 62, 34, 1); txt('Lumail', 68, 86, 17, { w: 700 }); txt('now', 246, 86, 13, { col: DIM, align: 'right', w: 400 });
  txt('Your Tuesday win-back…', 24, 128, 16, { w: 700 }); txt('Hey Maya — we saved', 24, 154, 15, { col: GREY, w: 400 }); txt('your spot. Timing beats…', 24, 178, 15, { col: GREY, w: 400 });
  rr(24, 206, 222, 44, 10); c.fillStyle = INK; c.fill(); txt('Claim spot →', 135, 234, 15, { col: '#0B0B0C', align: 'center', w: 700 });
  txt('Looks like the inbox.', 135, 310, 15, { col: DIM, align: 'center', w: 400 }); txt('Because it is.', 135, 336, 15, { col: GREY, align: 'center', w: 700 }); c.restore();
  txt('Type like a document. Variables, buttons, inbox preview — done.', 90, 688, 19, { col: GREY, alpha: a * prog(lt, 4.6, 5.3), w: 400 });
}
function s4(t) { // 16-23 agents
  const lt = t - 16, a = fadeIO(t, 16, 23);
  kicker('Agents · MCP', 90, 92, a); txt('Your AI can send', 90, 146, 44, { alpha: a * easeOut(prog(lt, 0.1, 0.8)) }); txt('the campaign.', 90, 198, 44, { col: GREY, alpha: a * easeOut(prog(lt, 0.35, 1)) });
  const cnt = Math.round(easeOut(prog(lt, 4.6, 5.8)) * 139);
  c.save(); c.globalAlpha *= a * prog(lt, 4.4, 5);
  txt(String(cnt), 1060, 150, 76, { align: 'center', col: RED2 }); txt('AGENT TOOLS', 1060, 184, 13, { align: 'center', col: DIM, spacing: 3, w: 700 }); c.restore();
  const px = 90, py = 240; panel(px, py, 1100, 360, 'claude  ·  lumail — 139 tools', a);
  const q = '> who clicked the pricing link but never bought?';
  txt(q.slice(0, Math.floor(prog(lt, 0.8, 2.1) * q.length)), px + 30, py + 96, 21, { font: 'Geist Mono', w: 400, alpha: a });
  const rows = [
    ['lumail - query_subscribers', '(clicked: "/pricing")', '312 subscribers', 2.25],
    ['lumail - bulk_add_tags', '(tags: ["hot-lead"])', '312 tagged', 3.05],
    ['lumail - add_to_workflow', '(workflow: "Objections")', '312 enrolled', 3.85],
  ];
  rows.forEach(([fn, args, res, d], i) => { const p = easeOut(prog(lt, d, d + 0.5)), y = py + 150 + i * 64; c.save(); c.translate((1 - p) * -26, 0); c.globalAlpha *= a * p;
    c.fillStyle = RED2; c.beginPath(); c.arc(px + 38, y - 6, 5, 0, 7); c.fill();
    txt(fn, px + 56, y, 19, { font: 'Geist Mono', w: 400 }); c.font = '400 19px "Geist Mono"'; txt(' ' + args, px + 56 + c.measureText(fn).width, y, 19, { font: 'Geist Mono', w: 400, col: DIM });
    txt('→ ' + res, px + 76, y + 28, 17, { font: 'Geist Mono', w: 400, col: GREEN }); c.restore(); });
  const dp = pop(prog(lt, 4.7, 5.3)); c.save(); c.globalAlpha *= a * clamp(dp); txt('Done. First email goes out in 2 hours.', px + 30, py + 330, 19, { font: 'Geist Mono', w: 400, col: GREEN }); c.restore();
  txt('It drafts, segments and schedules. ', 90, 660, 22, { col: GREY, alpha: a * prog(lt, 5.2, 5.9), w: 400 });
  c.font = '400 22px "Geist"'; txt('You keep the last click.', 90 + c.measureText('It drafts, segments and schedules. ').width, 660, 22, { alpha: a * prog(lt, 5.5, 6.2), w: 700 });
  const names = ['ChatGPT', 'Claude', 'Cursor', 'Hermes', 'OpenClaw']; let cx = 760;
  txt('RUNS INSIDE', cx, 660, 12, { col: DIM, spacing: 2, w: 700, alpha: a * prog(lt, 5.2, 5.9) }); cx += 118;
  names.forEach((n, i) => { txt(n, cx, 660, 16, { col: GREY, w: 700, alpha: a * prog(lt, 5.3 + i * 0.12, 5.9 + i * 0.12) }); c.font = '700 16px "Geist"'; cx += c.measureText(n).width + 16; });
}
function node(x, y, w, title, sub, a, hot = 0) {
  c.save(); c.globalAlpha *= a; rr(x, y, w, 78, 14); c.fillStyle = hot > 0.5 ? 'rgba(255,61,0,0.16)' : '#17171B'; c.fill();
  c.strokeStyle = hot > 0.5 ? RED2 : LINE; c.lineWidth = hot > 0.5 ? 2 : 1.2; c.stroke();
  txt(title, x + w / 2, y + 34, 18, { align: 'center', w: 700 }); txt(sub, x + w / 2, y + 60, 14, { align: 'center', col: GREY, w: 400 }); c.restore();
}
function wire(x1, y1, x2, y2, p, a, t) {
  c.save(); c.globalAlpha *= a; c.strokeStyle = '#3A3A42'; c.lineWidth = 2; c.setLineDash([6, 6]); c.lineDashOffset = -t * 26;
  c.beginPath(); c.moveTo(x1, y1); c.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2); c.stroke(); c.setLineDash([]);
  const u = clamp(p), mx = Math.pow(1 - u, 3) * x1 + 3 * Math.pow(1 - u, 2) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u * x2;
  const my = Math.pow(1 - u, 3) * y1 + 3 * Math.pow(1 - u, 2) * u * ((y1 + y2) / 2) + 3 * (1 - u) * u * u * ((y1 + y2) / 2) + u * u * u * y2;
  if (p > 0 && p < 1) { const g = c.createRadialGradient(mx, my, 1, mx, my, 18); g.addColorStop(0, 'rgba(255,150,90,0.95)'); g.addColorStop(1, 'rgba(255,61,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, 18, 0, 7); c.fill(); c.fillStyle = '#FFD9C7'; c.beginPath(); c.arc(mx, my, 4, 0, 7); c.fill(); }
  c.restore();
}
function s5(t) { // 23-29 workflows
  const lt = t - 23, a = fadeIO(t, 23, 29);
  kicker('Workflows', W / 2, 84, a, 'center'); txt('Sequences that keep running.', W / 2, 138, 42, { align: 'center', alpha: a * easeOut(prog(lt, 0.1, 0.8)) });
  const cx = W / 2, w = 300;
  const travel = prog(lt, 1.6, 5.2) * 3;
  wire(cx, 248, cx, 286, travel, a, t); wire(cx, 364, cx, 402, travel - 1, a, t);
  wire(cx, 480, cx - 190, 530, travel - 2, a, t); wire(cx, 480, cx + 190, 530, travel - 2.4, a, t);
  node(cx - w / 2, 170, w, 'Tag added', 'newsletter', a * easeOut(prog(lt, 0.4, 1)), travel < 0.4 && lt > 1.2 ? 1 : 0);
  node(cx - w / 2, 286, w, 'Send email', 'Welcome, start here', a * easeOut(prog(lt, 0.7, 1.3)), travel > 0.9 && travel < 1.5 ? 1 : 0);
  node(cx - w / 2, 402, w, 'Wait · If opened?', '2 days → branch', a * easeOut(prog(lt, 1, 1.6)), travel > 1.9 && travel < 2.5 ? 1 : 0);
  node(cx - 340, 530, 300, 'YES → Offer', 'launch sequence', a * pop(prog(lt, 4.2, 4.9)), 1);
  node(cx + 40, 530, 300, 'NO → Nudge', 'one more angle', a * pop(prog(lt, 4.5, 5.2)), 0);
  txt('Publish once. Lumail handles enrolment, timing and exits.', cx, 686, 21, { align: 'center', col: GREY, alpha: a * prog(lt, 4.9, 5.6), w: 400 });
}
function s6(t) { // 29-34 transactional
  const lt = t - 29, a = fadeIO(t, 29, 34);
  kicker('Transactional', 90, 92, a); txt('Replace Resend.', 90, 148, 46, { alpha: a * easeOut(prog(lt, 0.1, 0.8)) }); txt('Same domain.', 90, 202, 46, { col: GREY, alpha: a * easeOut(prog(lt, 0.35, 1)) });
  const px = 90, py = 246; panel(px, py, 660, 330, 'send.ts', a);
  const code = ['import { Lumail } from "lumail";', '', 'await lumail.emails.send({', '  to: "maya@studio.co",', '  subject: "Your login code",', '  content: "# Your code\\n\\n{{code}}"', '});'];
  code.forEach((l, i) => { const p = prog(lt, 0.9 + i * 0.28, 1.4 + i * 0.28); txt(l.slice(0, Math.floor(p * l.length * 1.6)), px + 28, py + 92 + i * 30, 18, { font: 'Geist Mono', w: 400, col: i === 2 ? '#FFD9C7' : '#C9D1D9', alpha: a }); });
  const qp = pop(prog(lt, 3.1, 3.7)); c.save(); c.globalAlpha *= a * clamp(qp); txt('queued · priority lane · 40/sec', px + 28, py + 308, 17, { font: 'Geist Mono', w: 400, col: GREEN }); c.restore();
  // race lanes
  const lx = 810, lw = 380;
  txt('CAMPAIGN LANE', lx, 300, 12, { col: DIM, spacing: 2, w: 700, alpha: a }); txt('PRIORITY LANE', lx, 420, 12, { col: RED2, spacing: 2, w: 700, alpha: a });
  [316, 436].forEach(y => { c.save(); c.globalAlpha *= a; rr(lx, y, lw, 14, 7); c.fillStyle = '#1B1B1F'; c.fill(); c.restore(); });
  const r1 = easeInOut(prog(lt, 1.6, 4.6)), r2 = easeOut(prog(lt, 1.6, 2.6));
  const dot = (x, y, col, label) => { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); txt(label, x, y + 38, 14, { align: 'center', col, w: 700 }); c.restore(); };
  dot(lx + 12 + r1 * (lw - 24), 323, '#8E8E98', '50k campaign'); dot(lx + 12 + r2 * (lw - 24), 443, RED2, 'OTP 482 913');
  txt('A campaign never', lx, 516, 22, { col: GREY, alpha: a * prog(lt, 3, 3.7), w: 400 }); txt('delays a login code.', lx, 548, 22, { alpha: a * prog(lt, 3.25, 3.95), w: 700 });
  txt('Receipts, resets and the newsletter — one dashboard, one bill.  ·  API · SDK · SMTP smtp.lumail.io:587', 90, 640, 18, { col: GREY, alpha: a * prog(lt, 3.8, 4.5), w: 400 });
}
function s7(t) { // 34-39.5 pricing + migration
  const lt = t - 34, a = fadeIO(t, 34, 39.5);
  kicker('Pricing', W / 2, 92, a, 'center');
  txt('Pay for emails sent.', W / 2, 164, 52, { align: 'center', alpha: a * easeOut(prog(lt, 0.1, 0.8)) });
  const p2 = easeOut(prog(lt, 0.7, 1.5)); c.save(); c.globalAlpha *= a * p2;
  c.font = '700 52px "Geist"'; const s1 = 'Never ', s2 = 'for subscribers stored.'; const tot = c.measureText(s1 + s2).width; let x = W / 2 - tot / 2; c.textAlign = 'left'; c.fillStyle = RED2; c.fillText(s1, x, 230); x += c.measureText(s1).width; c.fillStyle = GREY; c.fillText(s2, x, 230); c.restore();
  const card = (x, big, label, sub, d, col = INK) => { const p = pop(prog(lt, d, d + 0.6)); c.save(); c.translate(x + 150, 400); c.scale(clamp(p), clamp(p)); c.globalAlpha *= a;
    rr(-150, -96, 300, 192, 18); c.fillStyle = CARD; c.fill(); c.strokeStyle = LINE; c.stroke();
    txt(big, 0, -8, 54, { align: 'center', col }); txt(label, 0, 34, 15, { align: 'center', col: GREY, w: 500 }); txt(sub, 0, 64, 13, { align: 'center', col: DIM, w: 400 }); c.restore(); };
  const subs = Math.round(easeOut(prog(lt, 1.5, 3.2)) * 50000).toLocaleString('en-US');
  card(150, subs, 'subscribers stored', 'dormant contacts cost $0', 1.4);
  card(490, '$0', 'per-contact fees', 'no line on the invoice', 1.7, GREEN);
  card(830, '3,000', 'emails / month free', 'no card required', 2.0, RED2);
  const mp = prog(lt, 3.3, 4.1); c.save(); c.globalAlpha *= a * mp;
  txt('Migrate in under 10 minutes:', 90, 588, 19, { col: GREY, w: 400 }); c.font = '700 19px "Geist"';
  let mx = 90 + 300; ['Mailchimp', 'Kit', 'Brevo', 'beehiiv', 'MailerLite', 'Resend'].forEach((n, i) => { const w = c.measureText(n).width + 26; const pp = pop(prog(lt, 3.5 + i * 0.14, 4 + i * 0.14)); c.save(); c.translate(mx + w / 2, 578); c.scale(clamp(pp), clamp(pp)); rr(-w / 2, -24, w, 40, 999); c.fillStyle = '#17171B'; c.fill(); c.strokeStyle = LINE; c.stroke(); txt(n, 0, 6, 16, { align: 'center', col: GREY, w: 700 }); txt('→', w / 2 + 8, 6, 16, { col: RED2, w: 700 }); c.restore(); mx += w + 28; });
  logo(mx + 4, 556, 40, a); c.restore();
  txt('“I’ve sent over 3 million emails with Lumail.”  — Melvyn, melvynx.com', W / 2, 672, 18, { align: 'center', col: DIM, alpha: a * prog(lt, 4.2, 5), w: 400 });
}
function s8(t) { // 39.5-45 finale (no fade out)
  const lt = t - 39.5, a = prog(t, 39.5, 39.95);
  const lp = pop(prog(lt, 0.1, 0.9)), s = 118 * clamp(lp);
  logo(W / 2 - s / 2, 96 - s / 2 + 59, Math.max(s, 0.1), a, 0.8 + 0.25 * Math.sin(lt * 2.2));
  txt('Import your list.', W / 2, 330 + (1 - easeOut(prog(lt, 0.6, 1.3))) * 30, 66, { align: 'center', alpha: a * easeOut(prog(lt, 0.6, 1.3)) });
  const sp = pop(prog(lt, 1.15, 1.9)); c.save(); c.translate(W / 2, 392); c.scale(clamp(sp), clamp(sp)); txt('Send tonight.', 0, 22, 66, { align: 'center', col: RED2, alpha: a }); c.restore();
  const bp = pop(prog(lt, 1.9, 2.6)); c.save(); c.translate(W / 2, 508); c.scale(clamp(bp), clamp(bp)); c.globalAlpha *= a;
  rr(-118, -32, 236, 64, 999); c.fillStyle = INK; c.fill(); txt('Start free  →', 0, 9, 24, { align: 'center', col: '#0B0B0C' }); c.restore();
  txt('3,000 emails/month free · no card', W / 2, 584, 21, { align: 'center', col: GREY, alpha: a * prog(lt, 2.4, 3.1), w: 500 });
  brand(W / 2 - 92, 618, 38, a * prog(lt, 2.9, 3.6), 24);
  txt('lumail.io', W / 2 + 120, 644, 21, { col: DIM, font: 'Geist Mono', w: 400, alpha: a * prog(lt, 3.1, 3.8) });
  // confetti envelopes rising
  for (let i = 0; i < 22; i++) { const pp = ((lt * 0.14 + i * 0.13) % 1), ex = 90 + ((i * 211) % 1100), ey = 740 - pp * 780; c.save(); c.translate(ex, ey); c.rotate(Math.sin(i * 5 + lt * 2) * 0.4); c.globalAlpha *= a * (1 - pp) * 0.75; rr(-13, -9, 26, 18, 4); c.fillStyle = i % 4 ? '#1E1E23' : RED; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.stroke(); c.beginPath(); c.moveTo(-13, -9); c.lineTo(0, 1); c.lineTo(13, -9); c.stroke(); c.restore(); }
}
const SCENES = [[0, 5, s1], [5, 10, s2], [10, 16, s3], [16, 23, s4], [23, 29, s5], [29, 34, s6], [34, 39.5, s7], [39.5, 45.01, s8]];
function frame(t) { bg(t); for (const [start, end, fn] of SCENES) if (t >= start - 0.45 && t <= end + 0.05) fn(t); }

/* ---------- AUDIO (synth bed, 116 BPM, D major) ---------- */
function makeAudio(path) {
  const SR = 44100, n = SR * DUR, L = new Float32Array(n), R = new Float32Array(n);
  const beat = 60 / 116;
  const add = (t0, dur, fn) => { const s = Math.floor(t0 * SR), e = Math.min(n, s + Math.floor(dur * SR)); for (let i = s; i < e; i++) { const v = fn((i - s) / SR, i / SR); L[i] += v[0]; R[i] += v[1]; } };
  const pluck = (f, amp) => (dt) => { const v = amp * Math.exp(-dt * 7) * (Math.sin(2 * Math.PI * f * dt) * 0.7 + Math.sin(2 * Math.PI * f * 2 * dt) * 0.25); return [v, v * 0.92]; };
  const chords = [[146.83, 220, 293.66, 369.99], [123.47, 185, 246.94, 311.13], [98, 196, 246.94, 293.66], [110, 220, 277.18, 329.63]];
  let b = 0;
  for (let bar = 0; bar < 21; bar++) { const ch = chords[bar % 4], t0 = bar * 4 * beat; if (t0 > 44) break;
    const gain = bar === 0 ? 0.4 : 1;
    for (let k = 0; k < 4; k++) { const kt = t0 + k * beat; add(kt, 0.22, dt => { const f = 130 * Math.exp(-dt * 22) + 42; const v = 0.5 * gain * Math.exp(-dt * 10) * Math.sin(2 * Math.PI * f * dt); return [v, v]; });
      add(kt + beat / 2, 0.05, dt => { const v = 0.06 * gain * (Math.random() * 2 - 1) * Math.exp(-dt * 90); return [v, v]; }); }
    add(t0, beat * 4, dt => { const v = 0.16 * gain * Math.sin(2 * Math.PI * ch[0] * 0.5 * dt) * Math.min(1, dt * 8) * Math.exp(-dt * 0.7); return [v, v]; });
    for (let s = 0; s < 8; s++) add(t0 + s * beat / 2, 0.4, pluck(ch[[0, 1, 2, 3, 2, 1, 2, 3][s]] * 2, 0.11 * gain));
    b++; }
  add(38.6, 0.9, dt => { const v = 0.1 * (dt / 0.9) * (Math.random() * 2 - 1) * Math.sin(Math.PI * dt / 0.9); return [v, v]; });
  [293.66, 369.99, 440, 587.33].forEach(f => add(39.55, 2.6, dt => { const v = 0.09 * Math.exp(-dt * 1.4) * Math.sin(2 * Math.PI * f * dt); return [v, v]; }));
  add(39.55, 0.5, dt => { const v = 0.55 * Math.exp(-dt * 8) * Math.sin(2 * Math.PI * (120 * Math.exp(-dt * 18) + 40) * dt); return [v, v]; });
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { const fade = Math.min(1, i / (SR * 0.15), (n - i) / (SR * 1.2)); buf.writeInt16LE(clamp(L[i] * fade, -1, 1) * 30000, 44 + i * 4); buf.writeInt16LE(clamp(R[i] * fade, -1, 1) * 30000, 46 + i * 4); }
  writeFileSync(path, buf);
}

/* ---------- RENDER ---------- */
if (process.argv.includes('--stills')) {
  for (const t of [2.5, 7.5, 13.5, 20, 26.5, 31.8, 37, 42.5]) { frame(t); writeFileSync(`frames/still-${String(t).replace('.', '_')}.png`, await canvas.encode('png')); console.log('still', t); }
} else {
  makeAudio('audio.wav'); console.log('audio.wav written');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', 'audio.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-t', String(DUR), '-movflags', '+faststart', 'video.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < TOTAL; i++) { frame(i / FPS); const png = await canvas.encode('png'); if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r)); if (i % 150 === 0) console.log(`frame ${i}/${TOTAL}`); }
  ff.stdin.end(); await new Promise((res, rej) => { ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg ' + code))); });
  console.log('video.mp4 done');
}
