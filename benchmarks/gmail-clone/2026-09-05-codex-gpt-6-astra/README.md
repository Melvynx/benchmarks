# GPT-6 Astra

A complete, local Gmail-inspired mail client. No account, API key, backend, or installation is needed.

## Run

`pnpm dev` starts the application at http://localhost:9161. `pnpm build` checks JavaScript syntax. `pnpm test` runs the mailbox model tests.

Mail, drafts, read states, stars, labels, density preferences and tasks persist in localStorage. Search supports words, quoted phrases, `from:`, `label:`, `in:`, `is:unread`, `is:starred`, and `has:attachment`.

Sending is simulated locally and adds mail to Sent. Seed attachments download explicitly identified text samples; user attachments retain filenames only. No real email or file contents are transmitted. Snoozed mail returns on the next application load after its due date. Keyboard shortcuts are available in Help.
