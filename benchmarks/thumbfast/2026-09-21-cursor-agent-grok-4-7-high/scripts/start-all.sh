#!/usr/bin/env bash
set -uo pipefail

port=9342
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "Error: -p/--port requires a value" >&2
        exit 1
      fi
      port="$2"
      shift 2
      ;;
    --)
      shift
      ;;
    *)
      echo "Warning: ignoring unknown arg: $1" >&2
      shift
      ;;
  esac
done

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

log_dir="$root/.logs"
web_log="$log_dir/web.txt"
convex_log="$log_dir/convex.txt"

mkdir -p "$log_dir"
: > "$web_log"
: > "$convex_log"

printf '[start-all] port=%s\n' "$port"
printf '[start-all] web log -> %s\n' "$web_log"
printf '[start-all] convex log -> %s\n' "$convex_log"

printf '[start-all] setting Convex SITE_URL=http://localhost:%s\n' "$port"
if ! scripts/convex-sync-env.sh "http://localhost:$port"; then
  echo "[start-all] WARN: failed to sync Convex env (continuing)" >&2
fi

pids=()

cleanup() {
  trap '' INT TERM EXIT
  set +m 2>/dev/null || true
  echo
  echo "[start-all] stopping child processes..."
  for pid in "${pids[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  sleep 0.3
  for pid in "${pids[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  wait "${pids[@]:-}" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

set -m

(
  export LOG="$convex_log"
  export PREFIX=$'\033[36m[convex]\033[0m'
  pnpm exec convex dev 2>&1 \
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

(
  export LOG="$web_log"
  export PREFIX=$'\033[35m[web]\033[0m'
  export PORT="$port"
  export SITE_URL="http://localhost:$port"
  export VITE_APP_URL="http://localhost:$port"
  pnpm dev 2>&1 \
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

wait
