# Start Commands

There is **one canonical command** to run the app locally: `pnpm start-all`. Everything else is a partial/secondary command.

## `pnpm start-all` (recommended, one terminal for everything)

```bash
pnpm start-all              # default port 3000
pnpm start-all -p 3050      # custom port
```

Script: `scripts/start-all.sh`. It:

- Sets `SITE_URL=http://localhost:<port>` in the active Convex deployment (so OAuth redirects, magic links, etc. point to the right place)
- Boots `pnpm exec convex dev` (codegen + push to dev deployment) **and** `pnpm dev` (Vite + TanStack Start) **in parallel, in the same terminal**, prefixed with `[convex]` (cyan) and `[web]` (magenta)
- Truncates `.logs/web.txt` and `.logs/convex.txt` at startup, then streams plain (ANSI-stripped) output to those files for AI agents to tail
- Forwards `Ctrl+C` to both child process groups

Use this for normal day-to-day development.

## Other (partial) commands

| Command                 | What it runs                               | When to use                                                                                                                |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`              | Vite + TanStack Start only                 | Convex already running in another terminal, or testing pure frontend                                                       |
| `pnpm convex:dev`       | `pnpm exec convex dev` only                | Just want backend codegen / schema sync, no web server                                                                     |
| `pnpm start:dev [port]` | `dev.sh` - sets `SITE_URL` then `pnpm dev` | Vite-only with the right Convex `SITE_URL`. Does **not** run convex itself                                                 |
| `pnpm email`            | React Email preview                        | Iterating on email templates                                                                                               |
| `pnpm stripe-webhooks`  | Stripe webhook reminder                    | Prints the Convex webhook target. Stripe webhooks now go to Convex `POST /stripe/webhook` |

## Important behaviors

- **Only `pnpm start-all` writes to `.logs/`.** `pnpm dev`, `pnpm start:dev`, `pnpm convex:dev` do NOT write to the log files.
- **Logs are truncated on each `pnpm start-all` run** (never appended across runs). If `.logs/web.txt` or `.logs/convex.txt` is empty, the dev server is not running.
- The `start-all` script kills both child process groups on exit. Don't worry about orphan convex/vite processes after `Ctrl+C`.

## Adding a new long-running dev process

If you add another long-running dev process (e.g. background worker), wire it into `scripts/start-all.sh` with the same pattern (one `perl -ne` per child: writes ANSI-stripped lines to the log file, prints the original colored line with a `[name]` prefix to the terminal, both autoflushed):

```bash
(
  LOG="$NEW_LOG" PREFIX=$'\033[33m[name]\033[0m' \
    your-command 2>&1 \
    | perl -ne '
        BEGIN {
          $| = 1;
          open(LOG, ">>", $ENV{LOG}) or die "open $ENV{LOG}: $!";
          select((select(LOG), $| = 1)[0]);
        }
        my $c = $_;
        $c =~ s/\033\[[0-9;?]*[a-zA-Z]//g;
        $c =~ s/\r/\n/g;
        print LOG $c;
        print "$ENV{PREFIX} $_";
      '
) &
pids+=("$!")
```

Why perl and not `tee >(awk ...)`: `tee` block-buffers the process-substitution branch (the file branch lags behind the terminal) and macOS's BSD awk corrupts `-v` values that start with `/` (treats them as regex literals), which silently breaks variable-based log paths. Don't add separate `pnpm` scripts that bypass the unified terminal - keep everything under `start-all`.
