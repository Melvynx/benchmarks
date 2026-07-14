#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for transcript in "$dir"/transcript*.jsonl; do jq . "$transcript"; done
