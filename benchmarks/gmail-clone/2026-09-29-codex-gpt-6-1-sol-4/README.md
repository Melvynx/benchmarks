# GPT-6

A complete, local Gmail-inspired email client. No dependencies, API keys, accounts, or services are required. Built with native JavaScript modules, a typed mailbox domain, CSS, and a small Node HTTP server.

Requires Node 22.18+ and pnpm.

```sh
pnpm dev
```

Open **http://localhost:9191**. Both development and production preview use port 9191.

```sh
pnpm check
pnpm test
pnpm test:ui
pnpm build
pnpm test:server
pnpm preview
```

The mailbox contains 41 varied conversations with threads, attachments, labels, and multiple folders. Mail, labels, preferences, notes, calendar events, and tasks persist in browser local storage. Sending is simulated locally and supports undo; scheduled mail moves to Sent when its time arrives while the app is open, or when it is next opened. Snoozed messages return in the same way.

Search supports regular text and combinations of `from:`, `to:`, `subject:`, `label:`, `in:`, `is:unread`, `is:read`, `is:starred`, `is:important`, `has:attachment`, `before:`, `after:`, and quoted phrases. Trash and spam are excluded unless requested with `in:trash`, `in:spam`, or `in:all`.

Press `?` for keyboard shortcuts. Account settings include light and dark themes, inbox density, signatures, a readable mailbox export, and sample-data reset.

Local uploads support two files up to 1 MB each to stay within browser storage limits. Uploaded files can be downloaded intact. Seeded attachments have designed previews and downloadable text companions.

The build strips TypeScript using Node’s built-in transformer and copies the application to `dist/`; it needs no package installation. `check` validates syntax and TypeScript transformations. `test` covers search, bulk changes, folder restoration, labeling, compose validation, drafts, snoozing, and scheduled sends. `test:ui` exercises rendering and event integration with a lightweight DOM harness; it does not verify browser layout. `test:server` checks development and production response handlers, module transformation, and path restrictions.
