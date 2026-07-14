# Read Logs

When the user reports a bug, error, or unexpected behavior while the dev server is running, **read the logs before guessing**. They are the ground truth for what the running processes actually emitted.

## Where to look

| File               | Source                             | What's in it                                                          |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------- |
| `.logs/web.txt`    | `pnpm dev` (Vite + TanStack Start) | HMR updates, SSR errors, route warnings, client/server build errors   |
| `.logs/convex.txt` | `pnpm exec convex dev`             | Function logs, schema validation, mutation/query errors, deploy state |

Both files are written by `scripts/start-all.sh`. If they don't exist or are empty, the dev server is **not** running - start it with `pnpm start-all`.

## Format

- Plain text, **ANSI escape codes already stripped** by the start script. No `^[[32m` garbage.
- `\r` carriage returns are converted to `\n` so progress / spinner frames each get their own line.
- Files are **truncated on every `pnpm start-all` run**. The bottom of the file is the latest state.

## How to read them

Always read the **tail** first - the file is reset on every restart, so the most recent activity is at the bottom.

```bash
# Quick look at recent activity (preferred default)
tail -n 80 .logs/web.txt
tail -n 80 .logs/convex.txt

# Both at once
tail -n 80 .logs/web.txt .logs/convex.txt

# Live follow (only when explicitly debugging in real time)
tail -f .logs/web.txt
```

For agents using the `Read` tool: read with a large `offset` (or read the whole file when small) and focus on the bottom.

## Decision flow

1. User reports an error or unexpected behavior
2. Tail both `.logs/web.txt` and `.logs/convex.txt` (last 80-150 lines)
3. Match the error message / stack trace to the code path
4. Only after reading the logs, propose a fix. Don't guess from the symptom alone.

## Common patterns

- **"It's not loading"** -> check `.logs/web.txt` for vite/SSR errors and `.logs/convex.txt` for schema validation errors that block deploys
- **"My mutation fails"** -> check `.logs/convex.txt` for `ArgumentValidationError`, missing fields, or auth errors
- **"HMR is stuck / blank page"** -> check `.logs/web.txt` for syntax errors or unresolved imports
- **"Auth redirect goes to wrong port"** -> verify `start-all` set `SITE_URL` correctly (top of `.logs/convex.txt`)

## What NOT to do

- **Don't run `pnpm dev` or `pnpm exec convex dev` directly when debugging a user's reported issue** - those don't write to `.logs/`, so you'll have no record of what happened.
- **Don't tail the file head**. The truncate-on-start design means the head is stale-as-of-startup; the tail is current.
- **Don't grep for ANSI codes** (`\x1b`, `^[[`). The strip step removes them - if you see them, the script is misbehaving and should be fixed.
