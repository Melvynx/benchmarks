#!/bin/sh
set -eu

if command -v node >/dev/null 2>&1; then
  exec node "$@"
fi

managed_node="/Users/melvynx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ -x "$managed_node" ]; then
  exec "$managed_node" "$@"
fi

echo "node is required to run this check" >&2
exit 127
