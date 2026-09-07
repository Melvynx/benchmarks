#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-opus-5 --effort max --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 54115126-a8b0-4e7b-bf1e-73e45d38256d Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
