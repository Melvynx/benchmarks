#!/bin/bash
# Rename SaaS project folder and update all project_id references
# Usage: ./rename-project.sh <old-name> <new-name>

set -e

OLD_NAME="$1"
NEW_NAME="$2"
BASE_DIR="$HOME/.claude/output/saas"

if [ -z "$OLD_NAME" ] || [ -z "$NEW_NAME" ]; then
  echo "Usage: ./rename-project.sh <old-name> <new-name>"
  exit 1
fi

OLD_DIR="$BASE_DIR/$OLD_NAME"
NEW_DIR="$BASE_DIR/$NEW_NAME"

if [ ! -d "$OLD_DIR" ]; then
  echo "❌ Project not found: $OLD_DIR"
  exit 1
fi

if [ -d "$NEW_DIR" ]; then
  echo "❌ Target already exists: $NEW_DIR"
  exit 1
fi

echo "🔄 Renaming project: $OLD_NAME → $NEW_NAME"

# Update project_id in all markdown files
for file in "$OLD_DIR"/*.md "$OLD_DIR"/tasks/*.md; do
  if [ -f "$file" ] && grep -q "project_id:" "$file"; then
    sed -i '' "s/project_id: $OLD_NAME/project_id: $NEW_NAME/g" "$file"
    echo "  ✓ Updated: $(basename "$file")"
  fi
done

# Rename folder
mv "$OLD_DIR" "$NEW_DIR"

echo "✅ Done: $NEW_DIR"
