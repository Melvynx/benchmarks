# Fable 5 — Gmail-inspired mail client

A fully local, Gmail-inspired email application. No backend, no API keys — a realistic
seeded mailbox with complete client-side behavior, persisted to `localStorage`.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9204
```

Other scripts: `pnpm build` (typecheck + production build), `pnpm preview` (serve the build on 9204).

## What's inside

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · Zustand (persisted) · lucide-react.

**Mailbox** — 45 seeded conversations across Inbox (with Primary / Promotions / Social /
Updates category tabs), Starred, Snoozed, Sent, Drafts, All Mail, Spam, and Trash;
threaded conversations, attachments, labels, read states, and timestamps relative to today.

**Triage** — select (single, bulk, by read/unread/starred), archive, delete, report spam,
mark read/unread, star per message or per thread, snooze (later today / tomorrow / weekend /
next week, snoozed mail returns to the inbox automatically), label as (including creating
labels inline), empty Trash/Spam, and single-level undo for destructive actions.

**Reading** — conversation view with collapsed history, expandable message cards, sender
details popover, trimmed-quote toggle, per-message star/reply/forward, attachment cards with
demo downloads, and label chips with removal.

**Compose** — floating windows (minimize, full-screen, up to three stacked), To/Cc/Bcc with
contact chips and frequency-ranked autocomplete, rich text (bold/italic/underline, lists,
quotes, links), file attachments via a real picker, automatic draft saving, inline reply /
reply-all / forward inside the thread, send with an undo window (configurable in settings).

**Search** — live suggestion dropdown plus operators: `from:`, `to:`, `label:`, `in:`,
`is:unread|read|starred|snoozed`, `has:attachment`, and free-text over subject, body, and
participants.

**Shell** — hash routing with back/forward support, keyboard shortcuts (`?` for the full
map: j/k, x, s, e, #, !, c, /, g-then-i/s/t/d/a, z undo, ⌘Enter send…), light/dark/system
themes, comfortable/compact density, quick-settings panel, responsive layout (drawer nav,
FAB compose, full-screen thread and compose on mobile), and a demo-data reset.

All state lives in your browser; “Reset demo data” (avatar menu or settings) restores the
original mailbox.
