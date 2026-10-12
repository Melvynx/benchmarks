export function stripHtml(html: string) {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const ALLOWED = new Set([
  'P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'A', 'SPAN',
  'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'HR', 'CODE', 'PRE', 'FONT', 'SMALL', 'IMG',
])

/** Minimal allow-list sanitizer for locally composed HTML */
export function sanitizeHtml(html: string) {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED.has(child.tagName)) {
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'IFRAME') {
          child.remove()
          continue
        }
        const frag = doc.createDocumentFragment()
        while (child.firstChild) frag.appendChild(child.firstChild)
        child.replaceWith(frag)
        walk(el)
        return
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        const keep =
          (name === 'href' && /^(https?:|mailto:)/i.test(attr.value)) ||
          (name === 'src' && /^data:image\//i.test(attr.value)) ||
          name === 'class' ||
          (name === 'style' && !/url\(|expression/i.test(attr.value))
        if (!keep) child.removeAttribute(attr.name)
      }
      if (child.tagName === 'A') {
        child.setAttribute('target', '_blank')
        child.setAttribute('rel', 'noopener noreferrer')
      }
      walk(child)
    }
  }
  walk(root)
  return root.innerHTML
}

export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
