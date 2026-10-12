const ALLOWED_TAGS = new Set([
  'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI',
  'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'FONT', 'CODE', 'PRE', 'HR', 'IMG', 'SUB', 'SUP',
]);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'FORM']);
const SAFE_STYLE = new Set(['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'font-family', 'text-align', 'text-decoration', 'margin-left', 'padding-left', 'list-style-type']);

function cleanStyle(style: string): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter((d) => {
      const i = d.indexOf(':');
      if (i < 0) return false;
      const prop = d.slice(0, i).trim().toLowerCase();
      const val = d.slice(i + 1).toLowerCase();
      return SAFE_STYLE.has(prop) && !/url\(|expression|javascript:|@import/.test(val);
    })
    .join('; ');
}

function safeUrl(url: string, allowData = false): boolean {
  const u = url.trim().toLowerCase();
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('mailto:') || u.startsWith('tel:') || u.startsWith('#')) return true;
  return allowData && u.startsWith('data:image/') && !u.startsWith('data:image/svg');
}

function cleanNode(node: Node, doc: Document): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }
    const el = child as HTMLElement;
    if (DROP_WITH_CONTENT.has(el.tagName)) {
      node.removeChild(el);
      continue;
    }
    if (!ALLOWED_TAGS.has(el.tagName)) {
      cleanNode(el, doc);
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      node.removeChild(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      let keep = false;
      if (name === 'style') {
        const cleaned = cleanStyle(attr.value);
        if (cleaned) el.setAttribute('style', cleaned);
        else el.removeAttribute('style');
        continue;
      }
      if (el.tagName === 'A' && name === 'href') keep = safeUrl(attr.value);
      else if (el.tagName === 'IMG' && name === 'src') keep = safeUrl(attr.value, true);
      else if (el.tagName === 'IMG' && (name === 'alt' || name === 'width' || name === 'height')) keep = true;
      else if (el.tagName === 'FONT' && (name === 'color' || name === 'size' || name === 'face')) keep = true;
      else if (name === 'class' && /^(mail-quote|sig)/.test(attr.value)) keep = true;
      else if (name === 'dir' || name === 'align') keep = true;
      if (!keep) el.removeAttribute(attr.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    cleanNode(el, doc);
  }
}

/** Whitelist sanitiser for user-authored HTML (composer output). */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');
  cleanNode(doc.body, doc);
  return doc.body.innerHTML;
}

export function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  if (/<img\b/i.test(html)) return false;
  return html.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() === '';
}
