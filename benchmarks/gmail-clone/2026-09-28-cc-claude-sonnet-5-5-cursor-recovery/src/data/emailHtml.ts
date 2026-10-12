/**
 * Composable builders for realistic marketing / transactional email HTML.
 *
 * Rules: inline styles only, safe tags only (table/div/p/a/h1-h3/img/span),
 * images are data-URI SVGs generated here (no network), links use fictional
 * `https://*.example` hosts. Every text parameter is TRUSTED HTML, so use
 * `&amp;` for ampersands.
 */

export type Html = string;

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

const REL = 'target="_blank" rel="noopener noreferrer"';

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** '#rrggbb' + alpha -> rgba(). */
export function tint(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const tbl = (style = ''): Html =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;${style}">`;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function rng(seed: string): () => number {
  let s = hash(seed);
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Images (data-URI SVG only)                                          */
/* ------------------------------------------------------------------ */

export const svgUri = (markup: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;

export function svgImg(markup: string, w: number, h: number, alt = '', style = ''): Html {
  return `<img src="${svgUri(markup)}" width="${w}" height="${h}" alt="${esc(alt)}" style="display:block;border:0;${style}">`;
}

const NS = 'xmlns="http://www.w3.org/2000/svg"';

/** Rounded brand mark with a single letter. */
export function logoMark(letter: string, color: string, size = 28, shape: 'square' | 'circle' | 'squircle' = 'squircle'): Html {
  const rx = shape === 'circle' ? 20 : shape === 'square' ? 4 : 11;
  return svgImg(
    `<svg ${NS} viewBox="0 0 40 40"><rect width="40" height="40" rx="${rx}" fill="${color}"/><text x="20" y="28" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="700" text-anchor="middle" fill="#fff">${esc(letter)}</text></svg>`,
    size,
    size,
    letter,
  );
}

/** Wrap raw SVG shapes in a full <svg> and return a data-URI <img> (maps, wireframes, illustrations). */
export function scene(w: number, h: number, shapes: string, alt = '', style = 'width:100%;height:auto;border-radius:12px'): Html {
  return svgImg(`<svg ${NS} viewBox="0 0 ${w} ${h}">${shapes}</svg>`, w, h, alt, style);
}

export function sparkline(values: number[], color: string, w = 140, h = 36): Html {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const sx = w / (values.length - 1);
  const y = (v: number) => (h - 4 - ((v - min) / (max - min || 1)) * (h - 8)).toFixed(1);
  const pts = values.map((v, i) => `${(i * sx).toFixed(1)},${y(v)}`).join(' ');
  const last = values.length - 1;
  return svgImg(
    `<svg ${NS} viewBox="0 0 ${w} ${h}"><polygon points="0,${h} ${pts} ${w},${h}" fill="${tint(color, 0.14)}"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${(last * sx).toFixed(1)}" cy="${y(values[last])}" r="3" fill="${color}"/></svg>`,
    w,
    h,
    'trend',
  );
}

export function barChart(values: number[], o: { color?: string; w?: number; h?: number; hi?: number; labels?: string[] } = {}): Html {
  const w = o.w ?? 520;
  const h = o.h ?? 120;
  const color = o.color ?? '#6366f1';
  const max = Math.max(...values);
  const gap = 8;
  const bw = (w - gap * (values.length - 1)) / values.length;
  const plot = h - (o.labels ? 18 : 0);
  const bars = values
    .map((v, i) => {
      const bh = Math.max(4, (v / max) * (plot - 6));
      const on = o.hi === undefined || o.hi === i;
      const x = (i * (bw + gap)).toFixed(1);
      const lab = o.labels ? `<text x="${(i * (bw + gap) + bw / 2).toFixed(1)}" y="${h - 4}" font-family="Arial,sans-serif" font-size="10" fill="#8a919c" text-anchor="middle">${esc(o.labels[i] ?? '')}</text>` : '';
      return `<rect x="${x}" y="${(plot - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${on ? color : tint(color, 0.28)}"/>${lab}`;
    })
    .join('');
  return svgImg(`<svg ${NS} viewBox="0 0 ${w} ${h}">${bars}</svg>`, w, h, 'chart', 'max-width:100%;height:auto');
}

/** Deterministic pseudo QR code (not scannable, looks right). */
export function qr(seed: string, size = 116, fg = '#111827'): Html {
  const N = 25;
  const r = rng(seed);
  const origins: Array<[number, number]> = [[0, 0], [N - 7, 0], [0, N - 7]];
  const dark = (x: number, y: number): boolean => {
    for (const [ox, oy] of origins) {
      const dx = x - ox;
      const dy = y - oy;
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
    }
    return r() > 0.5;
  };
  let d = '';
  for (let y = 0; y < N; y++) {
    let run = 0;
    for (let x = 0; x <= N; x++) {
      const on = x < N && dark(x, y);
      if (on) run++;
      else if (run) {
        d += `M${x - run} ${y}h${run}v1h-${run}z`;
        run = 0;
      }
    }
  }
  return svgImg(
    `<svg ${NS} viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><path fill="${fg}" d="${d}"/></svg>`,
    size,
    size,
    'QR code',
  );
}

export function barcode(seed: string, w = 260, h = 54, fg = '#111827'): Html {
  const r = rng(seed);
  let x = 0;
  let on = true;
  let d = '';
  while (x < w) {
    const bw = 1 + Math.floor(r() * 4);
    if (on && x + bw <= w) d += `M${x} 0h${bw}v${h}h-${bw}z`;
    x += bw;
    on = !on;
  }
  return svgImg(`<svg ${NS} viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><path fill="${fg}" d="${d}"/></svg>`, w, h, 'Barcode', 'max-width:100%;height:auto');
}

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

export interface MailOptions {
  /** Preheader (becomes the inbox snippet, hidden in the body). */
  pre?: string;
  bg?: string;
  /** Wrap the body in a white rounded card (default true). */
  card?: boolean;
  radius?: number;
  foot?: Html;
  width?: number;
  text?: string;
}

export function mail(o: MailOptions, ...body: Html[]): Html {
  const pre = o.pre
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:transparent">${o.pre}</div>`
    : '';
  const inner =
    o.card === false
      ? body.join('')
      : `<div style="background:#ffffff;border-radius:${o.radius ?? 16}px;overflow:hidden;border:1px solid rgba(15,23,42,.07)">${body.join('')}</div>`;
  return `<div style="background:${o.bg ?? '#f3f4f6'};padding:24px 12px;font-family:${FONT};color:${o.text ?? '#1f2328'};font-size:15px;line-height:1.55;-webkit-text-size-adjust:100%">${pre}<div style="max-width:${o.width ?? 600}px;margin:0 auto">${inner}${o.foot ?? ''}</div></div>`;
}

/** Padded section. */
export const sec = (inner: Html, pad = '24px 32px', bg?: string): Html =>
  `<div style="padding:${pad};${bg ? `background:${bg};` : ''}">${inner}</div>`;

export const divider = (color = '#e8eaed', m = '20px 0'): Html => `<div style="height:1px;background:${color};margin:${m};line-height:1px;font-size:1px">&nbsp;</div>`;

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export interface TextOpts {
  size?: number;
  color?: string;
  weight?: number | string;
  mb?: number;
  align?: 'left' | 'center' | 'right';
}

const ts = (o: TextOpts, d: { size: number; color: string; mb: number; weight?: number }) =>
  `margin:0 0 ${o.mb ?? d.mb}px;font-size:${o.size ?? d.size}px;color:${o.color ?? d.color};${o.weight ?? d.weight ? `font-weight:${o.weight ?? d.weight};` : ''}${o.align ? `text-align:${o.align};` : ''}`;

export const p = (text: Html, o: TextOpts = {}): Html => `<p style="${ts(o, { size: 15, color: '#3c4043', mb: 14 })}line-height:1.6">${text}</p>`;
export const small = (text: Html, o: TextOpts = {}): Html => `<p style="${ts(o, { size: 12.5, color: '#6b7280', mb: 8 })}line-height:1.5">${text}</p>`;
export const h = (text: Html, o: TextOpts & { level?: 1 | 2 | 3 } = {}): Html => {
  const lv = o.level ?? 2;
  return `<h${lv} style="${ts(o, { size: lv === 1 ? 28 : lv === 2 ? 22 : 17, color: '#111827', mb: 10, weight: 700 })}line-height:1.25;letter-spacing:-.3px;font-family:${FONT}">${text}</h${lv}>`;
};
export const eyebrow = (text: string, color = '#6b7280', mb = 8): Html =>
  `<div style="margin:0 0 ${mb}px;font-size:11.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${color}">${text}</div>`;

export function link(text: Html, href: string, color = '#1a73e8', underline = false): Html {
  return `<a href="${href}" ${REL} style="color:${color};text-decoration:${underline ? 'underline' : 'none'}">${text}</a>`;
}

export const strong = (t: string) => `<strong style="color:#111827">${t}</strong>`;
export const codeChip = (t: string): Html =>
  `<span style="font-family:${MONO};font-size:12.5px;background:#f1f3f4;color:#202124;border-radius:5px;padding:1px 6px">${t}</span>`;

/* ------------------------------------------------------------------ */
/* Bars, banners, buttons                                              */
/* ------------------------------------------------------------------ */

export interface BrandBarOptions {
  name: string;
  color: string;
  letter?: string;
  shape?: 'square' | 'circle' | 'squircle';
  right?: Html;
  dark?: boolean;
  bg?: string;
}

export function brandBar(o: BrandBarOptions): Html {
  const dark = !!o.dark;
  const bg = o.bg ?? (dark ? '#0f172a' : '#ffffff');
  const fg = dark ? '#ffffff' : '#111827';
  const sub = dark ? 'rgba(255,255,255,.62)' : '#6b7280';
  return `<div style="background:${bg};padding:15px 28px;border-bottom:1px solid ${dark ? 'rgba(255,255,255,.08)' : '#eef0f3'}">${tbl()}<tr><td style="width:1%;vertical-align:middle">${logoMark(o.letter ?? o.name[0], o.color, 28, o.shape)}</td><td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;letter-spacing:-.2px;color:${fg}">${o.name}</td>${o.right ? `<td align="right" style="vertical-align:middle;font-size:12.5px;color:${sub}">${o.right}</td>` : ''}</tr></table></div>`;
}

export interface HeroOptions {
  title: string;
  subtitle?: string;
  from: string;
  to: string;
  emoji?: string;
  eyebrow?: string;
  align?: 'left' | 'center';
  angle?: number;
  cta?: Html;
  pad?: string;
  /** Text colour (default white; pass a dark colour for pastel banners). */
  text?: string;
  radius?: number;
}

export function hero(o: HeroOptions): Html {
  const align = o.align ?? 'left';
  const fg = o.text ?? '#ffffff';
  const light = !!o.text;
  const emoji = o.emoji
    ? `<div style="width:54px;height:54px;line-height:54px;border-radius:16px;background:${light ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'};font-size:28px;text-align:center;margin:0 ${align === 'center' ? 'auto' : '0'} 16px">${o.emoji}</div>`
    : '';
  return `<div style="background:${o.from};background-image:radial-gradient(circle at 88% 8%,rgba(255,255,255,${light ? '.5' : '.22'}),rgba(255,255,255,0) 42%),linear-gradient(${o.angle ?? 135}deg,${o.from},${o.to});padding:${o.pad ?? '38px 32px 34px'};text-align:${align};color:${fg};${o.radius ? `border-radius:${o.radius}px;` : ''}">${emoji}${o.eyebrow ? `<div style="font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;opacity:.85;margin:0 0 8px">${o.eyebrow}</div>` : ''}<h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-.7px;color:${fg};font-family:${FONT}">${o.title}</h1>${o.subtitle ? `<p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:${fg};opacity:.9">${o.subtitle}</p>` : ''}${o.cta ? `<div style="margin-top:22px">${o.cta}</div>` : ''}</div>`;
}

export interface ButtonOptions {
  ghost?: boolean;
  small?: boolean;
  block?: boolean;
  text?: string;
  radius?: number;
}

export function button(label: string, href: string, color: string, o: ButtonOptions = {}): Html {
  const pad = o.small ? '8px 16px' : '13px 26px';
  const fs = o.small ? 13.5 : 15.5;
  const fg = o.ghost ? color : (o.text ?? '#ffffff');
  const bg = o.ghost ? 'transparent' : color;
  return `<a href="${href}" ${REL} style="display:${o.block ? 'block' : 'inline-block'};${o.block ? 'text-align:center;' : ''}background:${bg};color:${fg};border:2px solid ${color};border-radius:${o.radius ?? 999}px;padding:${pad};font-size:${fs}px;font-weight:700;text-decoration:none;font-family:${FONT}">${label}</a>`;
}

export const buttons = (...items: Html[]): Html => `<div style="margin:6px 0 4px">${items.map((b) => `<span style="display:inline-block;margin:0 8px 8px 0">${b}</span>`).join('')}</div>`;

export function badge(text: string, color: string, solid = false): Html {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:${solid ? color : tint(color, 0.13)};color:${solid ? '#fff' : color};font-size:11.5px;font-weight:700;line-height:18px;letter-spacing:.2px">${text}</span>`;
}

export function alert(kind: 'info' | 'warn' | 'danger' | 'success', text: Html): Html {
  const m = { info: ['#1a73e8', '#e8f0fe'], warn: ['#d97706', '#fff6e5'], danger: ['#d93025', '#fdecea'], success: ['#188038', '#e6f4ea'] }[kind];
  return `<div style="border-left:4px solid ${m[0]};background:${m[1]};border-radius:8px;padding:12px 16px;font-size:14px;line-height:1.5;color:#1f2328;margin:0 0 16px">${text}</div>`;
}

export interface CardOptions {
  bg?: string;
  border?: string;
  radius?: number;
  pad?: string;
  accent?: string;
  m?: string;
}

export function card(inner: Html, o: CardOptions = {}): Html {
  return `<div style="background:${o.bg ?? '#ffffff'};border:1px solid ${o.border ?? '#e5e7eb'};${o.accent ? `border-left:4px solid ${o.accent};` : ''}border-radius:${o.radius ?? 14}px;padding:${o.pad ?? '18px 20px'};margin:${o.m ?? '0 0 14px'}">${inner}</div>`;
}

export function coupon(code: string, label: string, note: string, color: string): Html {
  return `<div style="border:2px dashed ${color};border-radius:16px;padding:18px 16px;text-align:center;background:${tint(color, 0.06)};margin:0 0 16px"><div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6b7280">${label}</div><div style="font-family:${MONO};font-size:28px;font-weight:800;letter-spacing:5px;color:${color};margin:6px 0">${code}</div><div style="font-size:12.5px;color:#6b7280">${note}</div></div>`;
}

export function checkList(items: Html[], color = '#188038'): Html {
  return `${tbl()}${items.map((t) => `<tr><td style="width:30px;vertical-align:top;padding:5px 0"><span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:${tint(color, 0.14)};color:${color};font-size:12px;font-weight:800;text-align:center">&#10003;</span></td><td style="padding:5px 0;font-size:14.5px;color:#3c4043;line-height:1.5">${t}</td></tr>`).join('')}</table>`;
}

/* ------------------------------------------------------------------ */
/* Data blocks                                                         */
/* ------------------------------------------------------------------ */

export function kv(rows: Array<[string, Html]>, o: { w?: number; size?: number; lines?: boolean; color?: string } = {}): Html {
  const size = o.size ?? 14;
  return `${tbl()}${rows
    .map(([k, v], i) => {
      const line = o.lines !== false && i < rows.length - 1 ? 'border-bottom:1px solid #edeff2;' : '';
      return `<tr><td style="padding:9px 0;${line}color:#6b7280;font-size:${size}px;width:${o.w ?? 38}%;vertical-align:top">${k}</td><td style="padding:9px 0;${line}color:${o.color ?? '#111827'};font-size:${size}px;font-weight:600;text-align:right;vertical-align:top">${v}</td></tr>`;
    })
    .join('')}</table>`;
}

export function tile(from: string, to: string, glyph = '', height = 120, o: { fs?: number; radius?: number } = {}): Html {
  return `<div style="height:${height}px;line-height:${height}px;border-radius:${o.radius ?? 14}px;background:${from};background-image:radial-gradient(circle at 26% 16%,rgba(255,255,255,.4),rgba(255,255,255,0) 56%),linear-gradient(135deg,${from},${to});text-align:center;font-size:${o.fs ?? Math.round(height * 0.42)}px">${glyph}</div>`;
}

export interface ReceiptRow {
  name: string;
  sub?: string;
  qty?: string | number;
  price: string;
  thumb?: [from: string, to: string, glyph?: string];
}

export function receiptTable(rows: ReceiptRow[], o: { summary?: Array<[string, string]>; total?: [string, string]; color?: string } = {}): Html {
  const thumbs = rows.some((r) => r.thumb);
  const qtys = rows.some((r) => r.qty !== undefined);
  const b = 'border-bottom:1px solid #edeff2;';
  const body = rows
    .map(
      (r) =>
        `<tr>${thumbs ? `<td style="padding:12px 12px 12px 0;width:44px;${b}">${r.thumb ? tile(r.thumb[0], r.thumb[1], r.thumb[2] ?? '', 44, { fs: 20, radius: 10 }) : ''}</td>` : ''}<td style="padding:12px 0;${b}font-size:14.5px;color:#111827"><div style="font-weight:600">${r.name}</div>${r.sub ? `<div style="font-size:12.5px;color:#6b7280">${r.sub}</div>` : ''}</td>${qtys ? `<td style="padding:12px 8px;${b}text-align:center;font-size:13px;color:#6b7280">${r.qty !== undefined ? `&times;${r.qty}` : ''}</td>` : ''}<td style="padding:12px 0;${b}text-align:right;font-weight:600;font-size:14.5px;color:#111827;white-space:nowrap">${r.price}</td></tr>`,
    )
    .join('');
  const sum = (o.summary ?? [])
    .map(([k, v]) => `<tr><td style="padding:3px 0;color:#6b7280;font-size:13.5px;text-align:right">${k}</td><td style="padding:3px 0 3px 24px;text-align:right;font-size:13.5px;color:#3c4043;width:1%;white-space:nowrap">${v}</td></tr>`)
    .join('');
  const total = o.total
    ? `<tr><td style="padding:12px 0 0;text-align:right;font-size:15px;font-weight:700;color:#111827;border-top:2px solid ${o.color ?? '#111827'}">${o.total[0]}</td><td style="padding:12px 0 0 24px;text-align:right;font-size:20px;font-weight:800;color:${o.color ?? '#111827'};border-top:2px solid ${o.color ?? '#111827'};white-space:nowrap">${o.total[1]}</td></tr>`
    : '';
  return `${tbl()}${body}</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">${sum}${total}</table>`;
}

export interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function statRow(stats: StatItem[]): Html {
  const w = Math.floor(100 / stats.length);
  return `${tbl('table-layout:fixed')}<tr>${stats
    .map(
      (s, i) =>
        `<td style="width:${w}%;padding:0 ${i < stats.length - 1 ? 6 : 0}px 0 ${i > 0 ? 6 : 0}px;vertical-align:top"><div style="background:#f6f7f9;border-radius:12px;padding:14px 14px 12px"><div style="font-size:11.5px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.6px">${s.label}</div><div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:${s.color ?? '#111827'};margin-top:2px">${s.value}</div>${s.sub ? `<div style="font-size:12px;color:#6b7280">${s.sub}</div>` : ''}</div></td>`,
    )
    .join('')}</tr></table>`;
}

/** Three-column list row: [left visual] [body] [right action]. */
export function listRow(left: Html, body: Html, right = '', border = true): Html {
  const b = border ? 'border-bottom:1px solid #edeff2;' : '';
  return `${tbl()}<tr><td style="width:1%;padding:12px 14px 12px 0;vertical-align:middle;${b}">${left}</td><td style="padding:12px 0;vertical-align:middle;${b}">${body}</td>${right ? `<td align="right" style="padding:12px 0 12px 12px;vertical-align:middle;white-space:nowrap;${b}">${right}</td>` : ''}</tr></table>`;
}

/* ------------------------------------------------------------------ */
/* Products, people                                                    */
/* ------------------------------------------------------------------ */

export interface Product {
  name: string;
  price: string;
  was?: string;
  tag?: string;
  sub?: string;
  from: string;
  to: string;
  glyph?: string;
}

export function productGrid(items: Product[], o: { cols?: 2 | 3; accent?: string; height?: number } = {}): Html {
  const cols = o.cols ?? 2;
  const accent = o.accent ?? '#d93025';
  const rows: Product[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  const w = Math.floor(100 / cols);
  return `${tbl('table-layout:fixed')}${rows
    .map(
      (r) =>
        `<tr>${Array.from({ length: cols }, (_, i) => {
          const it = r[i];
          if (!it) return `<td style="width:${w}%"></td>`;
          return `<td style="width:${w}%;padding:0 6px 16px;vertical-align:top">${tile(it.from, it.to, it.glyph ?? '', o.height ?? (cols === 3 ? 104 : 132))}<div style="margin-top:9px;font-size:14px;font-weight:600;color:#111827;line-height:1.3">${it.name}</div>${it.sub ? `<div style="font-size:12.5px;color:#6b7280">${it.sub}</div>` : ''}<div style="margin-top:2px;font-size:14px;font-weight:700;color:${it.was ? accent : '#111827'}">${it.price}${it.was ? ` <span style="font-weight:400;color:#9aa0a6;text-decoration:line-through;font-size:12.5px">${it.was}</span>` : ''}</div>${it.tag ? `<div style="margin-top:5px">${badge(it.tag, accent)}</div>` : ''}</td>`;
        }).join('')}</tr>`,
    )
    .join('')}</table>`;
}

export interface Person {
  name: string;
  color: string;
}

export function avatar(name: string, color: string, size = 34): Html {
  const ini = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return `<span style="display:inline-block;width:${size}px;height:${size}px;line-height:${size}px;border-radius:50%;background:${color};color:#fff;font-size:${Math.round(size * 0.38)}px;font-weight:700;text-align:center;letter-spacing:.3px">${ini}</span>`;
}

export function avatarRow(people: Person[], o: { size?: number; extra?: number } = {}): Html {
  const size = o.size ?? 40;
  const ring = 'box-shadow:0 0 0 2px #ffffff;';
  const items = people.map((pp, i) => `<span style="display:inline-block;${i ? `margin-left:-${Math.round(size * 0.22)}px;` : ''}${ring}border-radius:50%;vertical-align:middle">${avatar(pp.name, pp.color, size)}</span>`);
  if (o.extra)
    items.push(`<span style="display:inline-block;margin-left:-${Math.round(size * 0.22)}px;${ring}width:${size}px;height:${size}px;line-height:${size}px;border-radius:50%;background:#e8eaed;color:#5f6368;font-size:${Math.round(size * 0.34)}px;font-weight:700;text-align:center;vertical-align:middle">+${o.extra}</span>`);
  return `<div style="padding-left:2px;line-height:1">${items.join('')}</div>`;
}

export function commentBubble(o: { name: string; color: string; text: Html; meta?: string; bg?: string }): Html {
  return `${tbl('margin:0 0 12px')}<tr><td style="width:46px;vertical-align:top;padding-top:2px">${avatar(o.name, o.color, 36)}</td><td style="vertical-align:top"><div style="background:${o.bg ?? '#f3f4f6'};border-radius:4px 16px 16px 16px;padding:11px 15px;font-size:14.5px;color:#1f2328;line-height:1.5"><div style="font-weight:700;font-size:13.5px;margin-bottom:2px">${o.name}${o.meta ? ` <span style="font-weight:400;color:#8a919c;font-size:12px">&middot; ${o.meta}</span>` : ''}</div>${o.text}</div></td></tr></table>`;
}

/* ------------------------------------------------------------------ */
/* Travel, tickets, tracking                                           */
/* ------------------------------------------------------------------ */

export interface Leg {
  label?: string;
  flight: string;
  cabin?: string;
  /** [airport code, city, time] */
  from: [string, string, string];
  to: [string, string, string];
  duration: string;
  note?: string;
}

export function itinerary(legs: Leg[], o: { color?: string } = {}): Html {
  const c = o.color ?? '#0b6bcb';
  const side = (x: [string, string, string], align: 'left' | 'right') =>
    `<td style="width:30%;text-align:${align};vertical-align:top"><div style="font-size:30px;font-weight:800;letter-spacing:-1px;color:#111827;line-height:1.1">${x[0]}</div><div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px">${x[2]}</div><div style="font-size:12.5px;color:#6b7280">${x[1]}</div></td>`;
  return legs
    .map(
      (l) =>
        `<div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;margin:0 0 12px"><div style="background:${tint(c, 0.09)};padding:9px 18px;font-size:11.5px;color:${c};font-weight:700;letter-spacing:.8px;text-transform:uppercase">${l.label ?? 'Flight'} &middot; ${l.flight}${l.cabin ? ` &middot; ${l.cabin}` : ''}</div><div style="padding:16px 18px">${tbl()}<tr>${side(l.from, 'left')}<td style="text-align:center;vertical-align:middle;padding:0 6px"><div style="font-size:11.5px;color:#6b7280">${l.duration}</div><div style="color:${c};font-size:17px;line-height:1.1;margin-top:2px">&#9992;</div><div style="border-top:2px dashed #cfd6df;margin:4px 6px 4px"></div><div style="font-size:11.5px;color:#6b7280">${l.note ?? 'Nonstop'}</div></td>${side(l.to, 'right')}</tr></table></div></div>`,
    )
    .join('');
}

