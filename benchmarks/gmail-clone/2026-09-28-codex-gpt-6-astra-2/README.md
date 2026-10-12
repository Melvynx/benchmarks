# GPT-6

A complete local email workspace built with React, TypeScript, and Vite. The development and preview servers both use **port 9176**.

## Run

```sh
pnpm install
pnpm dev
```

Open `http://localhost:9176`.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

## The mailbox

- 30 detailed seeded conversations, including multi-message threads and sample attachments.
- Inbox categories, Starred, Snoozed, Sent, Drafts, Trash, All mail, and custom labels.
- Individual and bulk selection, read/unread, starring, archiving, deleting, restoration, labeling, and undo.
- Live full-mailbox search with `from:`, `to:`, `subject:`, `label:`, `is:unread`, `is:read`, `is:starred`, `has:attachment`, `before:`, `after:`, and `in:trash` / `in:anywhere`.
- A conversation reader with expandable history, recipient details, replies, forwarding, file downloads, and printing.
- A floating composer with address suggestions, Cc/Bcc, rich formatting, attachments, automatic drafts, minimize/maximize, and local sending.
- Light/dark appearance, two inbox densities, optional signatures, keyboard shortcuts, and mailbox export.
- Calendar, persistent tasks, personal notes, and contacts in the side panel.
- Responsive desktop, tablet, and mobile layouts, accessible labels, keyboard navigation, and reduced-motion support.

Everything is saved in this browser's local storage under `gpt6-mailbox-v1`. No account, authentication, backend, or API key is required. Sending adds the message to the local Sent mailbox; it does not deliver external email. Snoozed messages return while the app is open or when it is reopened. Real uploaded files can be downloaded from sent messages; seeded attachments are explicitly marked as samples and download their descriptions.

Use **Settings → Export mailbox backup** to download the full mailbox. The storage indicator reports when browser storage is unavailable or full. A fresh browser profile starts with the original seeded mailbox.

## Shortcuts

`C` compose · `/` search · `E` archive · `#` trash · `S` star · `U` unread · `R` reply · `J`/`K` next/previous conversation · `Esc` back · `⌘ Enter` / `Ctrl Enter` send · `?` help.

## Project structure

`src/data.ts` contains the fictional mailbox and contacts. `src/mail.ts` handles mailbox filtering, search, persistence loading, and downloads. `src/operations.ts` implements the tested state transitions for organizing, labeling, sending, and snoozing. `src/App.tsx` coordinates the interface. `src/components/` contains the composer, conversation reader, dialogs, and productivity panels. `src/styles.css` and `src/responsive.css` define the interface.

`pnpm test` uses Node's test runner and TypeScript to verify the actual mailbox operations, including local sending with attachments, threaded replies, search operators, bulk labeling, snooze recovery, and persistence. It requires no browser or test framework.

For browser verification, start the app on port 9176 and run `dev-browser --headless --browser gpt6-mail run tests/browser-check.js`. The script covers desktop search and reading, archiving and undo, trash restoration, draft reopening, sending and persistence, themes, and mobile reading/composing. It restores the browser's existing mailbox afterward.

Current environment verification: all 13 core tests passed, core TypeScript checks passed, and the complete UI/CSS passed esbuild syntax bundling with external dependencies excluded. Full type checking and the production build are blocked by dependency downloads failing with `ENOTFOUND`. Browser verification is blocked by `Operation not permitted`; Portly also cannot launch here. These checks have not been represented as successful browser verification.
