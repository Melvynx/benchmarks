const ALLOWED = new Set([
  'P', 'BR', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'A', 'UL', 'OL', 'LI',
  'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'CODE', 'PRE', 'HR', 'DETAILS', 'SUMMARY', 'MARK',
]);

const DROPPED = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'VIDEO', 'AUDIO', 'LINK', 'META', 'FORM',
  'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT',
]);

/**
 * Whitelist sanitizer for mail HTML. Keeps basic text formatting, safe links and
 * quoted replies (wrapped in a collapsible <details>, like Gmail's "trimmed content").
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  cleanChildren(template.content);
  return template.innerHTML;
}

function cleanChildren(parent: Node) {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) continue;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      continue;
    }
    const el = node as HTMLElement;
    if (DROPPED.has(el.tagName)) {
      el.remove();
      continue;
    }
    if (!ALLOWED.has(el.tagName)) {
      cleanChildren(el);
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const keepLink = el.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:)/i.test(attr.value.trim());
      const keepQuote = el.tagName === 'BLOCKQUOTE' && attr.name === 'class' && attr.value === 'quote';
      if (!keepLink && !keepQuote) el.removeAttribute(attr.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noreferrer noopener');
    }
    cleanChildren(el);
    const alreadyCollapsed = el.parentElement?.tagName === 'DETAILS';
    if (el.tagName === 'BLOCKQUOTE' && el.classList.contains('quote') && !alreadyCollapsed) {
      const details = document.createElement('details');
      details.className = 'quote-toggle';
      const summary = document.createElement('summary');
      summary.textContent = 'Show trimmed content';
      el.replaceWith(details);
      details.append(summary, el);
    }
  }
}
