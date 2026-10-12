const PALETTE = [
  '#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#007b83', '#c5221f', '#b31412',
  '#1967d2', '#0d652d', '#a142f4', '#e8710a', '#12b5cb', '#5f6368', '#f439a0', '#3949ab',
]

export function colorFor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function initials(name: string) {
  const clean = name.replace(/[^\p{L}\p{N} ]/gu, '').trim()
  if (!clean) return '?'
  return clean[0].toUpperCase()
}

export function firstName(name: string) {
  return name.split(/\s+/)[0]
}
