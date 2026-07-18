#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-fable-5 --effort xhigh --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 159ec1b6-7eda-411a-a161-a2a2d18f6e84 Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
