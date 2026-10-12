let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&middot;': '·',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&copy;': '©',
};

export function htmlToText(html: string, opts: { keepQuote?: boolean } = {}): string {
  let h = html;
  if (!opts.keepQuote) h = h.replace(/<div class="q"[\s\S]*$/i, '');
  h = h
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|pre|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ');
  return h
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export function makeSnippet(html: string, max = 150): string {
  return htmlToText(html).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function md(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines[0].startsWith('```')) {
        const body = lines.slice(1, lines[lines.length - 1].startsWith('```') ? -1 : undefined).join('\n');
        return `<pre><code>${escapeHtml(body)}</code></pre>`;
      }
      if (lines.every((l) => /^[-•] /.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      }
      if (lines.every((l) => /^\d+\. /.test(l))) {
        return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
      }
      if (lines.every((l) => l.startsWith('> '))) {
        return `<blockquote>${lines.map((l) => inline(l.slice(2))).join('<br>')}</blockquote>`;
      }
      if (lines.length === 1 && /^#{1,3} /.test(lines[0])) {
        return `<h3>${inline(lines[0].replace(/^#+ /, ''))}</h3>`;
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

const AVATAR_COLORS = [
  '#1a73e8',
  '#d93025',
  '#188038',
  '#e37400',
  '#a142f4',
  '#007b83',
  '#c2185b',
  '#5f6368',
  '#3949ab',
  '#00897b',
  '#8d6e63',
  '#6d4c41',
];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarColor(seed: string): string {
  return AVATAR_COLORS[hashString(seed.toLowerCase()) % AVATAR_COLORS.length];
}

export const LABEL_COLORS = [
  '#4a86e8',
  '#16a765',
  '#f691b3',
  '#ffad46',
  '#a479e2',
  '#43d692',
  '#ac2b16',
  '#fad165',
  '#ff7537',
  '#42d692',
  '#3c78d8',
  '#b99aff',
  '#e07798',
  '#89d3b2',
  '#666666',
  '#8e63ce',
];

export function readableOn(bg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1f1f1f' : '#ffffff';
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i.test(s.trim());
}

export function parseAddressList(input: string): { name: string; email: string }[] {
  const out: { name: string; email: string }[] = [];
  for (const raw of input.split(/[,;\n]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(.*?)\s*<([^>]+)>$/.exec(part);
    if (m) out.push({ name: m[1].replace(/^"|"$/g, '').trim(), email: m[2].trim().toLowerCase() });
    else out.push({ name: '', email: part.replace(/^<|>$/g, '').toLowerCase() });
  }
  return out;
}

export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
