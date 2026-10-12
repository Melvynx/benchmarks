#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
jq . "$dir/transcript.jsonl" "$dir/transcript-resume-1.jsonl"
