# Claude Opus 5.5

A Gmail-style mail client that runs entirely in the browser. No accounts, servers or API keys: the mailbox is seeded locally and persisted in `localStorage`, so it works offline and survives reloads.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9358
```

Other scripts:

| Script | What it does |
| --- | --- |
| `pnpm build` | Typecheck, then production build to `dist/` |
| `pnpm preview` | Serve the production build on port 9358 |
| `pnpm typecheck` | TypeScript only |
| `pnpm e2e` | Browser workflow checks against a running dev server (uses local Chrome via `playwright-core`; screenshots land in `e2e-shots/`) |

## What's in it

- **Mailboxes**: Inbox (Primary / Promotions / Social / Updates tabs), Starred, Snoozed, Important, Sent, Scheduled, Drafts, All Mail, Spam, Trash, plus user labels.
- **Actions**: select, shift-range select, select-all-across-pages, read/unread, star, important, archive, delete, delete forever, spam, mute, snooze, move, label. All of them have Undo. Available on hover, from the toolbar, right-click menus, drag-and-drop onto the sidebar, and touch swipes on mobile.
- **Conversations**: collapsed and expanded messages, trimmed quotes, sender cards, recipient details, attachment previews with downloads, per-message actions, and reply / reply all / forward inline.
- **Compose**: up to three stacked windows, which can be minimized or made full screen. It has recipient chips with contact autocomplete, Cc/Bcc, rich formatting, links, emoji, and attachments (drag, paste or file picker). Drafts autosave. You can schedule sends, undo sends, and it warns you about forgotten attachments.
- **Search**: suggestions plus Gmail operators: `from:` `to:` `subject:` `label:` `is:unread|starred|important|snoozed` `has:attachment` `filename:` `in:anywhere|trash|spam` `before:` `after:` `older_than:` `newer_than:` `-negation` and `"exact phrase"`. There are also filter chips and an advanced search form.
- **Simulated activity**: new mail trickles in, and people you write to reply after a short delay. Snoozes return and scheduled mail sends on time. You can turn this off in settings.
- **Settings**: quick settings panel (density, theme, inbox type, reading pane) and a full settings page (signature, undo window, auto-advance, swipe actions, labels, categories, export, reset).
- **Keyboard shortcuts**: press `?` in the app to see all of them.
- **Responsive layout**: collapsible sidebar rail on tablets; on phones a drawer, stacked rows, full-screen compose, swipe and long-press.
