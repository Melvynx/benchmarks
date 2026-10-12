# GPT-6

A local, Gmail-inspired email client. Mail, drafts, labels, display settings, and sent messages are saved in browser storage. No account or API key is needed.

## Run

```sh
pnpm install --offline
pnpm dev
```

Open `http://localhost:9173`.

## Checks

```sh
pnpm build
pnpm test
```

Search supports keywords and operators such as `from:olivia`, `subject:brand`, `label:Work`, `is:unread`, `is:starred`, `has:attachment`, and `in:archive`. Press `/` to search, `c` to compose, and Command or Control + Enter to send.