export function progressTracker(steps: string[], active: number, color = '#f59e0b'): Html {
  const n = steps.length;
  const w = Math.floor(100 / n);
  const grey = '#e5e7eb';
  const cells = steps.map((_, i) => {
    const l = i === 0 ? 'transparent' : i <= active ? color : grey;
    const r = i === n - 1 ? 'transparent' : i < active ? color : grey;
    const reached = i <= active;
    return `<td align="center" style="width:${w}%;height:34px;background:linear-gradient(90deg,${l} 0,${l} 50%,${r} 50%,${r} 100%) center/100% 4px no-repeat"><span style="display:inline-block;box-sizing:border-box;width:26px;height:26px;line-height:22px;border-radius:50%;background:${reached ? color : '#ffffff'};border:2px solid ${reached ? color : '#d1d5db'};${i === active ? `box-shadow:0 0 0 4px ${tint(color, 0.25)};` : ''}color:#fff;font-size:13px;font-weight:800;text-align:center">${i < active ? '&#10003;' : i === active ? '&bull;' : ''}</span></td>`;
  });
  const labels = steps.map(
    (s, i) => `<td align="center" style="width:${w}%;padding-top:4px;font-size:12px;line-height:1.3;color:${i <= active ? '#111827' : '#9ca3af'};font-weight:${i === active ? 700 : 500}">${s}</td>`,
  );
  return `${tbl('table-layout:fixed')}<tr>${cells.join('')}</tr><tr>${labels.join('')}</tr></table>`;
}

