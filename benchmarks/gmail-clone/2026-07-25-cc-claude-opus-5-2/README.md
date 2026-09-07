# Claude Opus 5 — Mail

A local-first, Gmail-inspired email client. No backend, no accounts, no API keys: the
mailbox is seeded from hand-written data, every action is real, and state persists to
`localStorage`.

```bash
pnpm install
pnpm dev        # http://localhost:9214
pnpm build      # tsc -b && vite build
pnpm preview    # http://localhost:9214
pnpm typecheck
pnpm lint
```

## What's in it

**Mail shell** — collapsible sidebar with live counts, icon rail at medium widths, drawer
on phones; category tabs (Primary / Promotions / Social / Updates / Forums); density,
reading-pane and theme controls; light, dark and system themes.

**Views** — Inbox, Starred, Snoozed, Important, Sent, Drafts, Scheduled, All mail, Spam,
Trash, plus one view per user label.

**Data** — multi-message conversations with quoted replies, HTML bodies and attachments
(image thumbnails, text previews), a contact book used for autocomplete, eight labels,
per-message read/starred state, existing drafts, snoozed threads and a scheduled send.

**Actions** — select (click, shift-range, or the select-all dropdown), star, mark
important, read/unread, archive, trash, restore, spam, label, move, snooze, mute, empty
trash/spam. Destructive actions raise a snackbar with **Undo**, which restores the whole
mailbox snapshot.

**Search** — operator support for `from: to: subject: label: in: is: has: filename:
before: after: older_than: newer_than:` plus `"quoted phrases"`, with matches highlighted
in the list. An advanced-search popover builds the query for you and recent searches are
remembered.

**Compose** — multiple stacked windows (minimize / pop out / full screen), contact
autocomplete with chips, Cc/Bcc, rich-text formatting, attachments read from disk,
signature, schedule send and undo send. Drafts save as you type and survive reload.

**Reading** — collapsed message stack with expand-all, quoted text folded behind `···`,
per-message reply / reply-all / forward, attachment preview dialog, and banners for
scheduled, snoozed, muted and spam threads.

**Keyboard** — `c` compose, `j`/`k` cursor, `Enter` open, `u` back, `x` select, `s` star,
`e` archive, `#` trash, `!` spam, `b` snooze, `r`/`a`/`f` reply/reply-all/forward,
`Shift+I`/`Shift+U` read/unread, `[`/`]` prev/next, `z` undo, `g` then `i s t d a`, `/`
search, `?` shortcut reference.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · immer · lucide-react. State is a single
reducer over an immer draft, the router is hash-based, and persistence is a debounced,
versioned `localStorage` write.
