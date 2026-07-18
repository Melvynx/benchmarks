#!/bin/bash
set -e

echo "Setting up development environment..."

# Install dependencies
if [ -f "package.json" ]; then
    pnpm install
fi

# Start development server in background
if [ -f "package.json" ]; then
    echo "Starting development server..."
    pnpm dev &
    DEV_PID=$!
    echo "Dev server started with PID: $DEV_PID"
    echo "Access the app at http://localhost:9150"
fi

echo "Setup complete!"