export interface TicketOptions {
  brand: string;
  color: string;
  title: string;
  subtitle?: string;
  fields: Array<[string, string]>;
  code: string;
  qrCode?: boolean;
  from?: string;
}

/** Boarding pass / e-ticket stub with tear-off line and code. */
export function ticket(o: TicketOptions): Html {
  const rows: Array<Array<[string, string]>> = [];
  for (let i = 0; i < o.fields.length; i += 3) rows.push(o.fields.slice(i, i + 3));
  const notch = `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#f3f4f6"></span>`;
  return `<div style="border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;background:#fff;margin:0 0 16px"><div style="background:${o.color};background-image:linear-gradient(120deg,${o.color},${o.from ?? '#111827'});padding:16px 22px;color:#fff"><div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;opacity:.8">${o.brand}</div><div style="font-size:21px;font-weight:800;letter-spacing:-.3px;margin-top:2px">${o.title}</div>${o.subtitle ? `<div style="font-size:13px;opacity:.85;margin-top:2px">${o.subtitle}</div>` : ''}</div><div style="padding:16px 22px 8px">${tbl()}${rows
    .map(
      (r) =>
        `<tr>${r.map(([k, v]) => `<td style="padding:0 8px 14px 0;vertical-align:top"><div style="font-size:10.5px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#8a919c">${k}</div><div style="font-size:16px;font-weight:700;color:#111827">${v}</div></td>`).join('')}</tr>`,
    )
    .join('')}</table></div><div style="display:flex;justify-content:space-between;margin:0 -9px;line-height:0">${notch}${notch}</div><div style="border-top:2px dashed #d5dae1;margin:-9px 22px 0"></div><div style="padding:16px 22px 18px;text-align:center">${o.qrCode === false ? barcode(o.code, 300, 52) : qr(o.code, 116)}<div style="font-family:${MONO};font-size:12px;letter-spacing:2px;color:#6b7280;margin-top:8px">${o.code}</div></div></div>`;
}

