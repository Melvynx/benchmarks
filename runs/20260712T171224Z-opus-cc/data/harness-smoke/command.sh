#!/usr/bin/env zsh
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model opus --effort medium --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 321c91d0-767d-4dc1-9b89-1096e7f58daa Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
