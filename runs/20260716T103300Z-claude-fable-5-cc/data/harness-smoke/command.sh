#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-fable-5 --effort xhigh --permission-mode bypassPermissions --output-format stream-json --verbose --session-id e87973bc-470a-43ae-8168-78bb05f06957 Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
