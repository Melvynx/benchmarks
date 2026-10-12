# Codex

A dependency-free, local-first email client. Run `pnpm dev` and open http://localhost:9187. `pnpm check` checks application syntax; `pnpm test` checks mailbox filtering and seeded data.

Includes threaded mail, bulk selection, labels, search operators, starring, archive, trash recovery, snooze, reply/forward, local sending, autosaved drafts, attachments, keyboard shortcuts, compact density, notes and contacts. Changes persist in browser local storage. Sending is simulated locally; no external mail is delivered. Attachments are realistic demo metadata with downloadable text previews, not original binary files. Due snoozed messages return to the Inbox on the next render or app visit.

Tests include mailbox unit checks, controller workflow checks with a lightweight DOM adapter, and an HTTP smoke test on port 9187. The HTTP test explicitly skips if the environment forbids listening on that port. Controller checks do not replace visual browser verification.

The app uses native ES modules and a small Node HTTP server. No install step, account, credentials, or API is required. Typography falls back to system fonts when offline.
