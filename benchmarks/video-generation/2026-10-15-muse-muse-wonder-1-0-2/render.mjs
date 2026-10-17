import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';

GlobalFonts.registerFromPath('assets/Geist-Bold.ttf', 'GeistBold');
GlobalFonts.registerFromPath('assets/Geist-Medium.ttf', 'GeistMed');
GlobalFonts.registerFromPath('assets/Geist-Regular.ttf', 'Geist');
GlobalFonts.registerFromPath('assets/Jakarta-Bold.ttf', 'Jakarta');
GlobalFonts.registerFromPath('assets/Instrument-Italic.ttf', 'SerifIt');

const W = 1280, H = 720, FPS = 30, DUR = 45, N = FPS * DUR;
mkdirSync('frames', { recursive: true });
const cv = createCanvas(W, H), x = cv.getContext('2d');

const INK = '#1a1614', DARK = '#131110', CREAM = '#f8f7f4', PAPER = '#fffdf8';
const RED = '#ff3300', CORAL = '#f26a4b', PEACH = '#ffe3d9', WASH = '#fbeee7';
const MUT = '#97907f', LINE = '#e9e2d8', GREEN = '#0e9f6e', GOLD = '#ffb020';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const eio = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const seg = (t, a, b) => eo((t - a) / (b - a));
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(1234567);
const PR = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.2, s: .2 + rnd() * .8, o: .15 + rnd() * .5 }));

function rr(c, px, py, w, h, r) { c.beginPath(); c.roundRect(px, py, w, h, r); }
function bg(color) { x.fillStyle = color; x.fillRect(0, 0, W, H); }
function glow(cx, cy, r, color, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.globalAlpha = a; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore(); }
function dots(t, dark) { x.save(); x.fillStyle = dark ? 'rgba(248,247,244,0.05)' : 'rgba(26,22,20,0.055)'; for (let i = 0; i < 40; i++) for (let j = 0; j < 22; j++) { x.beginPath(); x.arc(24 + i * 32, 24 + j * 32, 1.4, 0, 7); x.fill(); } x.restore(); }
function parts(t, dark) { for (const p of PR) { const yy = (p.y - t * 14 * p.s) % H; x.save(); x.globalAlpha = p.o * (dark ? .8 : .45); x.fillStyle = dark ? PEACH : CORAL; x.beginPath(); x.arc(p.x, yy < 0 ? yy + H : yy, p.r, 0, 7); x.fill(); x.restore(); } }
function txt(s, px, py, font, color, align = 'left', alpha = 1, ls = 0) { x.save(); x.globalAlpha = alpha; x.fillStyle = color; x.font = font; x.textAlign = align; x.textBaseline = 'middle'; if (ls) { try { x.letterSpacing = ls + 'px'; } catch {} } x.fillText(s, px, py); x.restore(); }
const FB = s => `${s}px GeistBold`, FM = s => `${s}px GeistMed`, FR = s => `${s}px Geist`, FJ = s => `${s}px Jakarta`, FS = s => `${s}px SerifIt`;
function pill(px, py, s, fill, color, font) { x.save(); x.font = font || FM(20); const w = x.measureText(s).width + 40; rr(x, px - w / 2, py - 21, w, 42, 21); x.fillStyle = fill; x.fill(); x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, px, py + 1); x.restore(); return w; }
function envelope(cx, cy, s, body, flap) { x.save(); x.translate(cx, cy); rr(x, -s, -s * .72, s * 2, s * 1.44, s * .22); x.fillStyle = body; x.fill(); x.beginPath(); x.moveTo(-s, -s * .72); x.lineTo(0, s * .08); x.lineTo(s, -s * .72); x.closePath(); x.fillStyle = flap; x.fill(); x.restore(); }
function logo(cx, cy, s, darkBg) { rr(x, cx - s, cy - s, s * 2, s * 2, s * .52); x.fillStyle = RED; x.fill(); envelope(cx, cy + s * .04, s * .58, '#ffffff', PEACH); txt('Lumail', cx + s * 1.35, cy + 2, FJ(44 * s / 30), darkBg ? CREAM : INK, 'left'); }
function spark(cx, cy, s, color, a) { x.save(); x.globalAlpha = a; x.translate(cx, cy); x.fillStyle = color; x.beginPath(); x.moveTo(0, -s); x.quadraticCurveTo(s * .14, -s * .14, s, 0); x.quadraticCurveTo(s * .14, s * .14, 0, s); x.quadraticCurveTo(-s * .14, s * .14, -s, 0); x.quadraticCurveTo(-s * .14, -s * .14, 0, -s); x.fill(); x.restore(); }
function check(cx, cy, r, fill) { x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = fill; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = r * .22; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - r * .45, cy); x.lineTo(cx - r * .1, cy + r * .38); x.lineTo(cx + r * .5, cy - r * .35); x.stroke(); x.restore(); }
function bar(px, py, w, h, frac, color, track) { rr(x, px, py, w, h, h / 2); x.fillStyle = track; x.fill(); if (frac > 0) { rr(x, px, py, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); x.fillStyle = color; x.fill(); } }
function win(px, py, w, h, title) { rr(x, px, py, w, h, 20); x.fillStyle = PAPER; x.fill(); x.strokeStyle = LINE; x.lineWidth = 2; x.stroke(); rr(x, px, py, w, 52, 20); x.fillStyle = WASH; x.fill(); x.fillRect(px, py + 32, w, 20); ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.beginPath(); x.arc(px + 28 + i * 24, py + 26, 6, 0, 7); x.fillStyle = c; x.fill(); }); txt(title, px + w / 2, py + 27, FM(17), '#8a8178', 'center'); }
function sceneFade(t, a, b) { return clamp(Math.min(seg(t, a, a + .45), 1 - seg(t, b - .45, b)), 0, 1); }

