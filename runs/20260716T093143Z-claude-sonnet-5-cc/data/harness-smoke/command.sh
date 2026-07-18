#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-sonnet-5 --effort xhigh --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 09465197-846a-4024-82b2-ad591d8added Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
