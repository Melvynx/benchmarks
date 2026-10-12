# Claude Opus 5.5 — local mail client

A Gmail-inspired email client that runs entirely in the browser. No accounts, no network, no API keys: the mailbox is seeded on first load and every change is persisted to `localStorage`.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:9363
pnpm build        # typecheck + production bundle
pnpm preview      # serve the build on :9363
pnpm test:e2e     # browser checks against the running dev server (uses local Google Chrome)
```

## What's inside

- **Mailboxes**: Inbox (with Primary / Promotions / Social / Updates tabs), Starred, Snoozed, Important, Sent, Scheduled, Drafts, All Mail, Spam, Trash, and user labels (create, rename, recolor, delete).
- **Conversation actions**: read/unread, star, important, archive, delete / delete forever, spam / not spam, snooze (presets or custom time), move to, label as (tri-state for bulk), mute. Every destructive action has Undo. Rows can be dragged onto sidebar folders, labels or category tabs.
- **Selection**: checkboxes, shift-click ranges, select menu (all / none / read / unread / starred), bulk toolbar, long-press on mobile.
- **Search**: Gmail operators (`from:`, `to:`, `subject:`, `label:`, `in:`, `is:`, `has:attachment`, `filename:`, `category:`, `newer_than:`, `older_than:`, `after:`, `before:`, `-exclude`, `"quoted phrases"`), live suggestions, recent searches, advanced search panel, quick filter chips, and term highlighting.
- **Reading**: collapsed conversation history, recipient details, trimmed quoted text, attachment cards with a full-screen previewer, calendar invites with RSVP, smart reply suggestions, newer/older navigation, print.
- **Compose**: stacked floating windows (minimize / full screen), inline replies, reply / reply all / forward, recipient chips with contact autocomplete and validation, Cc/Bcc, rich text formatting, links, emoji, signature, attachments (picker, drag & drop, paste), autosaved drafts, undo send, and schedule send.
- **Alive mailbox**: new mail arrives while the app is open, contacts reply to messages you send them, snoozed conversations come back, and scheduled messages go out on time.
- **Settings**: light / dark / system theme, density, category tabs, reading pane (right of inbox), undo-send period, signature, page size, shortcuts toggle, simulated incoming mail, and a demo reset from the account menu.
- **Keyboard shortcuts**: press `?` in the app for the full list (`c`, `/`, `j`/`k`, `o`, `u`, `e`, `#`, `s`, `x`, `r`/`a`/`f`, `b`, `l`, `v`, `z`, `g i`, `* a`, …).
- **Responsive**: on phones you get a drawer, a search pill, two-line rows with avatar selection, a full-screen conversation view with a sticky reply bar, and full-screen compose.

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, lucide-react.