/* ------------------------------------------------------------------ */
/* Developer notifications                                             */
/* ------------------------------------------------------------------ */

export function codeDiff(file: string, lines: Array<['+' | '-' | ' ', string]>, start = 1): Html {
  let n = start;
  const rows = lines
    .map(([s, t]) => {
      const bg = s === '+' ? '#e6ffec' : s === '-' ? '#ffebe9' : '#ffffff';
      const gut = s === '+' ? '#ccffd8' : s === '-' ? '#ffd7d5' : '#f6f8fa';
      const sign = s === '+' ? '#1a7f37' : s === '-' ? '#cf222e' : '#8c959f';
      const num = s === '+' || s === ' ' ? n++ : '';
      return `<div style="background:${bg};white-space:pre;line-height:20px"><span style="display:inline-block;width:38px;text-align:right;padding-right:8px;background:${gut};color:#6e7781;user-select:none">${num}</span><span style="display:inline-block;width:18px;text-align:center;color:${sign}">${s === ' ' ? '' : s}</span>${esc(t)}</div>`;
    })
    .join('');
  return `<div style="border:1px solid #d0d7de;border-radius:8px;overflow:hidden;margin:0 0 16px;font-family:${MONO};font-size:12.5px;color:#1f2328"><div style="background:#f6f8fa;padding:8px 12px;border-bottom:1px solid #d0d7de;font-weight:600">${esc(file)}</div><div style="overflow:hidden">${rows}</div></div>`;
}

