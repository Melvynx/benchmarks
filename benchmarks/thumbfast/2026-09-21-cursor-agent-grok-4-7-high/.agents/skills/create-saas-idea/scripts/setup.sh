#!/bin/bash
# SaaS Setup Script - Creates output folder structure
# Usage: ./setup.sh [project-name]

set -e

PROJECT_NAME="${1:-01-to-be-defined}"
TIMESTAMP=$(date +%Y-%m-%d)
OUTPUT_DIR="$HOME/.claude/output/saas/$PROJECT_NAME"

echo "🚀 Setting up SaaS project: $PROJECT_NAME"

mkdir -p "$OUTPUT_DIR/tasks"

cat > "$OUTPUT_DIR/idea.md" << EOF
---
project_id: $PROJECT_NAME
created: $TIMESTAMP
status: discovery
---

# SaaS Idea

*To be defined during discovery.*
EOF

cat > "$OUTPUT_DIR/discovery.md" << EOF
---
project_id: $PROJECT_NAME
created: $TIMESTAMP
---

# Discovery Notes

## User Context
*Who is the user? What's their background?*

## Discovery Answers

### Manual Tasks
*Tasks they do manually that could be automated*

### Work/School Pain Points
*Problems they've seen in professional/educational settings*

### Paid Tools
*Tools they pay for that could be simplified*

### Community Problems
*Issues in communities they're part of*

### Spreadsheet Systems
*Complex spreadsheets/Notion that could become apps*

## Key Insights
*Patterns and insights from the discovery conversation*

## Selected Direction
*Which problem/idea was chosen and why*
EOF

cat > "$OUTPUT_DIR/prd.md" << EOF
---
project_id: $PROJECT_NAME
created: $TIMESTAMP
status: pending
---

# Product Requirements Document

*To be created after idea validation.*
EOF

cat > "$OUTPUT_DIR/archi.md" << EOF
---
project_id: $PROJECT_NAME
created: $TIMESTAMP
status: pending
---

# Technical Architecture

*To be created after PRD.*
EOF

cat > "$OUTPUT_DIR/marketing.md" << EOF
---
project_id: $PROJECT_NAME
created: $TIMESTAMP
status: pending
---

# Marketing Strategy

*To be defined during validation.*
EOF

cat > "$OUTPUT_DIR/tasks/README.md" << EOF
# Tasks

*To be created after architecture.*
EOF

echo "✅ Created: $OUTPUT_DIR"
