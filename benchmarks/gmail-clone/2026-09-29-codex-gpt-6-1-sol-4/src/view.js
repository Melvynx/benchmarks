import { icon } from './icons.js';

export function escape(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export function button(name, action, title, extra = '', disabled = false) {
  return `<button type="button" class="icon-button ${extra}" data-action="${action}" title="${escape(title)}" aria-label="${escape(title)}" ${disabled ? 'disabled' : ''}>${icon(name)}</button>`;
}
export function avatar(initials, color, extra = '') {
  return `<span class="avatar ${extra}" style="--avatar-bg:${escape(color)}">${escape(initials)}</span>`;
}
export function safeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE']);
  function clean(node) {
    for (const child of [...node.children]) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(child.tagName)) { child.remove(); continue; }
      clean(child);
      if (!allowed.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
      const href = child.getAttribute('href');
      for (const attribute of [...child.attributes]) child.removeAttribute(attribute.name);
      if (child.tagName === 'A' && href && /^https?:\/\//i.test(href)) { child.setAttribute('href', href); child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer'); }
    }
  }
  clean(doc.body);
  return doc.body.innerHTML;
}
