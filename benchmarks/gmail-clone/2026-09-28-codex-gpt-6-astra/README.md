# GPT-6

A responsive, Gmail-inspired local email client. No dependencies, credentials, or external services are required.

## Run

`pnpm dev` serves the application at http://localhost:9182.

`pnpm test` checks JavaScript syntax, seeded data, search operators, and mailbox workflows including archive/undo, trash/restore, drafts, sending, replies, and persistence.

`pnpm build` validates and produces a static deployment in `dist/`.

## Features

Inbox categories, Starred, Sent, Drafts, Trash, Snoozed, All mail, custom labels, bulk actions, undo, search operators, conversations, replies, forwarding, autosaved composition, recipient suggestions, local storage persistence, mobile navigation, density settings, notes, tasks, contacts, and keyboard shortcuts.

Shortcuts: C to compose, / to search, Escape to close. Search supports from:, label:, is:unread, is:read, is:starred, and has:attachment.

Mail is a local simulation: Send places messages in Sent. Seeded attachments download text previews. Calendar entries are demonstration events. No messages leave the browser. Local data remains on the device until browser storage is cleared.

## Verification environment

Static and simulated interaction tests pass. Browser verification was attempted on port 9182, but this execution environment denied listening on the port (EPERM) and denied the browser CLI. Portly could not launch because its application executable was unavailable.
