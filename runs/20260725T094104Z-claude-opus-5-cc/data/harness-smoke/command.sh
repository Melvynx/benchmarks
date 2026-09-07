#!/usr/bin/env zsh
source "$HOME/.zshrc" >/dev/null 2>&1
unalias cc 2>/dev/null || true
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model claude-opus-5 --effort high --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 40c3aa05-fbf3-4006-b1f1-c279b6240b06 Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
