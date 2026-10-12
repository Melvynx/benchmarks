import { hashString } from './text';

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const PALETTES = [
  ['#ff9a8b', '#ff6a88', '#ffd1a9', '#6a5acd'],
  ['#43cea2', '#185a9d', '#a8edea', '#fed6e3'],
  ['#f6d365', '#fda085', '#fbc2eb', '#a6c1ee'],
  ['#5ee7df', '#b490ca', '#e0c3fc', '#8ec5fc'],
  ['#0f2027', '#2c5364', '#f7971e', '#ffd200'],
  ['#e96443', '#904e95', '#f8b195', '#355c7d'],
  ['#3a7bd5', '#00d2ff', '#ffffff', '#1c1c3c'],
  ['#c94b4b', '#4b134f', '#ffb88c', '#de6262'],
];

export type ArtVariant = 'mesh' | 'sun' | 'city' | 'grid' | 'waves' | 'portrait' | 'food' | 'product';

function svgWrap(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

export function artSvg(variant: ArtVariant, seed: number, w = 640, h = 400): string {
  const r = rng(seed * 9973 + 17);
  const pal = PALETTES[Math.floor(r() * PALETTES.length)];
  const id = `g${seed}${variant}`;
  const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[1]}"/></linearGradient><filter id="b${id}"><feGaussianBlur stdDeviation="${Math.round(w / 22)}"/></filter></defs>`;
  const bg = `<rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  let body = '';
  switch (variant) {
    case 'sun': {
      const sx = w * (0.55 + r() * 0.3);
      body += `<circle cx="${sx}" cy="${h * 0.38}" r="${h * 0.16}" fill="${pal[2]}" opacity=".95"/>`;
      for (let i = 0; i < 4; i++) {
        const y = h * (0.55 + i * 0.12);
        const c = i % 2 ? pal[3] : pal[1];
        let d = `M0 ${h} L0 ${y}`;
        for (let x = 0; x <= w; x += w / 8) d += ` L${x} ${y - r() * h * 0.16}`;
        d += ` L${w} ${h} Z`;
        body += `<path d="${d}" fill="${c}" opacity="${0.35 + i * 0.18}"/>`;
      }
      break;
    }
    case 'city': {
      body += `<circle cx="${w * 0.75}" cy="${h * 0.25}" r="${h * 0.1}" fill="${pal[2]}" opacity=".9"/>`;
      let x = 0;
      while (x < w) {
        const bw = 26 + r() * 60;
        const bh = h * (0.25 + r() * 0.5);
        body += `<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh}" fill="${pal[3]}" opacity="${0.55 + r() * 0.4}"/>`;
        for (let wy = h - bh + 10; wy < h - 10; wy += 16) {
          if (r() > 0.55) body += `<rect x="${x + 8}" y="${wy}" width="6" height="8" fill="${pal[2]}" opacity=".8"/>`;
        }
        x += bw + 4;
      }
      break;
    }
    case 'grid': {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 6; j++) {
          if (r() > 0.4) {
            body += `<rect x="${i * (w / 9) + 6}" y="${j * (h / 6) + 6}" width="${w / 9 - 12}" height="${h / 6 - 12}" rx="10" fill="${r() > 0.5 ? pal[2] : pal[3]}" opacity="${0.35 + r() * 0.5}"/>`;
          }
        }
      }
      break;
    }
    case 'waves': {
      for (let i = 0; i < 6; i++) {
        const y = h * (0.2 + i * 0.13);
        let d = `M0 ${y}`;
        for (let x = 0; x <= w; x += w / 6) d += ` Q${x + w / 12} ${y + (r() - 0.5) * 90} ${x + w / 6} ${y}`;
        d += ` L${w} ${h} L0 ${h} Z`;
        body += `<path d="${d}" fill="${i % 2 ? pal[2] : pal[3]}" opacity="${0.22 + i * 0.08}"/>`;
      }
      break;
    }
    case 'portrait': {
      body += `<circle cx="${w / 2}" cy="${h * 0.42}" r="${h * 0.2}" fill="${pal[2]}" opacity=".9"/><path d="M${w * 0.18} ${h} Q${w / 2} ${h * 0.45} ${w * 0.82} ${h} Z" fill="${pal[3]}" opacity=".85"/>`;
      break;
    }
    case 'food': {
      body += `<circle cx="${w / 2}" cy="${h / 2}" r="${h * 0.38}" fill="#fff" opacity=".9"/><circle cx="${w / 2}" cy="${h / 2}" r="${h * 0.3}" fill="${pal[2]}"/>`;
      for (let i = 0; i < 14; i++) {
        body += `<circle cx="${w / 2 + (r() - 0.5) * h * 0.5}" cy="${h / 2 + (r() - 0.5) * h * 0.5}" r="${6 + r() * 14}" fill="${pal[3]}" opacity="${0.5 + r() * 0.5}"/>`;
      }
      break;
    }
    case 'product': {
      body += `<rect x="${w * 0.3}" y="${h * 0.15}" width="${w * 0.4}" height="${h * 0.7}" rx="${w * 0.05}" fill="#fff" opacity=".92"/><rect x="${w * 0.34}" y="${h * 0.22}" width="${w * 0.32}" height="${h * 0.34}" rx="12" fill="${pal[2]}"/><rect x="${w * 0.34}" y="${h * 0.62}" width="${w * 0.2}" height="12" rx="6" fill="${pal[3]}" opacity=".7"/><rect x="${w * 0.34}" y="${h * 0.68}" width="${w * 0.14}" height="12" rx="6" fill="${pal[3]}" opacity=".4"/>`;
      break;
    }
    default: {
      for (let i = 0; i < 5; i++) {
        body += `<circle cx="${r() * w}" cy="${r() * h}" r="${h * (0.15 + r() * 0.3)}" fill="${pal[Math.floor(r() * 4)]}" opacity=".7" filter="url(#b${id})"/>`;
      }
    }
  }
  return svgWrap(w, h, defs + bg + body);
}

const cache = new Map<string, string>();

export function artDataUri(variant: ArtVariant, seed: number, w = 640, h = 400): string {
  const key = `${variant}:${seed}:${w}x${h}`;
  let uri = cache.get(key);
  if (!uri) {
    uri = `data:image/svg+xml;utf8,${encodeURIComponent(artSvg(variant, seed, w, h))}`;
    cache.set(key, uri);
  }
  return uri;
}

export function resolveArtSrc(src: string): string | null {
  const m = /^art:([a-z]+)-(\d+)(?:-(\d+)x(\d+))?$/.exec(src);
  if (!m) return null;
  const variant = m[1] as ArtVariant;
  const w = m[3] ? +m[3] : 640;
  const h = m[4] ? +m[4] : 400;
  return artDataUri(variant, +m[2], w, h);
}

export function seedFromString(s: string): number {
  return hashString(s) % 10000;
}
