---
paths:
  - "content/**/*.mdx"
  - "content/**/*.md"
---

# MDX Content Guidelines

## Title Handling - CRITICAL

**NEVER add H1 headings (`# Title`) in MDX content when frontmatter contains a title.**

The page template automatically renders the title from frontmatter. Adding an H1 in content creates duplicate titles.

### Correct Pattern

```mdx
---
title: My Page Title
description: Page description here
---

Content starts here with H2 or below...

## First Section
```

### Incorrect Pattern (NEVER DO THIS)

```mdx
---
title: My Page Title
description: Page description here
---

# My Page Title ← DUPLICATE - Remove this!

## First Section
```

## Heading Hierarchy

- Frontmatter `title` = H1 (rendered by template)
- Content should start with H2 (`##`) for first section
- Use proper hierarchy: H2 → H3 → H4

## Files Affected

- `content/docs/**/*.mdx` - Documentation pages
- `content/posts/**/*.mdx` - Blog posts

## Why This Matters

1. Creates duplicate titles on the page
2. Breaks accessibility (multiple H1s)
3. Hurts SEO
4. Inconsistent visual hierarchy
