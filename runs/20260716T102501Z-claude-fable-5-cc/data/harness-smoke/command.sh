#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-fable-5 --effort xhigh --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 994d07d7-0da8-46e9-a89e-c7431a9062f6 Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
