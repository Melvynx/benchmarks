#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-sonnet-5 --effort xhigh --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 20394f56-3cad-413c-a8d1-8be6c70edcc3 Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
