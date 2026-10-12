# Claude Sonnet 5.5

A fully local, Gmail-inspired mail client. No accounts, no network, no paid services. Everything lives in `localStorage`.

## Run

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9369
pnpm test       # unit tests (search engine, store actions, seed integrity)
pnpm typecheck
pnpm build && pnpm preview
pnpm e2e        # Playwright smoke suite against a running dev server (needs Chrome)
```

## What is in it

- Seeded mailbox of 90+ conversations: threads, attachments, calendar invites, promotions, receipts, spam, trash, drafts, a snoozed item, a scheduled send.
- Inbox, Starred, Snoozed, Important, Sent, Drafts, Scheduled, All Mail, Spam, Trash and user labels. Category tabs (Primary, Promotions, Social, Updates).
- Select, range-select, bulk archive / delete / spam / read / star / important / snooze / move / label, with undo for every action. Drag rows onto sidebar items and tabs.
- Search with Gmail-style operators (`from:`, `to:`, `subject:`, `label:`, `has:attachment`, `is:unread`, `before:`, `after:`, `older_than:`, `larger:`, `in:anywhere`, quotes, `-` and `OR`), suggestions, recent searches, and an advanced filter form.
- Conversation view with collapsed history, quote trimming, message details, per-message actions, RSVP cards, attachment gallery with previews and downloads, smart replies, inline reply.
- Compose: contact autocomplete, Cc/Bcc, rich text, links, emoji, attachments (drag and drop too), autosaved drafts, undo send, schedule send, minimize / full screen / pop out. Contacts write back a few seconds after you send (toggle in settings).
- Keyboard shortcuts (`?` lists them), reading pane, density, light / dark / system themes, five accents, signature, page size, label manager, export and reset.
- Responsive: desktop, tablet drawer, and a mobile layout with full-screen compose, swipe to archive and long-press to select.

Data is versioned under the `sonnet-mail:v3` key. Use Settings > Data > Reset to restore the seed.
