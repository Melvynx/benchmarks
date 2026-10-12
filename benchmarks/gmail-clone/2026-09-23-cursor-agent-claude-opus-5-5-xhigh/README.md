# Claude Opus 5.5 — mail client

A Gmail-style mail client that runs entirely in the browser. It has no backend and makes no network calls; the mailbox is seeded on first load and persisted to `localStorage`.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:9349
pnpm build        # typecheck + production build
pnpm preview      # serve dist on 9349
pnpm test:e2e     # Playwright workflows against a running dev server (uses local Chrome)
pnpm icons        # regenerate src/lib/icon-paths.ts (also runs before dev/build)
```

`node scripts/offline.mjs` checks the production build against `pnpm preview`. Set `STOP_SERVER` to a command that stops the preview server; the script then verifies the app still reloads with no server.

Icons are inline SVG paths taken from `@material-symbols/svg-400` for only the names the source uses (about 60 KB), not the 4 MB icon font. Any `name` string passed to `<Icon>` is picked up automatically.

## What works

- **Folders:** Inbox (with Primary, Promotions, Social and Updates tabs, or Important/Unread/Starred-first sorting), Starred, Snoozed, Important, Sent, Scheduled, Drafts, All Mail, Spam, Trash. User labels have colors, a context menu, and drag-a-row-onto-label.
- **List:** checkbox selection (with shift-range), select-all-in-view banner, and bulk archive/delete/spam/read/unread/snooze/move/label/important/mute. Also stars, importance markers, attachment chips, pagination, three densities, and a split reading pane (right or bottom, resizable).
- **Search:** operators (`from:`, `to:`, `subject:`, `has:attachment`, `is:unread|starred|important|snoozed`, `in:`, `label:`, `before:`/`after:`/`older_than:`/`newer_than:`, `-negation`, `"phrases"`, `OR`), an advanced search form, and live suggestions.
- **Threads:** collapsible conversation with expand/collapse all, quoted-text toggle, per-message reply/forward/star/show original. Also inline reply, print, attachment viewer (images, docs, PDF download, calendar RSVP), and j/k between threads.
- **Compose:** multiple windows (minimize/expand/full screen), recipient chips with contact autocomplete, Cc/Bcc, and a rich editor (fonts, sizes, color, lists, links, emoji, quote, indent). Also attachments, signature, draft autosave, undo send, schedule send, and discard.
- **Time-based behavior:** snoozed mail returns on time, scheduled mail is delivered, contacts reply to what you send, and new mail trickles in with notifications.
- **Settings:** light/dark/system theme, density, inbox type, reading pane, undo-send window, signature, keyboard shortcuts toggle, and a reset option for the demo mailbox.
- **Keyboard:** Gmail-style shortcuts; press `?` for the full list.
- **Mobile:** drawer navigation (with Settings), avatar-tap and long-press selection, and a selection bar with snooze, labels, and Trash/Spam restore. Also swipe to archive, infinite scrolling lists, a shrinking Compose FAB, and full-screen thread, reply and compose views.
- **Offline:** the production build registers a service worker that caches the app shell, assets and Roboto. After one visit it reloads with no network, and mailbox writes are batched to `localStorage` and flushed when the page is hidden.
- **Accessibility:** dialogs move focus inside, trap Tab and restore focus on close. The reading-pane divider can be resized with the arrow keys, and toggles expose `aria-pressed`.
