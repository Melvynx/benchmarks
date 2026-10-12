#!/usr/bin/env bash
cd "$(dirname "$0")"
# Serves ./public on port 9876 with CORS
# Access-Control-Allow-Origin: *
exec node http-server.mjs
