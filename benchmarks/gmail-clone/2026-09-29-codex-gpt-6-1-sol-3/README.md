# GPT-6

A complete, dependency-free local mail application. Run with Node 22 or later.

- `pnpm dev` — serves the app at http://localhost:9187
- `pnpm check` — syntax, seed integrity, and application workflow checks
- `pnpm check:http` — bounded HTTP runtime verification on port 9187
- `pnpm build` — verifies and creates the deployable static `dist/` directory
- `pnpm preview` — serves the production build on port 9187

No install, account, authentication, or API key is needed. Mail, drafts, labels, preferences, notes, and tasks persist in this browser’s local storage. Sending places a message in Sent and updates the original conversation when replying; it does not deliver external email. Added attachments are stored locally (up to 3 MB each). Seeded attachments download as generated PDFs, CSVs, and JPEGs.

Inbox categories, Starred, Snoozed, Sent, Drafts, All mail, Trash, custom labels, bulk selection, read/unread, archiving, deletion/restoration, undo, advanced search, conversations, recipient suggestions, Cc/Bcc, attachments, theme/density settings, calendar, notes, tasks, contacts, and keyboard shortcuts are included.

Search supports words, quoted phrases, `from:`, `label:`, `in:`, `is:unread`, `is:read`, `is:starred`, and `has:attachment`. Press `?` for shortcuts, `/` to search, or `C` to compose.

Workflow checks exercise the application’s actual state and action handlers in a DOM stub. They are not browser layout tests.