function S1(t) { // 0-5 hook
  bg(DARK); dots(t, 1); glow(640, 330, 520, 'rgba(255,51,0,0.55)', .28 + .08 * Math.sin(t * 2)); parts(t, 1);
  const a = sceneFade(t, 0, 5); x.save(); x.globalAlpha = a;
  pill(640, 92, 'EMAIL MARKETING, 2026', 'rgba(255,227,217,0.12)', PEACH, FM(17));
  const w1 = seg(t, .3, .8), w2 = seg(t, .9, 1.4), w3 = seg(t, 1.5, 2.0);
  txt('Still paying', 640, 218 - (1 - w1) * 40, FB(84), CREAM, 'center', w1);
  txt('per contact?', 640, 306 - (1 - w2) * 40, FB(84), CREAM, 'center', w2);
  // strike
  const st = seg(t, 2.1, 2.7); x.save(); x.strokeStyle = RED; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(330, 300); x.lineTo(330 + 620 * st, 292); x.stroke(); x.restore();
  txt('Your list grows. Your bill explodes.', 640, 392, FS(38), PEACH, 'center', seg(t, 2.4, 3.0));
  // price cards flying
  const cards = [['500 contacts', '$20/mo'], ['5,000 contacts', '$89/mo'], ['50,000 contacts', '$389/mo']];
  cards.forEach((c, i) => { const p = seg(t, 2.6 + i * .35, 3.3 + i * .35); const cx = 290 + i * 350, cy = lp(760, 520, p); x.save(); x.translate(cx, cy); x.rotate((i - 1) * .04); rr(x, -140, -52, 280, 104, 16); x.fillStyle = 'rgba(248,247,244,0.07)'; x.fill(); x.strokeStyle = 'rgba(248,247,244,0.18)'; x.stroke(); txt(c[0], 0, -16, FM(20), '#cfc8bc', 'center'); txt(c[1], 0, 20, FB(30), i === 2 ? CORAL : CREAM, 'center'); x.restore(); });
  x.restore();
}
function S2(t) { // 5-10 reveal
  const lt = t - 5; bg(CREAM); dots(t, 0); glow(640, 300, 560, 'rgba(255,99,61,0.35)', .35); parts(t, 0);
  const a = sceneFade(t, 5, 10); x.save(); x.globalAlpha = a;
  const pop = eo(clamp(lt / .7, 0, 1)); x.save(); x.translate(640, 242); x.scale(.6 + .4 * pop, .6 + .4 * pop); logo(-118, 0, 34, false); x.restore();
  txt('Meet Lumail.', 640, 356 - (1 - seg(lt, .5, 1.1)) * 30, FB(66), INK, 'center', seg(lt, .5, 1.1));
  txt('The AI tools that will make you ', 512, 428, FS(40), '#6d655b', 'center', seg(lt, 1.1, 1.7));
  txt('love email again.', 838, 428, FS(40), RED, 'center', seg(lt, 1.5, 2.1));
  pill(640, 500, 'AI-NATIVE  ·  NEWSLETTERS  ·  AUTOMATIONS  ·  TRANSACTIONAL', PEACH, INK, FM(16));
  // envelopes burst (behind headline, kept clear of text band)
  for (let i = 0; i < 7; i++) { const p = seg(lt, .2 + i * .1, 1.6 + i * .1); const ang = (i / 7) * Math.PI * 2 + .4; envelope(640 + Math.cos(ang) * 400 * p, 190 + Math.sin(ang) * 95 * p, 15, i % 2 ? '#fff' : PEACH, i % 2 ? PEACH : '#fff'); }
  spark(1030, 180, 20 + 6 * Math.sin(t * 3), RED, seg(lt, 1.8, 2.4)); spark(225, 175, 14, CORAL, seg(lt, 2.0, 2.6));
  x.restore();
}
function S3(t) { // 10-16 pricing model
  const lt = t - 10; bg(DARK); dots(t, 1); glow(320, 200, 420, 'rgba(255,51,0,0.5)', .25); parts(t, 1);
  const a = sceneFade(t, 10, 16); x.save(); x.globalAlpha = a;
  pill(640, 84, 'PRICING THAT DOESN’T PUNISH YOU', 'rgba(255,227,217,0.12)', PEACH, FM(16));
  txt('Unlimited subscribers.', 640, 168, FB(58), CREAM, 'center', seg(lt, .2, .8));
  const n = Math.round(eio(clamp((lt - .6) / 2.2, 0, 1)) * 100000);
  txt(n.toLocaleString('en-US') + '+', 640, 262, FB(96), RED, 'center', seg(lt, .6, 1.1));
  txt('contacts stored — $0 extra, forever', 640, 326, FM(24), '#cfc8bc', 'center', seg(lt, 1.4, 2.0));
  // comparison bars
  const bx = 240, bw = 800;
  txt('Per-contact tools', bx, 402, FM(19), MUT, 'left', seg(lt, 2.0, 2.5)); bar(bx, 424, bw, 20, seg(lt, 2.1, 3.9) * .98, CORAL, 'rgba(255,255,255,0.1)'); txt('bill grows with your list ↑', bx + bw, 434, FM(18), CORAL, 'right', seg(lt, 3.2, 3.8));
  txt('Lumail — pay per email sent', bx, 486, FM(19), PEACH, 'left', seg(lt, 2.3, 2.8)); bar(bx, 508, bw, 20, seg(lt, 2.4, 3.4) * .34, RED, 'rgba(255,255,255,0.1)'); txt('flat & predictable', bx + bw, 518, FM(18), PEACH, 'right', seg(lt, 3.2, 3.8));
  pill(640, 590, 'YOU PAY FOR EMAILS SENT. NOTHING ELSE.', RED, '#fff', FB(19));
  x.restore();
}
function S4(t) { // 16-22 AI editor
  const lt = t - 16; bg(CREAM); dots(t, 0); glow(900, 160, 420, 'rgba(255,99,61,0.3)', .3);
  const a = sceneFade(t, 16, 22); x.save(); x.globalAlpha = a;
  pill(300, 92, 'AI EDITOR', PEACH, INK, FM(17));
  txt('Describe it.', 96, 168, FB(52), INK, 'left', seg(lt, .1, .6)); txt('Lumail writes it.', 96, 228, FS(52), RED, 'left', seg(lt, .5, 1.0));
  win(96, 280, 520, 330, 'app.lumail.io — Editor');
  const prompt = 'Write a launch email for our new feature…';
  const typed = prompt.slice(0, Math.floor(clamp((lt - .8) / 1.4, 0, 1) * prompt.length));
  rr(x, 124, 356, 464, 52, 12); x.fillStyle = WASH; x.fill(); txt(typed + (lt < 2.4 ? '|' : ''), 144, 383, FR(19), INK, 'left');
  const gen = seg(lt, 2.4, 3.0); if (gen > 0) { rr(x, 376, 428, 212, 46, 23); x.fillStyle = RED; x.globalAlpha = a * gen; x.fill(); x.globalAlpha = a; txt('Generate', 482, 452, FB(20), '#fff', 'center'); }
  // drafted email right
  const d = seg(lt, 3.0, 3.7); x.save(); x.translate(lp(90, 0, d), 0); x.globalAlpha = a * d; win(660, 150, 524, 460, 'Draft — ready to send');
  pill(922, 238, 'SUBJECT · AI PICKED WINNER', WASH, CORAL, FM(14));
  txt('It’s live. Here’s what’s new →', 692, 282, FB(25), INK, 'left');
  [430, 392, 354, 300].forEach((w, i) => { rr(x, 692, 318 + i * 34, w * seg(lt, 3.3 + i * .18, 3.9 + i * .18), 13, 7); x.fillStyle = i ? LINE : PEACH; x.fill(); });
  rr(x, 692, 472, 460, 62, 12); x.fillStyle = '#fff'; x.strokeStyle = LINE; x.stroke(); txt('Quick poll — what should we build next?', 712, 494, FM(16), INK, 'left'); pill(760, 518, 'Roadmap', INK, '#fff', FM(13)); pill(880, 518, 'Design', PAPER, INK, FM(13));
  rr(x, 692, 552, 190, 40, 20); x.fillStyle = RED; x.fill(); txt('Send campaign →', 787, 573, FB(17), '#fff', 'center'); x.restore();
  spark(118, 640, 16, RED, seg(lt, 3.4, 4.0)); x.restore();
}
function S5(t) { // 22-28 workflows
  const lt = t - 22; bg(DARK); dots(t, 1); glow(640, 360, 560, 'rgba(255,51,0,0.45)', .22); parts(t, 1);
  const a = sceneFade(t, 22, 28); x.save(); x.globalAlpha = a;
  pill(640, 84, 'GRAPH WORKFLOWS — ON EVERY PLAN', 'rgba(255,227,217,0.12)', PEACH, FM(16));
  txt('Set it once. ', 470, 152, FB(52), CREAM, 'center', seg(lt, .1, .6)); txt('It sells while you sleep.', 862, 152, FS(50), PEACH, 'center', seg(lt, .5, 1.0));
  const nodes = [{ x: 150, y: 330, l: 'Trigger', s: 'New subscriber' }, { x: 405, y: 330, l: 'Welcome', s: 'Email #1' }, { x: 660, y: 240, l: 'Branch', s: 'Clicked?' }, { x: 660, y: 430, l: 'Wait 2 days', s: 'Then follow up' }, { x: 935, y: 240, l: 'Offer', s: 'Email #2' }];
  // links
  x.save(); x.strokeStyle = 'rgba(255,227,217,0.35)'; x.lineWidth = 3; x.setLineDash([8, 8]); x.lineDashOffset = -t * 30;
  const links = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]];
  links.forEach(([i, j], k) => { const p = seg(lt, 1.0 + k * .3, 1.6 + k * .3); x.beginPath(); x.moveTo(nodes[i].x + 95, nodes[i].y); x.lineTo(lp(nodes[i].x + 95, nodes[j].x - 95, p), lp(nodes[i].y, nodes[j].y, p)); x.stroke(); }); x.restore();
  nodes.forEach((n, i) => { const p = seg(lt, .8 + i * .3, 1.3 + i * .3); x.save(); x.translate(n.x, n.y); x.scale(.7 + .3 * p, .7 + .3 * p); x.globalAlpha = a * p; rr(x, -105, -52, 210, 104, 16); x.fillStyle = i === 0 ? RED : 'rgba(248,247,244,0.08)'; x.fill(); x.strokeStyle = 'rgba(255,227,217,0.4)'; x.stroke(); txt(n.l, 0, -14, FB(22), i === 0 ? '#fff' : CREAM, 'center'); txt(n.s, 0, 20, FR(16), i === 0 ? PEACH : MUT, 'center'); x.restore(); });
  // travelling envelope
  const tp = (lt - 1.6) % 3.4 / 3.4; if (lt > 1.6) { const path = [[245, 330], [405, 330], [565, 285], [760, 240], [840, 240]]; const fi = clamp(tp * (path.length - 1), 0, path.length - 1.001); const i0 = Math.floor(fi); envelope(lp(path[i0][0], path[i0 + 1][0], fi - i0), lp(path[i0][1], path[i0 + 1][1], fi - i0), 16, '#fff', PEACH); }
  pill(640, 590, 'WELCOMES  ·  LAUNCHES  ·  FOLLOW-UPS  ·  WIN-BACKS', 'rgba(248,247,244,0.08)', '#e8e2d6', FM(16));
  x.restore();
}
function S6(t) { // 28-34 agents/API
  const lt = t - 28; bg(CREAM); dots(t, 0); glow(300, 160, 400, 'rgba(255,99,61,0.3)', .3);
  const a = sceneFade(t, 28, 34); x.save(); x.globalAlpha = a;
  pill(640, 84, 'BUILT FOR HUMANS. OPEN TO AGENTS.', PEACH, INK, FM(16));
  txt('Your agents can send, too.', 640, 152, FB(50), INK, 'center', seg(lt, .1, .6));
  win(70, 200, 560, 330, 'terminal — zsh');
  const lines = ['$ npx lumail auth login', 'Signed in as your org', '$ npx lumail campaign send', '> 12,480 emails queued'];
  lines.forEach((s, i) => txt(s, 100, 268 + i * 44, FR(20), i === 3 ? RED : i % 2 ? GREEN : INK, 'left', seg(lt, .8 + i * .5, 1.3 + i * .5)));
  win(650, 200, 560, 330, 'TypeScript SDK');
  const code = ['import { Lumail } from "lumail";', '', 'await lumail.emails.send({', '  to: user@company.com,', '  subject: "Welcome aboard",', '});  // transactional lane'];
  code.forEach((s, i) => txt(s || ' ', 680, 262 + i * 36, FR(18), i === 0 ? CORAL : INK, 'left', seg(lt, 1.2 + i * .28, 1.6 + i * .28)));
  const chips = [['MCP · 139 tools for AI agents', RED, '#fff'], ['REST API + OpenAPI', INK, '#fff'], ['SMTP · smtp.lumail.io:587', PAPER, INK], ['CLI · npx lumail', PAPER, INK]];
  chips.forEach((c, i) => { const px = 235 + (i % 2) * 420 + (i > 1 ? 0 : 0), py = 588 + Math.floor(i / 2) * 0; });
  pill(330, 580, 'MCP · TOOLS FOR AI AGENTS', RED, '#fff', FM(16)); pill(660, 580, 'REST API + OPENAPI', INK, '#fff', FM(16)); pill(950, 580, 'SMTP · smtp.lumail.io:587', PAPER, INK, FM(16));
  pill(640, 638, 'ONE PROVIDER FOR PRODUCT EMAIL + MARKETING', WASH, CORAL, FM(15));
  x.restore();
}
function S7(t) { // 34-39 deliverability + proof
  const lt = t - 34; bg(DARK); dots(t, 1); glow(640, 300, 560, 'rgba(14,159,110,0.35)', .2); parts(t, 1);
  const a = sceneFade(t, 34, 39); x.save(); x.globalAlpha = a;
  pill(640, 84, 'DELIVERABILITY, HANDLED', 'rgba(255,227,217,0.12)', PEACH, FM(16));
  txt('Lands in the inbox.', 640, 158, FB(56), CREAM, 'center', seg(lt, .1, .6)); txt('Not the spam folder.', 640, 218, FS(44), PEACH, 'center', seg(lt, .5, 1.0));
  ['SPF', 'DKIM', 'DMARC'].forEach((s, i) => { const px = 400 + i * 240, p = seg(lt, 1.0 + i * .4, 1.5 + i * .4); x.save(); x.globalAlpha = a * p; rr(x, px - 92, 268, 184, 84, 16); x.fillStyle = 'rgba(248,247,244,0.07)'; x.fill(); x.strokeStyle = 'rgba(255,227,217,0.3)'; x.stroke(); txt(s, px, 302, FB(28), CREAM, 'center'); x.restore(); check(px + 66, 282, 13, GREEN); });
  const big = Math.round(eio(clamp((lt - 1.6) / 1.8, 0, 1)) * 3000000);
  txt(big.toLocaleString('en-US') + '+', 640, 452, FB(84), RED, 'center', seg(lt, 1.6, 2.1));
  txt('emails sent with Lumail', 640, 508, FM(23), '#cfc8bc', 'center', seg(lt, 2.2, 2.7));
  // rising bars
  for (let i = 0; i < 12; i++) { const h = (18 + i * 9) * seg(lt, 2.2 + i * .08, 2.8 + i * .08); rr(x, 340 + i * 52, 640 - h, 34, h, 6); x.fillStyle = i > 8 ? RED : 'rgba(255,227,217,0.35)'; x.fill(); }
  txt('DELIVERED · OPENED · CLICKED — TRACKED IN REAL TIME', 640, 672, FM(15), MUT, 'center', seg(lt, 2.8, 3.3));
  x.restore();
}
function S8(t) { // 39-42.5 pricing cards
  const lt = t - 39; bg(CREAM); dots(t, 0); glow(640, 240, 520, 'rgba(255,99,61,0.3)', .3);
  const a = sceneFade(t, 39, 42.5); x.save(); x.globalAlpha = a;
  txt('Start free.', 470, 118, FB(58), INK, 'center', seg(lt, .1, .55)); txt('Scale when it works.', 830, 118, FS(48), RED, 'center', seg(lt, .45, .9));
  const cards = [{ n: 'FREE', p: '$0', d: '3,000 emails / month', f: 'Unlimited subscribers', hot: 0 }, { n: 'GROWTH', p: '$20', d: '40,000 emails / month', f: 'Workflows + transactional', hot: 1 }, { n: 'SCALE', p: 'Volume', d: 'Pay only per email sent', f: 'No per-contact tax. Ever.', hot: 0 }];
  cards.forEach((c, i) => { const p = seg(lt, .6 + i * .3, 1.2 + i * .3); const cx = 218 + i * 422, cy = lp(60, 0, p); x.save(); x.translate(cx, 360 + cy); x.globalAlpha = a * p; rr(x, -178, -168, 356, 336, 22); x.fillStyle = c.hot ? INK : PAPER; x.fill(); if (c.hot) { x.strokeStyle = RED; x.lineWidth = 3; x.stroke(); } else { x.strokeStyle = LINE; x.lineWidth = 2; x.stroke(); } if (c.hot) pill(0, -132, 'MOST POPULAR', RED, '#fff', FB(13)); txt(c.n, 0, -88, FM(17), c.hot ? PEACH : MUT, 'center'); txt(c.p, 0, -30, FB(56), c.hot ? CREAM : INK, 'center'); txt(c.d, 0, 28, FM(20), c.hot ? '#e8e2d6' : '#6d655b', 'center'); txt(c.f, 0, 72, FR(17), c.hot ? PEACH : CORAL, 'center'); rr(x, -110, 104, 220, 44, 22); x.fillStyle = RED; x.fill(); txt(c.hot ? 'Start sending →' : 'Start free →', 0, 127, FB(17), '#fff', 'center'); x.restore(); });
  txt('No credit card to start  ·  Cancel anytime', 640, 590, FM(19), MUT, 'center', seg(lt, 1.8, 2.3));
  x.restore();
}
function S9(t) { // 42.5-45 CTA
  const lt = t - 42.5; bg(DARK); dots(t, 1); glow(640, 330, 620, 'rgba(255,51,0,0.6)', .35 + .1 * Math.sin(t * 2.5)); parts(t, 1);
  x.save(); const pop = eo(clamp(lt / .6, 0, 1)); x.translate(640, 268); x.scale(.7 + .3 * pop, .7 + .3 * pop); logo(-118, 0, 40, true); x.restore();
  txt('Run your newsletter', 640, 392, FB(54), CREAM, 'center', seg(lt, .5, 1.0));
  txt('on autopilot.', 640, 452, FS(54), PEACH, 'center', seg(lt, .8, 1.3));
  const cp = seg(lt, 1.2, 1.7); x.save(); x.globalAlpha = cp; pill(640, 536, 'lumail.io  →  START FREE', RED, '#fff', FB(22)); x.restore();
  txt('AI-NATIVE EMAIL FOR PEOPLE WHO WRITE, SHIP & SELL', 640, 606, FM(15), MUT, 'center', seg(lt, 1.5, 2.0));
  for (let i = 0; i < 5; i++) envelope(240 + i * 200, 662 + Math.sin(t * 3 + i) * 6, 13, i % 2 ? '#2a2521' : RED, PEACH);
}

const scenes = [[0, 5, S1], [5, 10, S2], [10, 16, S3], [16, 22, S4], [22, 28, S5], [28, 34, S6], [34, 39, S7], [39, 42.5, S8], [42.5, 45.01, S9]];
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  const sc = scenes.find(s => t >= s[0] && t < s[1]) || scenes.at(-1);
  x.clearRect(0, 0, W, H); sc[2](t);
  // brand bug + progress
  txt('lumail.io', 1216, 688, FM(15), sc[0] === 5 || sc[0] === 16 || sc[0] === 28 || sc[0] === 39 ? 'rgba(26,22,20,0.4)' : 'rgba(248,247,244,0.45)', 'right');
  bar(64, 694, 180, 5, t / DUR, RED, 'rgba(128,128,128,0.25)');
  writeFileSync(`frames/${String(f).padStart(4, '0')}.png`, cv.toBuffer('image/png'));
  if (f % 150 === 0) console.log('frame', f, '/', N);
}
console.log('done frames');
