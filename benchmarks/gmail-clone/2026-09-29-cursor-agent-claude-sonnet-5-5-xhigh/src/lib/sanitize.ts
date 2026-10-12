import { resolveArtSrc } from './art';

const TAGS = new Set([
  'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'p', 'br', 'div', 'span', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'sub', 'sup', 'small', 'font', 'center',
]);

const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'title', 'head', 'svg', 'math', 'video', 'audio']);

const ATTRS = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'class', 'style', 'target', 'rel', 'color', 'size']);

const STYLE_PROPS = new Set([
  'color', 'background', 'background-color', 'background-image', 'font-size', 'font-weight', 'font-style', 'font-family', 'text-align',
  'text-decoration', 'line-height', 'letter-spacing', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'border', 'border-top', 'border-bottom', 'border-left',
  'border-right', 'border-radius', 'border-color', 'width', 'max-width', 'min-width', 'height', 'min-height', 'display', 'gap',
  'flex', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'text-transform', 'white-space', 'box-shadow', 'opacity',
  'vertical-align', 'list-style', 'overflow', 'border-collapse', 'border-spacing',
]);

const ALLOWED_CLASSES = new Set(['q', 'sig', 'm-muted']);

function cleanStyle(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!STYLE_PROPS.has(prop)) continue;
    if (/url\s*\(|expression|javascript:|@import|behavior/i.test(value)) continue;
    if (prop === 'background-image' && !/^(linear|radial)-gradient/i.test(value)) continue;
    out.push(`${prop}: ${value}`);
  }
  return out.join('; ');
}

function cleanNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) return null;
  const frag = doc.createDocumentFragment();
  const children = () => {
    for (const child of Array.from(el.childNodes)) {
      const c = cleanNode(child, doc);
      if (c) frag.appendChild(c);
    }
  };
  if (!TAGS.has(tag)) {
    children();
    return frag;
  }
  const out = doc.createElement(tag);
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (!ATTRS.has(name)) continue;
    let value = attr.value;
    if (name === 'href') {
      if (!/^(https?:|mailto:|tel:|#)/i.test(value.trim())) continue;
    } else if (name === 'src') {
      const art = resolveArtSrc(value.trim());
      if (art) value = art;
      else if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value.trim())) continue;
    } else if (name === 'style') {
      value = cleanStyle(value);
      if (!value) continue;
    } else if (name === 'class') {
      value = value
        .split(/\s+/)
        .filter((c) => ALLOWED_CLASSES.has(c))
        .join(' ');
      if (!value) continue;
    } else if (name === 'target' || name === 'rel') {
      continue;
    }
    out.setAttribute(name, value);
  }
  if (tag === 'a') {
    out.setAttribute('target', '_blank');
    out.setAttribute('rel', 'noopener noreferrer');
  }
  if (tag === 'img' && !out.getAttribute('src')) return null;
  if (tag !== 'br' && tag !== 'hr' && tag !== 'img') {
    for (const child of Array.from(el.childNodes)) {
      const c = cleanNode(child, doc);
      if (c) out.appendChild(c);
    }
  }
  return out;
}

const cache = new Map<string, string>();

export function sanitizeHtml(html: string): string {
  const hit = cache.get(html);
  if (hit !== undefined) return hit;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const wrap = doc.createElement('div');
  for (const child of Array.from(doc.body.childNodes)) {
    const c = cleanNode(child, doc);
    if (c) wrap.appendChild(c);
  }
  const out = wrap.innerHTML;
  if (cache.size > 400) cache.clear();
  cache.set(html, out);
  return out;
}

export interface SplitHtml {
  main: string;
  quote: string | null;
}

const splitCache = new Map<string, SplitHtml>();

export function prepareBody(html: string): SplitHtml {
  const hit = splitCache.get(html);
  if (hit) return hit;
  const clean = sanitizeHtml(html);
  const doc = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html');
  const quotes = Array.from(doc.body.querySelectorAll(':scope > div.q'));
  let quote: string | null = null;
  if (quotes.length) {
    quote = quotes.map((q) => q.innerHTML).join('');
    quotes.forEach((q) => q.remove());
  }
  const res = { main: doc.body.innerHTML, quote };
  if (splitCache.size > 400) splitCache.clear();
  splitCache.set(html, res);
  return res;
}
