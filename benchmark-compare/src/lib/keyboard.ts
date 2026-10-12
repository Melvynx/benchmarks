const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * Single-key shortcuts must not fire while someone types, while a dialog or
 * listbox owns the keyboard, or when a modifier turns the key into a browser
 * shortcut. Select triggers keep arrow keys but not letters, which they use
 * for typeahead.
 */
export function shortcutBlocked(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return true
  if (document.querySelector('[role="dialog"], [role="listbox"]')) return true
  const target = event.target instanceof Element ? event.target : null
  if (!target) return false
  if (target.closest(EDITABLE)) return true
  return target.closest('[role="combobox"]') !== null && !event.key.startsWith("Arrow")
}
