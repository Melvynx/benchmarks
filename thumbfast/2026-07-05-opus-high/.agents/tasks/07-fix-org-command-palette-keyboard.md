# 07 - Make the org command palette keyboard- and mobile-accessible

**Severity**: CRITICAL (2/3 a11y agents - Keyboard Navigator + Mobile User agreed)
**Depends on**: nothing - independent

## Problem

`src/routes/orgs/$orgSlug/(navigation)/_navigation/org-command.tsx` (lines ~80-99) renders a search input + a `Cmd+K` keyboard shortcut badge as the only way to open the command dialog:

- The input opens the dialog via `onClick={() => setOpen(true)}`. Click events do **not** fire from keyboard activation on `<input>` - tabbing to the field then pressing Enter/Space does nothing.
- The visible affordance is a `KbdGroup` showing `Cmd+K`. On mobile and on keyboards without that key combo, the affordance is misleading.
- The dialog title is `"Search documentation..."` (~line 106) but the dialog is a general navigation command palette - misleading for screen readers navigating by headings.
- `aria-haspopup` is missing on the input.

## Files

| Path | Why |
|------|-----|
| `src/routes/orgs/$orgSlug/(navigation)/_navigation/org-command.tsx` | Component to fix |
| `src/components/ui/input-group.tsx` (or wherever `InputGroupInput` lives) | Reference for which props it accepts |
| `.agents/rules/ui-ux.md` | Project UI rules |

## Acceptance criteria

1. Keyboard-only users can open the dialog by tabbing to the input and pressing Enter or Space.
2. Mobile users see a proper affordance (e.g. a Search icon visible on mobile) and **not** the misleading `Cmd+K` badge. Use Tailwind responsive utilities: `hidden sm:flex` for the kbd badge, `flex sm:hidden` for the icon.
3. The input has `aria-haspopup="dialog"` and `aria-expanded={open}`.
4. The dialog's `DialogTitle` (currently "Search documentation...") has copy that matches what the dialog actually does (e.g. "Navigate to page" or "Command palette"). The `sr-only` wrap is fine; just fix the words.
5. Existing `Cmd+K` shortcut still works.

## Implementation notes

```tsx
<InputGroupInput
  placeholder="Search..."
  readOnly
  aria-haspopup="dialog"
  aria-expanded={open}
  onFocus={() => setOpen(true)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }}
  onClick={() => setOpen(true)}
/>
```

`onFocus` is the simplest fix - the dialog opens whenever the input gets focus, which covers both Tab-to-it and click. If that creates a UX problem on initial page load (the dialog auto-opening when the input is focused programmatically), use the `onKeyDown` + `onClick` pair instead.

For the mobile affordance:

```tsx
<KbdGroup className="hidden sm:flex">
  <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
  <Kbd>K</Kbd>
</KbdGroup>
<Search className="size-4 sm:hidden" aria-hidden="true" />
```

For the dialog title - read the existing component to see the current copy and adjust to match the actual scope of the palette (probably navigate to org pages).

## Verification

```bash
pnpm ts
pnpm lint:ci
```

Manual:
- Tab to the search input from the page - press Enter - dialog should open.
- On a mobile viewport (DevTools 375px), the `Cmd+K` badge should be hidden and a Search icon visible.
- VoiceOver / NVDA: the input announces something like "Search, button, dialog, collapsed" instead of just "edit text".
- The existing `Cmd+K` global shortcut still opens the dialog from anywhere.

## Out of scope

- Other a11y issues flagged in the review (missing `<main>` landmark, raw `<h1>`s, table without `aria-live`) - separate tasks if you want them.
- Filter popover button `type="button"` (Keyboard Navigator suggestion) - 1/3 agreement, low priority, skip.
