const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "A", "BR", "DIV", "P", "UL", "OL", "LI", "BLOCKQUOTE", "SPAN"]);

function clean(el: Element) {
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) continue;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      continue;
    }
    const child = node as HTMLElement;
    if (!ALLOWED.has(child.tagName)) {
      child.replaceWith(...child.childNodes);
      clean(el);
      return;
    }
    for (const attr of [...child.attributes]) {
      const keep = child.tagName === "A" && attr.name.toLowerCase() === "href" && /^(https?:|mailto:)/i.test(attr.value.trim());
      if (!keep) child.removeAttribute(attr.name);
    }
    if (child.tagName === "A") {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noreferrer noopener");
    }
    if (child.tagName === "BLOCKQUOTE") child.setAttribute("class", "quote");
    clean(child);
  }
}

export function sanitizeHtml(input: string): string {
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  clean(root);
  return root.innerHTML;
}
