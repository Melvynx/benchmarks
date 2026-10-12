# Muse Spark 1.3 — Mail

A Gmail-inspired email client. Fully local: seeded mailbox, no accounts or API keys.

## Run

```bash
pnpm install
pnpm dev      # http://127.0.0.1:9333
pnpm build
```

## What's inside

- Mail shell: sidebar (Inbox, Starred, Snoozed, Sent, Drafts, Spam, Trash, All Mail, Labels), toolbar, search, category tabs, right rail (Calendar / Keep / Tasks), quick settings (theme, density, conversation view)
- ~60 seeded threads: varied senders, subjects, timestamps, labels, read states, attachments, multi-message conversations
- Selection, read/unread, starring, importance, archive, spam, delete, labels, snooze — all with undo toasts
- Search with operators: `from:`, `label:`, `has:attachment`, `is:starred`, `is:unread`, plus advanced-search panel
- Thread view with expandable messages, reply/forward, attachment download (simulated), print
- Compose: floating windows, minimize/maximize, Cc/Bcc, contact suggestions, autosave note, schedule-send, discard confirm, sent-with-undo
- Keyboard shortcuts (`?` for the full list), bulk actions, pagination, localStorage persistence, responsive mobile layout