export function logBlock(lines: Array<['ok' | 'err' | 'dim' | '', string]>): Html {
  const col = { ok: '#3fb950', err: '#ff7b72', dim: '#8b949e', '': '#e6edf3' };
  return `<div style="background:#0d1117;border-radius:10px;padding:14px 16px;margin:0 0 16px;font-family:${MONO};font-size:12.5px;line-height:1.65;overflow:hidden">${lines.map(([k, t]) => `<div style="color:${col[k]};white-space:pre">${esc(t)}</div>`).join('')}</div>`;
}

export function statusList(items: Array<['ok' | 'fail' | 'skip' | 'run', string, string?]>): Html {
  const m = { ok: ['#1a7f37', '&#10003;'], fail: ['#cf222e', '&#10005;'], skip: ['#8c959f', '&ndash;'], run: ['#bf8700', '&bull;'] };
  return `<div style="border:1px solid #d0d7de;border-radius:10px;overflow:hidden;margin:0 0 16px">${items
    .map(
      ([s, name, meta], i) =>
        `<div style="padding:10px 14px;${i ? 'border-top:1px solid #eaeef2;' : ''}font-size:14px">${tbl()}<tr><td style="width:28px"><span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:${m[s][0]};color:#fff;font-size:11px;font-weight:800;text-align:center">${m[s][1]}</span></td><td style="font-weight:${s === 'fail' ? 700 : 500};color:#1f2328">${name}</td><td align="right" style="font-size:12.5px;color:#6b7280">${meta ?? ''}</td></tr></table></div>`,
    )
    .join('')}</div>`;
}

export function eventCard(o: { title: string; big: string; small?: string; lines: string[]; color: string }): Html {
  return `<div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;margin:0 0 16px">${tbl()}<tr><td style="width:96px;background:${o.color};color:#fff;text-align:center;padding:16px 6px;vertical-align:middle"><div style="font-size:21px;font-weight:800;letter-spacing:-.4px;line-height:1.1">${o.big}</div>${o.small ? `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.85;margin-top:3px">${o.small}</div>` : ''}</td><td style="padding:14px 18px;vertical-align:middle"><div style="font-size:16.5px;font-weight:700;color:#111827;margin-bottom:4px">${o.title}</div>${o.lines.map((l) => `<div style="font-size:13.5px;color:#5f6368;line-height:1.6">${l}</div>`).join('')}</td></tr></table></div>`;
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export interface FooterOptions {
  domain: string;
  unsub?: boolean;
  reason?: string;
  links?: string[];
  dark?: boolean;
  align?: 'left' | 'center';
}

export function footer(brand: string, address: string, o: FooterOptions): Html {
  const c = o.dark ? 'rgba(255,255,255,.5)' : '#8a919c';
  const lc = o.dark ? 'rgba(255,255,255,.78)' : '#6b7280';
  const a = (t: string, slug: string) => `<a href="https://${o.domain}/${slug}" ${REL} style="color:${lc};text-decoration:underline">${t}</a>`;
  const links = [...(o.links ?? []).map((l) => a(l, l.toLowerCase().replace(/[^a-z]+/g, '-'))), ...(o.unsub ? [a('Unsubscribe', 'unsubscribe'), a('Manage preferences', 'preferences')] : [])];
  return `<div style="padding:20px 16px 4px;text-align:${o.align ?? 'center'};font-size:12px;line-height:1.65;color:${c}">${o.reason ? `<div style="margin-bottom:6px">${o.reason}</div>` : ''}${links.length ? `<div style="margin-bottom:6px">${links.join(' &nbsp;&middot;&nbsp; ')}</div>` : ''}<div>${brand} &middot; ${address}</div></div>`;
}
