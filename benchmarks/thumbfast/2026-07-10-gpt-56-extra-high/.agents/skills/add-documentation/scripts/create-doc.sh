#!/bin/bash

# Create a new documentation file from template
# Usage: ./create-doc.sh <filename> "<title>" "<description>"
# Example: ./create-doc.sh my-feature "My Feature" "Description of my feature"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="$SCRIPT_DIR/../templates/doc-template.mdx"
DOCS_DIR="$(cd "$SCRIPT_DIR/../../../../content/docs" && pwd)"

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <filename> [title] [description]"
    echo "Example: $0 my-feature \"My Feature\" \"Description of my feature\""
    exit 1
fi

FILENAME="$1"
TITLE="${2:-$FILENAME}"
DESCRIPTION="${3:-TODO: Add description}"

# Remove .mdx extension if provided
FILENAME="${FILENAME%.mdx}"

OUTPUT_PATH="$DOCS_DIR/$FILENAME.mdx"

# Check if file already exists
if [ -f "$OUTPUT_PATH" ]; then
    echo "Error: File already exists: $OUTPUT_PATH"
    exit 1
fi

# Convert filename to component name (kebab-case to PascalCase)
COMPONENT=$(echo "$FILENAME" | awk -F'-' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)} 1' OFS='')

# Create feature path from filename
FEATURE_PATH=$(echo "$FILENAME" | tr '-' '/')

# Copy template and replace placeholders (using | as delimiter to avoid issues with /)
sed -e "s|{{TITLE}}|$TITLE|g" \
    -e "s|{{DESCRIPTION}}|$DESCRIPTION|g" \
    -e "s|{{COMPONENT}}|$COMPONENT|g" \
    -e "s|{{FEATURE_PATH}}|$FEATURE_PATH|g" \
    -e "s|{{KEYWORD1}}|${FILENAME%-*}|g" \
    -e "s|{{KEYWORD2}}|$FILENAME|g" \
    "$TEMPLATE_PATH" > "$OUTPUT_PATH"

echo "Created: $OUTPUT_PATH"
echo ""
echo "Next steps:"
echo "1. Edit the file to customize content"
echo "2. Update the frontmatter (order, subcategory, tags)"
echo "3. Add proper code examples"
echo "4. Run 'pnpm dev' and check /docs/$FILENAME"
