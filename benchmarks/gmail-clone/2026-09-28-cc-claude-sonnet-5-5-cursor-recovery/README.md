# Claude Sonnet 5.5 — Gmail-inspired mail client

Local-first mail app: Vite 8, React 19, TypeScript. No backend; the mailbox is seeded in the browser and persisted to `localStorage` (`mail.state.v1`).

## Run

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9232
pnpm typecheck
pnpm test
pnpm build
```

## What is in it

- Inbox with category tabs (Primary, Promotions, Social, Updates), Starred, Snoozed, Sent, Drafts, Scheduled, Important, All Mail, Spam, Trash, user labels.
- Selection, select-all-in-view, bulk archive / delete / read / snooze / move / label, hover actions, undo toasts.
- Threaded reading view, collapsed history, quoted-text toggle, attachments with preview and download, unsubscribe, print.
- Search language: terms, phrases, `-exclude`, `OR`, `from:` `to:` `cc:` `subject:` `label:` `in:` `is:` `has:` `filename:` `category:` `before:` `after:` `older_than:` `newer_than:` `larger:` `smaller:`.
- Composer: recipient chips with contact suggestions, Cc/Bcc, rich text, links, emoji, attachments (drag and drop), autosave drafts, inline replies, pop-out, full-screen, undo send, schedule send.
- Simulated life: contacts reply to your messages, snoozes wake up, scheduled mail is delivered, trash purges after 30 days.
- Keyboard shortcuts (press `?`): `c` `/` `j` `k` `Enter` `x` `s` `e` `#` `!` `r` `a` `f` `l` `v` `b` `z` `Shift+I` `Shift+U` `g` then `i` `s` `t` `d` `a` `b`.
- Settings: density, light / dark / system theme, accent colors, reading pane, signature, categories, labels, export and reset.
- Responsive: desktop rail / sidebar, tablet drawer, mobile avatar rows, floating compose button, full-screen composer.
