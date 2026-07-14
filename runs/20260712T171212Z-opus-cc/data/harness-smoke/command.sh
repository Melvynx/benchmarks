#!/usr/bin/env zsh
cc() { claude --dangerously-skip-permissions "$@"; }
cc -p --model opus --effort medium --permission-mode bypassPermissions --output-format stream-json --verbose --session-id 64d3df13-a3f8-483b-a1cb-a68bd450e57d Reply\ with\ exactly\ HARNESS_OK\ and\ nothing\ else. 
