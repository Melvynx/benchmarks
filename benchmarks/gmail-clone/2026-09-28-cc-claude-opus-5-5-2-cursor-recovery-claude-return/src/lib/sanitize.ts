const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'blockquote',
  'h1', 'h2', 'h3', 'pre', 'code', 'font', 'hr', 'sub', 'sup',
]);

const ALLOWED_STYLE = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'font-family',
]);

function cleanStyle(style: string): string {
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter((decl) => {
      const [prop, ...rest] = decl.split(':');
      const value = rest.join(':').toLowerCase();
      return prop && ALLOWED_STYLE.has(prop.trim().toLowerCase()) && !value.includes('url(') && !value.includes('expression');
    })
    .join('; ');
}

/** Whitelist sanitiser for HTML produced by the compose editor or pasted by the user. */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, '');
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        if (['script', 'style', 'iframe', 'object', 'embed', 'meta', 'link', 'title'].includes(tag)) {
          child.remove();
          continue;
        }
        // Unwrap unknown elements but keep their text content.
        walk(child);
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (tag === 'a' && name === 'href') {
          if (!/^(https?:|mailto:)/i.test(attr.value.trim())) child.removeAttribute('href');
          continue;
        }
        if (tag === 'font' && ['color', 'size', 'face'].includes(name)) continue;
        if (name === 'style') {
          const cleaned = cleanStyle(attr.value);
          if (cleaned) child.setAttribute('style', cleaned);
          else child.removeAttribute('style');
          continue;
        }
        child.removeAttribute(attr.name);
      }
      if (tag === 'a') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
