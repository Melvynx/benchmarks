#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-sonnet-5 --effort xhigh --permission-mode bypassPermissions --output-format stream-json --verbose --session-id e6aeb5ef-2be5-4ef5-887a-8ee6576ac79b Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
