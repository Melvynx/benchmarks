import DOMPurify from "dompurify";

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitize(html: string) {
  return DOMPurify.sanitize(html, { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "script", "iframe", "form", "input"] });
}

/** Wraps free-text search words in <mark> without touching markup. */
export function highlight(html: string, words: string[]) {
  if (!words.length) return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const n of nodes) {
    if (!re.test(n.data)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    n.data.replace(re, (m, _g, idx: number) => {
      frag.append(n.data.slice(last, idx));
      const mark = document.createElement("mark");
      mark.textContent = m;
      frag.append(mark);
      last = idx + m.length;
      return m;
    });
    frag.append(n.data.slice(last));
    n.replaceWith(frag);
  }
  return tpl.innerHTML;
}

export const isRichHtml = (html: string) => /style=/.test(html) && /(background|color:)/.test(html);
