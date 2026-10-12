# GPT-6

A calm, Gmail-inspired local email client. No dependencies, accounts, API keys, or external services are required.

## Run

Use `pnpm dev`, then open `http://localhost:9196`.

`pnpm build` checks application syntax. `pnpm test` validates mailbox and search behavior. `pnpm test:runtime` briefly opens port 9196, verifies the HTTP shell and assets, and closes the server.

## Explore

- Inbox, Starred, Snoozed, Sent, Drafts, Trash, All mail, and custom labels
- Conversation reading, attachments, replies, and forwarding
- Individual and bulk selection, archive, trash, read state, labeling, and undo
- Search by text, `from:`, `label:`, `is:unread`, `is:starred`, and `has:attachment`
- Autosaved drafts, contact suggestions, Cc, file names, and local sending
- Display preferences, contacts, notes, tasks, and keyboard shortcuts (`?`)
- Responsive mobile navigation and full-screen composition

Mailbox changes, drafts, and preferences persist in localStorage. Sending adds a message to Sent; it does not send external email. Seeded attachments download a clearly identified text preview. The calendar displays the seeded mailbox's day. Snoozed mail can be restored using the clock action.

## Verification

Syntax checks and four mailbox logic tests pass. The managed runtime could not start because Portly.app is unavailable. The dev-browser CLI also returned `Operation not permitted`, so browser workflow and visual verification could not be completed in this sandbox. A bounded HTTP runtime check also failed to bind port 9196 with `listen EPERM`, confirming the sandbox network restriction.
