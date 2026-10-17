const textCache = new Map<string, string>();

export function htmlToText(html: string): string {
  const cached = textCache.get(html);
  if (cached !== undefined) return cached;
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|div|blockquote|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (textCache.size > 2000) textCache.clear();
  textCache.set(html, text);
  return text;
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ALLOWED = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "UL", "OL", "LI", "A", "BLOCKQUOTE",
  "DIV", "SPAN", "CODE", "PRE", "H1", "H2", "H3", "FONT", "HR",
]);

/** Minimal allow-list sanitizer for user-authored rich text. */
export function sanitize(html: string): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED.has(el.tagName)) {
          if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(el.tagName)) {
            el.remove();
            continue;
          }
          walk(el);
          el.replaceWith(...Array.from(el.childNodes));
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const ok =
            (el.tagName === "A" && attr.name === "href" && /^(https?:|mailto:)/i.test(attr.value)) ||
            (el.tagName === "FONT" && attr.name === "color");
          if (!ok) el.removeAttribute(attr.name);
        }
        if (el.tagName === "A") {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

export function textToHtml(text: string) {
  return text
    .split(/\n/)
    .map((l) => escapeHtml(l))
    .join("<br>");
}
